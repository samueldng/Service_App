import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Palette, CreditCard, Save, CheckCircle2, AlertTriangle, Building, Upload, ArrowUpCircle } from 'lucide-react';
import { organizationsApi } from '../../services/api';
import { supabase } from '../../lib/supabase';
import type { Organization } from '../../types';

const PLAN_DATA: Record<string, { name: string; price: string; limit: number | string }> = {
    starter: { name: 'Starter', price: 'R$ 59/mês', limit: 30 },
    free: { name: 'Starter', price: 'R$ 59/mês', limit: 30 },
    professional: { name: 'Professional', price: 'R$ 149/mês', limit: 150 },
    pro: { name: 'Professional', price: 'R$ 149/mês', limit: 150 },
    enterprise: { name: 'Enterprise', price: 'R$ 349/mês', limit: 'Ilimitado' },
};

export default function SettingsPage() {
    const [org, setOrg] = useState<Organization | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        organizationsApi.get()
            .then(data => {
                if (data) {
                    setOrg(data);
                    // Apply saved brand color on load
                    if (data.brandColor) {
                        applyBrandColor(data.brandColor);
                    }
                }
            })
            .catch(err => console.error('Failed to load organization:', err));
    }, []);

    const applyBrandColor = (color: string) => {
        document.documentElement.style.setProperty('--color-primary', color);
        document.documentElement.style.setProperty('--color-accent-primary', color);
        // Generate lighter variants
        document.documentElement.style.setProperty('--color-accent-glow', `${color}4D`);
        document.documentElement.style.setProperty('--color-border-accent', `${color}4D`);
    };

    const handleSave = async () => {
        if (!org) return;
        setSaving(true);
        try {
            const updated = await organizationsApi.update(org.id, org);
            setOrg(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            if (updated?.brandColor) applyBrandColor(updated.brandColor);
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !org) return;

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const filePath = `${org.id}/logo.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('org-logos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('org-logos')
                .getPublicUrl(filePath);

            const logoUrl = urlData.publicUrl + '?t=' + Date.now();
            setOrg({ ...org, logoUrl });
        } catch (error: any) {
            alert('Erro ao fazer upload: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    if (!org) return null;

    const currentPlan = PLAN_DATA[org.subscriptionPlan] || PLAN_DATA.starter;

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-6)' }}>
                {/* White-label Settings */}
                <motion.div className="glass-card" style={{ padding: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                <img src={org.logoUrl} alt="Logo" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building size={24} style={{ color: 'var(--color-text-tertiary)' }} />
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleLogoUpload}
                            />
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ marginTop: 'var(--space-2)' }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <>Enviando...</>
                                ) : (
                                    <><Upload size={14} /> {org.logoUrl ? 'Trocar Logo' : 'Fazer Upload'}</>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                        <label className="form-label">Cor Principal da Marca (Hex)</label>
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <input
                                type="color"
                                value={org.brandColor || '#6366f1'}
                                onChange={e => {
                                    setOrg({ ...org, brandColor: e.target.value });
                                    applyBrandColor(e.target.value);
                                }}
                                style={{ width: 48, height: 48, padding: 0, border: 'none', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer' }}
                            />
                            <input
                                className="form-input"
                                value={org.brandColor || '#6366f1'}
                                onChange={e => {
                                    setOrg({ ...org, brandColor: e.target.value });
                                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                                        applyBrandColor(e.target.value);
                                    }
                                }}
                                style={{ flex: 1, fontFamily: 'monospace' }}
                            />
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                            Essa cor será usada no Portal do Cliente, Dashboard e QR Codes para refletir sua marca.
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            <div>
                                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>Plano {currentPlan.name}</h3>
                                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', margin: 'var(--space-1) 0 0 0' }}>{currentPlan.price}</p>
                            </div>
                            <span className={`badge ${org.paymentStatus === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                {org.paymentStatus === 'active' ? 'Ativo' : 'Pagamento Pendente'}
                            </span>
                        </div>

                        {typeof currentPlan.limit === 'number' && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Limite de Equipamentos</span>
                                    <span style={{ fontWeight: 600 }}>{currentPlan.limit}</span>
                                </div>
                                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: '24%', height: '100%', background: 'var(--color-accent-primary)', borderRadius: 3 }}></div>
                                </div>
                            </div>
                        )}

                        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                            <ArrowUpCircle size={16} /> Fazer Upgrade do Plano
                        </button>
                    </div>

                    {/* Plan comparison */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {(['starter', 'professional', 'enterprise'] as const).map(planKey => {
                            const plan = PLAN_DATA[planKey];
                            const isCurrent = org.subscriptionPlan === planKey || (planKey === 'starter' && (org.subscriptionPlan === 'free' || org.subscriptionPlan === 'starter'));
                            return (
                                <div key={planKey} style={{
                                    padding: 'var(--space-3) var(--space-4)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: isCurrent ? '1px solid var(--color-accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                                    background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    flexWrap: 'wrap', gap: 'var(--space-2)',
                                }}>
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{plan.name}</span>
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)' }}>{plan.price}</span>
                                    </div>
                                    {isCurrent ? (
                                        <span className="badge badge-success">Atual</span>
                                    ) : (
                                        <button className="btn btn-primary btn-sm">Selecionar</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: 'var(--space-6)', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
                        <AlertTriangle size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
                        <div style={{ fontSize: 'var(--text-sm)', color: '#fef3c7' }}>
                            <strong>Gateway de Pagamento:</strong> A integração com Asaas será ativada em breve para cobranças automáticas via PIX, boleto e cartão.
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
