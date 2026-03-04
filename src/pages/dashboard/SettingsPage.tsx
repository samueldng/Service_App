import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, CreditCard, Save, CheckCircle2, AlertTriangle, Building, Camera } from 'lucide-react';
import { organizationsApi } from '../../services/api';
import type { Organization } from '../../types';

export default function SettingsPage() {
    const [org, setOrg] = useState<Organization | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        organizationsApi.get()
            .then(data => { if (data) setOrg(data); })
            .catch(err => console.error('Failed to load organization:', err));
    }, []);

    const handleSave = async () => {
        if (!org) return;
        setSaving(true);
        try {
            const updated = await organizationsApi.update(org.id, org);
            setOrg(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

            // Apply theme dynamically for preview
            if (updated?.brandColor) {
                document.documentElement.style.setProperty('--color-primary', updated.brandColor);
                document.documentElement.style.setProperty('--color-accent-primary', updated.brandColor);
            }
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!org) return null;

    const planFeatures = {
        free: { name: 'Free', price: 'R$ 0/mês', limit: 50 },
        pro: { name: 'Pro', price: 'R$ 149/mês', limit: 500 },
        enterprise: { name: 'Enterprise', price: 'Sob consulta', limit: 'Ilimitado' }
    };

    const currentPlan = planFeatures[org.subscriptionPlan];

    return (
        <div style={{ paddingBottom: 'var(--space-8)' }}>
            <div className="page-header">
                <div className="page-header__left">
                    <h1>Configurações da Empresa</h1>
                    <p>Personalize sua marca e gerencie sua assinatura</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : saved ? <><CheckCircle2 size={18} /> Salvo</> : <><Save size={18} /> Salvar Alterações</>}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                {/* White-label Settings */}
                <motion.div className="glass-card" style={{ padding: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Palette size={20} />
                        </div>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>Identidade Visual (White-label)</h2>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nome da Empresa</label>
                        <input className="form-input" value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} />
                    </div>

                    <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                        <label className="form-label">Logotipo do Portal do Cliente</label>
                        <div style={{
                            border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', background: 'rgba(0,0,0,0.2)'
                        }}>
                            {org.logoUrl ? (
                                <img src={org.logoUrl} alt="Logo" style={{ maxHeight: 60, objectFit: 'contain' }} />
                            ) : (
                                <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building size={24} style={{ color: 'var(--color-text-tertiary)' }} />
                                </div>
                            )}
                            <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-2)' }}>
                                <Camera size={14} /> Fazer Upload
                            </button>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                        <label className="form-label">Cor Principal da Marca (Hex)</label>
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <input
                                type="color"
                                value={org.brandColor || '#6366f1'}
                                onChange={e => setOrg({ ...org, brandColor: e.target.value })}
                                style={{ width: 48, height: 48, padding: 0, border: 'none', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer' }}
                            />
                            <input
                                className="form-input"
                                value={org.brandColor || '#6366f1'}
                                onChange={e => setOrg({ ...org, brandColor: e.target.value })}
                                style={{ flex: 1, fontFamily: 'monospace' }}
                            />
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                            Essa cor será usada no Portal do Cliente e QR Codes para refletir sua marca.
                        </p>
                    </div>
                </motion.div>

                {/* Billing Setup */}
                <motion.div className="glass-card" style={{ padding: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'rgba(34, 211, 238, 0.12)', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={20} />
                        </div>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>Assinatura & Cobrança</h2>
                    </div>

                    <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, transparent 100%)', marginBottom: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                            <div>
                                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>Plano {currentPlan.name}</h3>
                                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', margin: 'var(--space-1) 0 0 0' }}>{currentPlan.price}</p>
                            </div>
                            <span className={`badge ${org.paymentStatus === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                {org.paymentStatus === 'active' ? 'Ativo' : 'Pagamento Pendente'}
                            </span>
                        </div>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Equipamentos Cadastrados</span>
                                <span style={{ fontWeight: 600 }}>120 / {currentPlan.limit}</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: '24%', height: '100%', background: 'var(--color-primary)', borderRadius: 3 }}></div>
                            </div>
                        </div>

                        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                            Fazer Upgrade do Plano
                        </button>
                    </div>

                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
                        <AlertTriangle size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
                        <div style={{ fontSize: 'var(--text-sm)', color: '#fef3c7' }}>
                            <strong>Integração de Pagamento:</strong> O ambiente de pagamentos (Gateway) está atualmente em modo Sandbox (Testes). Para habilitar as cobranças reais dos seus clientes no portal, conecte sua conta Asaas ou Stripe.
                            <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-3)', width: '100%' }}>
                                Conectar Gateway
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
