import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, UserCog, Mail, Lock, User, Trash2, Copy, CheckCircle2, Link2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Technician {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

export default function TechniciansPage() {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

    useEffect(() => {
        loadTechnicians();
    }, []);

    const loadTechnicians = async () => {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) return;

        const { data: profile } = await supabase.from('users').select('org_id').eq('id', currentUser.user.id).maybeSingle();
        if (!profile?.org_id) return;

        const { data, error } = await supabase
            .from('users')
            .select('id, name, role, created_at')
            .eq('org_id', profile.org_id)
            .eq('role', 'technician')
            .order('name');

        if (error) { console.error(error); return; }

        // Get emails from auth (we can only see emails through our own org's users)
        const techList = (data || []).map(d => ({
            id: d.id,
            name: d.name,
            email: '', // Will be filled if available
            role: d.role,
            createdAt: d.created_at,
        }));

        setTechnicians(techList);
    };

    const handleCreate = async () => {
        if (!form.name || !form.email || !form.password) {
            toast.error('Preencha todos os campos');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            // Get current user's org_id and save current session
            const { data: { session: adminSession } } = await supabase.auth.getSession();
            if (!adminSession) throw new Error('Não autenticado');

            const { data: profile } = await supabase.from('users').select('org_id').eq('id', adminSession.user.id).maybeSingle();
            if (!profile?.org_id) throw new Error('Organização não encontrada');

            // Use standard signUp to create the technician (Supabase handles password correctly)
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: { full_name: form.name }
                }
            });

            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error('Erro ao criar usuário');

            const techUserId = signUpData.user.id;

            // Restore admin session immediately
            await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token
            });

            // Use SECURITY DEFINER RPC to: confirm email + set org + set role
            const { error: setupError } = await supabase.rpc('setup_technician', {
                tech_user_id: techUserId,
                org_id_param: profile.org_id,
                tech_name: form.name
            });

            if (setupError) {
                console.error('Setup technician error:', setupError);
                throw new Error('Técnico criado mas houve erro ao configurar. Verifique o banco.');
            }

            setCreatedCredentials({ email: form.email, password: form.password });
            toast.success('Técnico criado com sucesso!');
            loadTechnicians();
        } catch (error: any) {
            toast.error('Erro ao criar técnico: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este técnico?')) return;
        // Use RPC to delete from both auth.users and public.users
        const { error } = await supabase.rpc('delete_technician', { tech_user_id: id });
        if (error) {
            toast.error('Erro ao remover: ' + error.message);
            return;
        }
        setTechnicians(prev => prev.filter(t => t.id !== id));
        toast.success('Técnico removido');
    };

    const copyCredentials = () => {
        if (!createdCredentials) return;
        navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nSenha: ${createdCredentials.password}`);
        toast.success('Credenciais copiadas!');
    };

    const portalUrl = `${window.location.origin}/tecnico`;

    const copyPortalLink = () => {
        navigator.clipboard.writeText(portalUrl);
        toast.success('Link do portal copiado!');
    };

    const filtered = technicians.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <div className="page-header__left">
                    <h1>Técnicos</h1>
                    <p>Gerencie os técnicos da sua equipe</p>
                </div>
                <button className="btn btn-primary" onClick={() => {
                    setForm({ name: '', email: '', password: '' });
                    setCreatedCredentials(null);
                    setShowModal(true);
                }}>
                    <Plus size={18} /> Novo Técnico
                </button>
            </div>
            {/* Portal Link Banner */}
            <div className="glass-card" style={{
                padding: 'var(--space-4)', marginBottom: 'var(--space-4)',
                display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(34, 211, 238, 0.06) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.15)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Link2 size={18} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
                    <div>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Portal dos Técnicos</span>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                            Envie este link para seus técnicos acessarem o portal
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <code style={{
                        fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)',
                        background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)',
                        color: 'var(--color-cyan)', fontFamily: 'monospace',
                        wordBreak: 'break-all', flex: '1 1 0', minWidth: 0
                    }}>
                        {portalUrl}
                    </code>
                    <button className="btn btn-primary" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)', flexShrink: 0 }} onClick={copyPortalLink}>
                        <Copy size={14} /> Copiar
                    </button>
                </div>
            </div>

            <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input className="form-input" placeholder="Buscar técnicos..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 'calc(var(--space-4) + 18px + var(--space-3))', width: '100%' }} />
                </div>

                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-tertiary)' }}>
                        <UserCog size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.3 }} />
                        <p>Nenhum técnico cadastrado</p>
                        <p style={{ fontSize: 'var(--text-sm)' }}>Crie um técnico para começar a atribuir ordens de serviço</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {filtered.map((tech, i) => (
                            <motion.div key={tech.id} className="glass-card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: 'var(--radius-lg)', flexShrink: 0,
                                        background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-accent-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-sm)'
                                    }}>
                                        {tech.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tech.name}</span>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                                            Técnico • {new Date(tech.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(tech.id)} style={{ color: 'var(--color-rose)', flexShrink: 0 }}>
                                    <Trash2 size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Technician Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header">
                                <h2>{createdCredentials ? 'Técnico Criado!' : 'Novo Técnico'}</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>
                            <div className="modal__form">
                                {createdCredentials ? (
                                    <div>
                                        <div style={{
                                            background: 'rgba(34, 211, 153, 0.1)', border: '1px solid rgba(34, 211, 153, 0.3)',
                                            borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)',
                                            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)'
                                        }}>
                                            <CheckCircle2 size={20} style={{ color: 'var(--color-emerald)', flexShrink: 0, marginTop: 2 }} />
                                            <div style={{ fontSize: 'var(--text-sm)' }}>
                                                <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-emerald)' }}>Técnico criado com sucesso!</p>
                                                <p style={{ margin: 'var(--space-2) 0 0 0', color: 'var(--color-text-secondary)' }}>
                                                    Envie as credenciais abaixo para o técnico acessar o portal em <strong>/tecnico</strong>
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-lg)',
                                            padding: 'var(--space-4)', fontFamily: 'monospace', fontSize: 'var(--text-sm)',
                                            lineHeight: 2
                                        }}>
                                            <div>Email: <strong>{createdCredentials.email}</strong></div>
                                            <div>Senha: <strong>{createdCredentials.password}</strong></div>
                                        </div>

                                        <div className="modal__actions" style={{ marginTop: 'var(--space-4)' }}>
                                            <button className="btn btn-secondary" onClick={copyCredentials}>
                                                <Copy size={16} /> Copiar Credenciais
                                            </button>
                                            <button className="btn btn-primary" onClick={() => setShowModal(false)}>Fechar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Nome do Técnico</label>
                                            <div style={{ position: 'relative' }}>
                                                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                                <input className="form-input" placeholder="Ex: João Silva" value={form.name}
                                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ paddingLeft: 36 }} />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Email</label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                                <input className="form-input" type="email" placeholder="tecnico@email.com" value={form.email}
                                                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ paddingLeft: 36 }} />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Senha inicial</label>
                                            <div style={{ position: 'relative' }}>
                                                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                                <input className="form-input" type="text" placeholder="Mínimo 6 caracteres" value={form.password}
                                                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={{ paddingLeft: 36 }} />
                                            </div>
                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                                                O técnico poderá alterar depois
                                            </p>
                                        </div>
                                        <div className="modal__actions">
                                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                                                {loading ? 'Criando...' : 'Criar Técnico'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
