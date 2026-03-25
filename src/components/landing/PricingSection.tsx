import { useRef, useEffect } from 'react';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cards = containerRef.current?.querySelectorAll('.pricing-card');
        const header = headerRef.current;
        if (!cards && !header) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('pricing-card--visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        if (header) observer.observe(header);
        cards?.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <section id="pricing" className="pricing section-padding">
            <div className="container">
                <div ref={headerRef} className="pricing__header pricing-card">
                    <span className="pricing__badge">Planos</span>
                    <h2 className="pricing__title">
                        Escolha o plano <span className="hero__gradient-text">ideal</span>
                    </h2>
                    <p className="pricing__subtitle">
                        Comece grátis por 7 dias. Sem cartão de crédito.
                    </p>
                </div>

                <div ref={containerRef} className="pricing__grid">
                    {plans.map((plan, i) => (
                        <div
                            key={plan.name}
                            className={`pricing-card ${plan.popular ? 'pricing-card--popular' : ''}`}
                            style={{ transitionDelay: `${i * 0.12}s` }}
                        >
                            {plan.popular && (
                                <div className="pricing-card__badge-tag">
                                    <Zap size={12} />
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
                                to={`/register?plan=${plan.planId}`}
                                className={plan.popular ? 'hero__cta-primary pricing-card__cta' : 'pricing-card__cta-outline'}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
