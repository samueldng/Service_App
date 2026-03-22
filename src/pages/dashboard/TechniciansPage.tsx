import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, UserCog, Mail, Lock, User, Trash2, Copy, CheckCircle2, Link2, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { organizationsApi } from '../../services/api';
import type { Organization } from '../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

function getToken(): string | null {
    return localStorage.getItem('maintqr_token');
}

async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erro de conexão' }));
        throw new Error(body.error || `Erro ${res.status}`);
    }
    return res.json();
}

interface Technician {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

export default function TechniciansPage() {
    const navigate = useNavigate();
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);

    const isPro = organization ? ['professional', 'pro', 'enterprise'].includes(organization.subscriptionPlan) : true;

    useEffect(() => {
        loadTechnicians();
        organizationsApi.get().then(data => { if (data) setOrganization(data); }).catch(() => { });
    }, []);

    const loadTechnicians = async () => {
        try {
            const users = await apiFetch<any[]>('/users');
            const techs = (users || [])
                .filter((u: any) => u.role === 'technician')
                .map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    email: d.email || '',
                    role: d.role,
                    createdAt: d.created_at,
                }));
            setTechnicians(techs);
        } catch (err) {
            console.error('Failed to load technicians:', err);
        }
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
            await apiFetch('/users/technician', {
                method: 'POST',
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                }),
            });

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
        try {
            await apiFetch(`/users/${id}`, { method: 'DELETE' });
            setTechnicians(prev => prev.filter(t => t.id !== id));
            toast.success('Técnico removido');
        } catch (error: any) {
            toast.error('Erro ao remover: ' + error.message);
        }
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
                {isPro ? (
                    <button className="btn btn-primary" onClick={() => {
                        setForm({ name: '', email: '', password: '' });
                        setCreatedCredentials(null);
                        setShowModal(true);
                    }}>
                        <Plus size={18} /> Novo Técnico
                    </button>
                ) : null}
            </div>

            {/* PRO Plan Gate Banner */}
            {!isPro && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card"
                    style={{
                        padding: 'var(--space-5)', marginBottom: 'var(--space-4)',
                        background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)',
                        border: '1px solid rgba(167, 139, 250, 0.25)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(167, 139, 250, 0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Lock size={20} style={{ color: '#a78bfa' }} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 600, color: '#ddd6fe', margin: 0 }}>
                                Recurso exclusivo do Plano Professional
                            </p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(221, 214, 254, 0.7)', margin: 0 }}>
                                Faça upgrade para gerenciar técnicos e atribuir ordens de serviço
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/settings')}>
                        <ArrowUpCircle size={16} /> Fazer Upgrade
                    </button>
                </motion.div>
            )}
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
                                <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(tech.id)} style={{ color: 'var(--color-rose)', flexShrink: 0, display: isPro ? 'flex' : 'none' }}>
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
