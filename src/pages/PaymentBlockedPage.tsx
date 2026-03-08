import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CreditCard, Crown } from 'lucide-react';
import type { Organization } from '../types';
import './LoginPage.css';

const planNames: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
};

const planPrices: Record<string, number> = {
    starter: 59,
    professional: 149,
    enterprise: 349,
};

interface Props {
    organization: Organization;
    reason: 'trial_expired' | 'past_due' | 'canceled';
}

export default function PaymentBlockedPage({ organization, reason }: Props) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const plan = organization.subscriptionPlan || 'starter';

    const handlePayment = async () => {
        setLoading(true);
        try {
            // Generate Asaas payment link via edge function
            const { supabase } = await import('../lib/supabase');
            const { data, error } = await supabase.functions.invoke('asaas-create-subscription', {
                body: {
                    name: organization.name,
                    email: organization.email || '',
                    plan,
                },
            });

            if (error) throw error;

            if (data?.paymentLink) {
                window.open(data.paymentLink, '_blank');
            } else {
                alert('Link de pagamento será enviado por email. Verifique sua caixa de entrada.');
            }
        } catch (err) {
            console.error('Payment error:', err);
            alert('Erro ao gerar link de pagamento. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const messages = {
        trial_expired: {
            title: 'Seu período de teste expirou',
            subtitle: 'Escolha um plano para continuar usando o MaintQR',
        },
        past_due: {
            title: 'Pagamento pendente',
            subtitle: 'Regularize seu pagamento para continuar acessando o sistema',
        },
        canceled: {
            title: 'Assinatura cancelada',
            subtitle: 'Reative sua assinatura para voltar a usar o MaintQR',
        },
    };

    const msg = messages[reason];

    return (
        <div className="login-page" style={{ minHeight: '100vh' }}>
            <div className="login-page__bg">
                <div className="login-page__orb login-page__orb--1" />
                <div className="login-page__orb login-page__orb--2" />
                <div className="login-page__grid-overlay" />
            </div>

            <motion.div
                className="login-card glass-card"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6 }}
                style={{ maxWidth: 480 }}
            >
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: reason === 'trial_expired' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-4)',
                    }}>
                        <AlertTriangle size={32} style={{
                            color: reason === 'trial_expired' ? '#fbbf24' : '#ef4444'
                        }} />
                    </div>
                    <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
                        {msg.title}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                        {msg.subtitle}
                    </p>
                </div>

                <div style={{
                    padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
                    background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)',
                    marginBottom: 'var(--space-4)', textAlign: 'center',
                }}>
                    <Crown size={20} style={{ color: 'var(--color-accent-tertiary)', marginBottom: 'var(--space-2)' }} />
                    <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--text-base)' }}>
                        Plano {planNames[plan]} — R$ {planPrices[plan]}/mês
                    </p>
                </div>

                <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', gap: 'var(--space-2)' }}
                >
                    <CreditCard size={18} />
                    {loading ? 'Gerando link...' : 'Pagar agora'}
                </button>

                <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Aceitamos PIX, Boleto e Cartão de Crédito via Asaas
                </p>
            </motion.div>
        </div>
    );
}
