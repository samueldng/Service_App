import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import './PricingSection.css';

const plans = [
    {
        name: 'Starter',
        price: 'R$ 59',
        period: '/mês',
        description: 'Ideal para profissionais autônomos',
        features: [
            'Até 30 equipamentos',
            'Geração de QR Code',
            'Histórico básico',
            'Portal do cliente',
            'Suporte por email',
        ],
        cta: 'Começar Grátis',
        popular: false,
        planId: 'starter',
    },
    {
        name: 'Professional',
        price: 'R$ 149',
        period: '/mês',
        description: 'Para empresas em crescimento',
        features: [
            'Até 150 equipamentos',
            'QR Code + Impressão Bluetooth',
            'Histórico completo com fotos',
            'Alertas de garantia',
            'Relatórios e dashboard',
            'Múltiplos técnicos',
            'Suporte prioritário',
        ],
        cta: 'Assinar Agora',
        popular: true,
        planId: 'professional',
    },
    {
        name: 'Enterprise',
        price: 'R$ 349',
        period: '/mês',
        description: 'Operação em larga escala',
        features: [
            'Equipamentos ilimitados',
            'Tudo do Professional',
            'API de integração',
            'Dashboard financeiro',
            'Relatórios avançados',
            'Multi-filiais',
            'Onboarding dedicado',
            'SLA garantido',
        ],
        cta: 'Falar com Vendas',
        popular: false,
        planId: 'enterprise',
    },
];

export default function PricingSection() {
    return (
        <section id="pricing" className="pricing section-padding mesh-bg">
            <div className="container">
                <motion.div
                    className="pricing__header"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="badge badge-success">Planos</span>
                    <h2 className="pricing__title">
                        Escolha o plano <span className="text-gradient">ideal</span>
                    </h2>
                    <p className="pricing__subtitle">
                        Comece grátis por 7 dias. Sem cartão de crédito.
                    </p>
                </motion.div>

                <div className="pricing__grid">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            className={`pricing-card glass-card ${plan.popular ? 'pricing-card--popular' : ''}`}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.15 }}
                        >
                            {plan.popular && (
                                <div className="pricing-card__badge">
                                    <Zap size={14} />
                                    Mais Popular
                                </div>
                            )}
                            <div className="pricing-card__header">
                                <h3 className="pricing-card__name">{plan.name}</h3>
                                <p className="pricing-card__desc">{plan.description}</p>
                                <div className="pricing-card__price">
                                    <span className="pricing-card__amount">{plan.price}</span>
                                    <span className="pricing-card__period">{plan.period}</span>
                                </div>
                            </div>
                            <ul className="pricing-card__features">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="pricing-card__feature">
                                        <Check size={16} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                to="/register"
                                className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} btn-lg`}
                                style={{ width: '100%' }}
                            >
                                {plan.cta}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
