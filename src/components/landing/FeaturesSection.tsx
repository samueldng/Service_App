import { useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { QrCode, ClipboardList, Shield, History, Smartphone, Bell } from 'lucide-react';
import './FeaturesSection.css';
import gsap from 'gsap';

const features = [
    {
        icon: QrCode,
        title: 'QR Code Inteligente',
        description: 'Gere códigos únicos para cada equipamento. Escaneie, identifique e acesse o histórico completo instantaneamente.',
        color: '#6366f1',
    },
    {
        icon: ClipboardList,
        title: 'Ordens de Serviço',
        description: 'Crie e gerencie OS com fotos, descrições detalhadas e acompanhamento de status em tempo real.',
        color: '#8b5cf6',
    },
    {
        icon: History,
        title: 'Histórico Completo',
        description: 'Timeline detalhada de todas as intervenções, preventivas e corretivas, para cada ativo.',
        color: '#22d3ee',
    },
    {
        icon: Shield,
        title: 'Controle de Garantia',
        description: 'Alertas visuais automáticos quando o equipamento ainda está dentro do período de garantia.',
        color: '#34d399',
    },
    {
        icon: Smartphone,
        title: 'Portal do Cliente',
        description: 'Seus clientes acompanham tudo pelo celular. Transparência total com um simples scan.',
        color: '#fbbf24',
    },
    {
        icon: Bell,
        title: 'Alertas Inteligentes',
        description: 'Notificações de manutenção preventiva, vencimento de garantia e solicitações de reparo.',
        color: '#fb7185',
    },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    useEffect(() => {
        if (isInView && ref.current) {
            gsap.fromTo(ref.current,
                { y: 60, opacity: 0, scale: 0.95 },
                { y: 0, opacity: 1, scale: 1, duration: 0.7, delay: index * 0.1, ease: 'power3.out' }
            );
        }
    }, [isInView, index]);

    const Icon = feature.icon;

    return (
        <div ref={ref} className="feature-card glass-card" style={{ opacity: 0 }}>
            <div className="feature-card__icon" style={{ background: `${feature.color}15`, color: feature.color }}>
                <Icon size={24} />
            </div>
            <h3 className="feature-card__title">{feature.title}</h3>
            <p className="feature-card__desc">{feature.description}</p>
            <div className="feature-card__glow" style={{ background: `radial-gradient(circle, ${feature.color}10, transparent)` }} />
        </div>
    );
}

export default function FeaturesSection() {
    return (
        <section id="features" className="features section-padding mesh-bg">
            <div className="container">
                <motion.div
                    className="features__header"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="features__badge badge badge-primary">Recursos</span>
                    <h2 className="features__title">
                        Tudo que você precisa para{' '}
                        <span className="text-gradient">gerenciar seus ativos</span>
                    </h2>
                    <p className="features__subtitle">
                        Uma plataforma completa para prestadores de serviço que buscam
                        eficiência, organização e transparência.
                    </p>
                </motion.div>

                <div className="features__grid">
                    {features.map((feature, i) => (
                        <FeatureCard key={feature.title} feature={feature} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}
