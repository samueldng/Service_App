import { motion } from 'framer-motion';
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

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="how-it-works section-padding">
            <div className="container">
                <motion.div
                    className="how-it-works__header"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="badge badge-info">Como Funciona</span>
                    <h2 className="how-it-works__title">
                        Simples como <span className="text-gradient">escanear</span>
                    </h2>
                    <p className="how-it-works__subtitle">
                        Em 4 passos, tenha controle total da sua operação de campo.
                    </p>
                </motion.div>

                <motion.div
                    className="how-it-works__steps"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                >
                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <motion.div key={step.step} className="how-step" variants={itemVariants}>
                                <div className="how-step__number">{step.step}</div>
                                <div className="how-step__icon-wrapper">
                                    <Icon size={28} />
                                </div>
                                <h3 className="how-step__title">{step.title}</h3>
                                <p className="how-step__desc">{step.description}</p>
                                {i < steps.length - 1 && <div className="how-step__connector" />}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
