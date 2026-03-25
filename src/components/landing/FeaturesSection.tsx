import { useRef, useEffect } from 'react';
import { QrCode, ClipboardList, Shield, History, Smartphone, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './FeaturesSection.css';

type Feature = {
    icon: LucideIcon;
    title: string;
    description: string;
    color: string;
};

const features: Feature[] = [
    {
        icon: QrCode,
        title: 'QR Code Inteligente',
        description: 'Gere códigos únicos para cada equipamento. Escaneie, identifique e acesse o histórico completo instantaneamente.',
        color: '#0ea5e9',
    },
    {
        icon: ClipboardList,
        title: 'Ordens de Serviço',
        description: 'Crie e gerencie OS com fotos, descrições detalhadas e acompanhamento de status em tempo real.',
        color: '#34d399',
    },
    {
        icon: History,
        title: 'Histórico Completo',
        description: 'Timeline detalhada de todas as intervenções, preventivas e corretivas, para cada ativo.',
        color: '#38bdf8',
    },
    {
        icon: Shield,
        title: 'Controle de Garantia',
        description: 'Alertas visuais automáticos quando o equipamento ainda está dentro do período de garantia.',
        color: '#f59e0b',
    },
    {
        icon: Smartphone,
        title: 'Portal do Cliente',
        description: 'Seus clientes acompanham tudo pelo celular. Transparência total com um simples scan.',
        color: '#ef4444',
    },
    {
        icon: Bell,
        title: 'Alertas Inteligentes',
        description: 'Notificações de manutenção preventiva, vencimento de garantia e solicitações de reparo.',
        color: '#a855f7',
    },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.style.transitionDelay = `${index * 0.08}s`;
                    el.classList.add('feature-card--visible');
                    observer.unobserve(el);
                }
            },
            { threshold: 0.15 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [index]);

    const Icon = feature.icon;

    return (
        <div ref={ref} className="feature-card">
            <div className="feature-card__icon" style={{ background: `${feature.color}12`, color: feature.color }}>
                <Icon size={24} />
            </div>
            <h3 className="feature-card__title">{feature.title}</h3>
            <p className="feature-card__desc">{feature.description}</p>
            <div className="feature-card__accent" style={{ background: feature.color }} />
        </div>
    );
}

export default function FeaturesSection() {
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add('features__header--visible');
                    observer.unobserve(el);
                }
            },
            { threshold: 0.2 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <section id="features" className="features section-padding">
            <div className="container">
                <div ref={headerRef} className="features__header">
                    <span className="features__badge">Recursos</span>
                    <h2 className="features__title">
                        Tudo que você precisa para{' '}
                        <span className="hero__gradient-text">gerenciar seus ativos</span>
                    </h2>
                    <p className="features__subtitle">
                        Uma plataforma completa para prestadores de serviço que buscam
                        eficiência, organização e transparência.
                    </p>
                </div>

                <div className="features__grid">
                    {features.map((feature, i) => (
                        <FeatureCard key={feature.title} feature={feature} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}
