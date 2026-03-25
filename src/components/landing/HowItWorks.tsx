import { useRef, useEffect } from 'react';
import { UserPlus, QrCode, Wrench, Send } from 'lucide-react';
import './HowItWorks.css';

const steps = [
    {
        icon: UserPlus,
        step: '01',
        title: 'Cadastre',
        description: 'Registre o cliente, crie os setores e adicione cada equipamento com seus dados técnicos.',
    },
    {
        icon: QrCode,
        step: '02',
        title: 'Identifique',
        description: 'Gere o QR Code único e imprima a etiqueta para colar no equipamento.',
    },
    {
        icon: Wrench,
        step: '03',
        title: 'Registre',
        description: 'Escaneie o código, registre a manutenção com fotos e descrição detalhada.',
    },
    {
        icon: Send,
        step: '04',
        title: 'Compartilhe',
        description: 'O cliente recebe o link e acompanha tudo em tempo real pelo celular.',
    },
];

export default function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const elements = containerRef.current?.querySelectorAll('.how-step');
        const header = headerRef.current;
        if (!elements && !header) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('how-step--visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        if (header) observer.observe(header);
        elements?.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <section id="how-it-works" className="how-it-works section-padding">
            <div className="container">
                <div ref={headerRef} className="how-it-works__header how-step">
                    <span className="how-it-works__badge">Como Funciona</span>
                    <h2 className="how-it-works__title">
                        Simples como <span className="hero__gradient-text">escanear</span>
                    </h2>
                    <p className="how-it-works__subtitle">
                        Em 4 passos, tenha controle total da sua operação de campo.
                    </p>
                </div>

                <div ref={containerRef} className="how-it-works__steps">
                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <div
                                key={step.step}
                                className="how-step"
                                style={{ transitionDelay: `${i * 0.12}s` }}
                            >
                                <div className="how-step__number">{step.step}</div>
                                <div className="how-step__icon-wrapper">
                                    <Icon size={28} />
                                </div>
                                <h3 className="how-step__title">{step.title}</h3>
                                <p className="how-step__desc">{step.description}</p>
                                {i < steps.length - 1 && <div className="how-step__connector" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
