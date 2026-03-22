import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Save, CheckCircle2, ArrowUpCircle, Crown, Zap, Rocket, X, Check, Building2, Upload, Image, Trash2 } from 'lucide-react';
import { organizationsApi } from '../../services/api';

import type { Organization } from '../../types';

const PLAN_DATA: Record<string, { name: string; price: number; priceLabel: string; limit: number | string; features: string[] }> = {
    starter: {
        name: 'Starter', price: 59, priceLabel: 'R$ 59/mês', limit: 30,
        features: ['Até 30 equipamentos', 'Geração de QR Code', 'Histórico básico', 'Portal do cliente', 'Suporte por email'],
    },
    free: {
        name: 'Starter', price: 59, priceLabel: 'R$ 59/mês', limit: 30,
        features: ['Até 30 equipamentos', 'Geração de QR Code', 'Histórico básico', 'Portal do cliente', 'Suporte por email'],
    },
    professional: {
        name: 'Professional', price: 149, priceLabel: 'R$ 149/mês', limit: 150,
        features: ['Até 150 equipamentos', 'QR Code + Impressão Bluetooth', 'Histórico completo com fotos', 'Alertas de garantia', 'Relatórios e dashboard', 'Múltiplos técnicos', 'Suporte prioritário'],
    },
    pro: {
        name: 'Professional', price: 149, priceLabel: 'R$ 149/mês', limit: 150,
        features: ['Até 150 equipamentos', 'QR Code + Impressão Bluetooth', 'Histórico completo com fotos', 'Alertas de garantia', 'Relatórios e dashboard', 'Múltiplos técnicos', 'Suporte prioritário'],
    },
    enterprise: {
        name: 'Enterprise', price: 349, priceLabel: 'R$ 349/mês', limit: 'Ilimitado',
        features: ['Equipamentos ilimitados', 'Todas as funcionalidades Pro', 'API personalizada', 'Onboarding dedicado', 'SLA garantido', 'Suporte 24/7'],
    },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
    starter: <Zap size={20} />,
    free: <Zap size={20} />,
    professional: <Crown size={20} />,
    pro: <Crown size={20} />,
    enterprise: <Rocket size={20} />,
};

const PLAN_COLORS: Record<string, string> = {
    starter: '#22d3ee',
    free: '#22d3ee',
    professional: '#a78bfa',
    pro: '#a78bfa',
    enterprise: '#f59e0b',
};

export default function SettingsPage() {
    const [org, setOrg] = useState<Organization | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);

    useEffect(() => {
        organizationsApi.get()
            .then(data => {
                if (data) {
                    setOrg(data);
                    if (data.brandColor) applyBrandColor(data.brandColor);
                }
            })
            .catch(err => console.error('Failed to load organization:', err));
    }, []);

    const applyBrandColor = (color: string) => {
        document.documentElement.style.setProperty('--color-primary', color);
        document.documentElement.style.setProperty('--color-accent-primary', color);
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
        if (file.size > 5 * 1024 * 1024) {
            alert('Arquivo muito grande. Máximo 5MB.');
            return;
        }
        setLogoUploading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
            const token = localStorage.getItem('maintqr_token');
            const formData = new FormData();
            formData.append('logo', file);
            const res = await fetch(`${API_URL}/upload/logo`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });
            if (!res.ok) throw new Error('Falha no upload');
            const data = await res.json();
            const updated = await organizationsApi.update(org.id, { logoUrl: data.url });
            setOrg(updated);
        } catch (err: any) {
            alert('Erro ao enviar logo: ' + err.message);
        } finally {
            setLogoUploading(false);
            e.target.value = '';
        }
    };

    const handleLogoRemove = async () => {
        if (!org) return;
        try {
            const updated = await organizationsApi.update(org.id, { logoUrl: '' });
            setOrg(updated);
        } catch (err: any) {
            alert('Erro ao remover logo: ' + err.message);
        }
    };

    const handleUpgrade = async (planKey: string) => {
        if (!org) return;
        setUpgrading(planKey);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
            const token = localStorage.getItem('maintqr_token');
            const res = await fetch(`${API_URL}/asaas/create-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    name: org.name,
                    email: org.email || '',
                    plan: planKey,
                    cpfCnpj: org.document || undefined,
                    upgrade: true,
                }),
            });
            if (!res.ok) throw new Error('Falha ao processar upgrade');
            const data = await res.json();

            // Update org plan locally
            const newPlan = PLAN_DATA[planKey];
            const updated = await organizationsApi.update(org.id, {
                subscriptionPlan: planKey as Organization['subscriptionPlan'],
            });
            setOrg(updated);
            setShowUpgradeModal(false);

            if (data?.paymentLink) {
                window.open(data.paymentLink, '_blank');
            } else {
                alert(`Plano atualizado para ${newPlan.name}! O link de pagamento será enviado por email.`);
            }
        } catch (err: any) {
            alert('Erro ao fazer upgrade: ' + err.message);
        } finally {
            setUpgrading(null);
        }
    };

    const getCurrentPlanOrder = () => {
        const order = { free: 0, starter: 0, pro: 1, professional: 1, enterprise: 2 };
        return order[org?.subscriptionPlan || 'starter'] ?? 0;
    };

    if (!org) return null;

    const currentPlan = PLAN_DATA[org.subscriptionPlan] || PLAN_DATA.starter;
    const currentOrder = getCurrentPlanOrder();

    const trialDaysLeft = org.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

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

            {/* Trial Banner */}
            {trialDaysLeft !== null && trialDaysLeft > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
                        marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(251, 191, 36, 0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Crown size={20} style={{ color: '#fbbf24' }} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 600, color: '#fef3c7', margin: 0 }}>
                                {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'} no trial
                            </p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(254, 243, 199, 0.7)', margin: 0 }}>
                                Faça upgrade para não perder acesso
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowUpgradeModal(true)}>
                        <ArrowUpCircle size={16} /> Fazer Upgrade
                    </button>
                </motion.div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-6)' }}>
                {/* White-label Settings */}
                <motion.div className="glass-card" style={{ padding: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={20} />
                        </div>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>Empresa</h2>
                    </div>

                    {/* Logo Upload */}
                    <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)' }}>
                        <label className="form-label" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>Logo da Empresa</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                            {org.logoUrl ? (
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={org.logoUrl.startsWith('http') ? org.logoUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:3333').replace('/api', '')}${org.logoUrl}`}
                                        alt="Logo"
                                        style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <button
                                        onClick={handleLogoRemove}
                                        style={{
                                            position: 'absolute', top: -8, right: -8,
                                            width: 24, height: 24, borderRadius: '50%',
                                            background: 'var(--color-rose)', border: 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: '#fff',
                                        }}
                                        title="Remover logo"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{
                                    width: 80, height: 80, borderRadius: 'var(--radius-md)',
                                    border: '2px dashed rgba(255,255,255,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--color-text-muted)',
                                }}>
                                    <Image size={28} />
                                </div>
                            )}
                            <div style={{ flex: 1, minWidth: 180 }}>
                                <label
                                    className="btn btn-secondary btn-sm"
                                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                                >
                                    <Upload size={16} />
                                    {logoUploading ? 'Enviando...' : org.logoUrl ? 'Trocar Logo' : 'Enviar Logo'}
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={logoUploading} />
                                </label>
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0' }}>
                                    PNG, JPG ou SVG. Máx 5MB. Aparecerá no PDF de orçamento.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Nome da Empresa</label>
                            <input className="form-input" value={org.name || ''} onChange={e => setOrg({ ...org, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">CPF ou CNPJ</label>
                            <input className="form-input" value={org.document || ''} onChange={e => setOrg({ ...org, document: e.target.value })} placeholder="Ex: 00.000.000/0001-00" />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                        <label className="form-label">Nome do Responsável / Assinatura</label>
                        <input className="form-input" value={org.ownerName || ''} onChange={e => setOrg({ ...org, ownerName: e.target.value })} placeholder="Ex: Francisco Junior" />
                    </div>

                    <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Telefone / WhatsApp</label>
                            <input className="form-input" value={org.phone || ''} onChange={e => setOrg({ ...org, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" type="email" value={org.email || ''} onChange={e => setOrg({ ...org, email: e.target.value })} />
                        </div>
                    </div>

                    {/* Address */}
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginTop: 'var(--space-6)', marginBottom: 'var(--space-3)' }}>Endereço Completo</h3>
                    <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                        <label className="form-label">Logradouro, Bairro, Número</label>
                        <input className="form-input" value={org.address || ''} onChange={e => setOrg({ ...org, address: e.target.value })} placeholder="Ex: Rua 07, próximo cabeção gás, s/n - Vila Da Paz" />
                    </div>
                    <div className="form-grid form-grid-3" style={{ marginBottom: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">Cidade</label>
                            <input className="form-input" value={org.city || ''} onChange={e => setOrg({ ...org, city: e.target.value })} placeholder="Bacabal" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">UF</label>
                            <input className="form-input" value={org.state || ''} onChange={e => setOrg({ ...org, state: e.target.value })} placeholder="MA" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">CEP</label>
                            <input className="form-input" value={org.cep || ''} onChange={e => setOrg({ ...org, cep: e.target.value })} placeholder="00000-000" />
                        </div>
                    </div>

                    {/* Bank / PIX */}
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginTop: 'var(--space-6)', marginBottom: 'var(--space-3)' }}>Dados Bancários & PIX</h3>
                    <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                        <label className="form-label">Chave PIX</label>
                        <input className="form-input" value={org.pixKey || ''} onChange={e => setOrg({ ...org, pixKey: e.target.value })} placeholder="Telefone, CPF/CNPJ ou Email" />
                    </div>

                    <div className="form-grid" style={{ marginBottom: 'var(--space-3)' }}>
                        <div className="form-group">
                            <label className="form-label">Banco</label>
                            <input className="form-input" value={org.bankName || ''} onChange={e => setOrg({ ...org, bankName: e.target.value })} placeholder="Ex: Banco do Brasil" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Agência</label>
                            <input className="form-input" value={org.bankAgency || ''} onChange={e => setOrg({ ...org, bankAgency: e.target.value })} placeholder="Ex: 0528-2" />
                        </div>
                    </div>

                    <div className="form-grid" style={{ marginBottom: 'var(--space-3)' }}>
                        <div className="form-group">
                            <label className="form-label">Conta</label>
                            <input className="form-input" value={org.bankAccount || ''} onChange={e => setOrg({ ...org, bankAccount: e.target.value })} placeholder="Ex: 00055310-7" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tipo de Conta</label>
                            <select className="form-input" value={org.bankAccountType || 'corrente'} onChange={e => setOrg({ ...org, bankAccountType: e.target.value })}>
                                <option value="corrente">Corrente</option>
                                <option value="poupanca">Poupança</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Titular (Nome / CPF / CNPJ)</label>
                        <input className="form-input" value={org.bankHolder || ''} onChange={e => setOrg({ ...org, bankHolder: e.target.value })} placeholder="Ex: Empresa Ltda (CNPJ: 00...)" />
                    </div>
                </motion.div>

                {/* Billing / Plan */}
                <motion.div className="glass-card" style={{ padding: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'rgba(34, 211, 238, 0.12)', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={20} />
                        </div>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>Assinatura & Cobrança</h2>
                    </div>

                    {/* Current plan card */}
                    <div style={{
                        border: `1px solid ${PLAN_COLORS[org.subscriptionPlan] || PLAN_COLORS.starter}33`,
                        borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
                        background: `linear-gradient(145deg, ${PLAN_COLORS[org.subscriptionPlan] || PLAN_COLORS.starter}0D 0%, transparent 100%)`,
                        marginBottom: 'var(--space-4)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                                    background: `${PLAN_COLORS[org.subscriptionPlan] || PLAN_COLORS.starter}1A`,
                                    color: PLAN_COLORS[org.subscriptionPlan] || PLAN_COLORS.starter,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {PLAN_ICONS[org.subscriptionPlan] || PLAN_ICONS.starter}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>Plano {currentPlan.name}</h3>
                                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', margin: 0 }}>{currentPlan.priceLabel}</p>
                                </div>
                            </div>
                            <span className={`badge ${org.paymentStatus === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                {org.paymentStatus === 'active' ? 'Ativo' : org.paymentStatus === 'past_due' ? 'Pendente' : 'Cancelado'}
                            </span>
                        </div>

                        {/* Features list */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                            {currentPlan.features.slice(0, 4).map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                                    <Check size={12} style={{ color: PLAN_COLORS[org.subscriptionPlan] || PLAN_COLORS.starter, flexShrink: 0 }} />
                                    {f}
                                </div>
                            ))}
                        </div>

                        {typeof currentPlan.limit === 'number' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-1)', color: 'var(--color-text-tertiary)' }}>
                                    <span>Equipamentos</span>
                                    <span>{currentPlan.limit} máx.</span>
                                </div>
                                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: '15%', height: '100%', background: PLAN_COLORS[org.subscriptionPlan] || PLAN_COLORS.starter, borderRadius: 2 }} />
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', gap: 'var(--space-2)' }}
                        onClick={() => setShowUpgradeModal(true)}
                    >
                        <ArrowUpCircle size={18} /> Gerenciar Plano
                    </button>

                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
                        Pagamento via PIX, Boleto ou Cartão • Asaas
                    </p>
                </motion.div>
            </div>

            {/* Upgrade Modal */}
            <AnimatePresence>
                {showUpgradeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 1000,
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 'var(--space-4)',
                        }}
                        onClick={() => setShowUpgradeModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.3 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xl)',
                                border: '1px solid rgba(255,255,255,0.08)', maxWidth: 680, width: '100%',
                                maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                                <div>
                                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0 }}>Escolha seu plano</h2>
                                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', margin: 'var(--space-1) 0 0' }}>Upgrade ou downgrade a qualquer momento</p>
                                </div>
                                <button className="btn btn-icon btn-ghost" onClick={() => setShowUpgradeModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                {(['starter', 'professional', 'enterprise'] as const).map((planKey, idx) => {
                                    const plan = PLAN_DATA[planKey];
                                    const planOrder = idx;
                                    const isCurrent = org.subscriptionPlan === planKey || (planKey === 'starter' && ['free', 'starter'].includes(org.subscriptionPlan));
                                    const isUpgrade = planOrder > currentOrder;
                                    const isDowngrade = planOrder < currentOrder;
                                    const color = PLAN_COLORS[planKey];

                                    return (
                                        <motion.div
                                            key={planKey}
                                            whileHover={{ scale: isCurrent ? 1 : 1.01 }}
                                            style={{
                                                padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)',
                                                border: isCurrent ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.08)',
                                                background: isCurrent ? `${color}0A` : 'rgba(255,255,255,0.02)',
                                                position: 'relative', overflow: 'hidden',
                                            }}
                                        >
                                            {isCurrent && (
                                                <div style={{
                                                    position: 'absolute', top: 12, right: -28, background: color,
                                                    color: '#000', fontSize: '10px', fontWeight: 700, padding: '2px 32px',
                                                    transform: 'rotate(45deg)', letterSpacing: '0.5px',
                                                }}>
                                                    ATUAL
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    <div style={{
                                                        width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                                                        background: `${color}1A`, color, display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        {PLAN_ICONS[planKey]}
                                                    </div>
                                                    <div>
                                                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>{plan.name}</h3>
                                                        <p style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 'var(--space-1) 0 0', color }}>
                                                            R$ {plan.price}<span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>/mês</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    {isCurrent ? (
                                                        <span className="badge badge-success">Plano Atual</span>
                                                    ) : (
                                                        <button
                                                            className={`btn ${isUpgrade ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                                            onClick={() => handleUpgrade(planKey)}
                                                            disabled={upgrading !== null}
                                                            style={{ minWidth: 120 }}
                                                        >
                                                            {upgrading === planKey ? 'Processando...' : isUpgrade ? '⬆ Upgrade' : isDowngrade ? '⬇ Downgrade' : 'Selecionar'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                                                {plan.features.map((f, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                                                        <Check size={12} style={{ color, flexShrink: 0 }} />
                                                        {f}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
