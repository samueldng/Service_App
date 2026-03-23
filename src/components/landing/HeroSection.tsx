import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

export default function HeroSection() {
    return (
        <section className="hero">
            <div className="hero__bg-effects">
                <div className="hero__orb hero__orb--1" />
                <div className="hero__orb hero__orb--2" />
                <div className="hero__orb hero__orb--3" />
            </div>

            <div className="hero__canvas-wrapper">
                <div className="qr-grid-css">
                    {Array.from({ length: 49 }).map((_, i) => (
                        <div
                            key={i}
                            className="qr-grid-css__dot"
                            style={{
                                animationDelay: `${(i * 0.08) % 2}s`,
                                opacity: Math.random() > 0.35 ? 1 : 0,
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="hero__content">
                <motion.div
                    className="hero__badge"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <Sparkles size={14} />
                    <span>Plataforma de Gestão Inteligente</span>
                </motion.div>

                <motion.h1
                    className="hero__title"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    Controle total dos seus{' '}
                    <span className="text-gradient">ativos</span> com{' '}
                    <span className="text-gradient">QR Code</span>
                </motion.h1>

                <motion.p
                    className="hero__subtitle"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                >
                    Gere QR Codes únicos para cada equipamento, registre manutenções em tempo real
                    e ofereça transparência total aos seus clientes.
                </motion.p>

                <motion.div
                    className="hero__actions"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                >
                    <Link to="/register" className="btn btn-primary btn-lg">
                        Começar Agora
                        <ArrowRight size={18} />
                    </Link>
                    <a href="#features" className="btn btn-secondary btn-lg">
                        Ver Recursos
                    </a>
                </motion.div>

                <motion.div
                    className="hero__stats"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.0 }}
                >
                    <div className="hero__stat">
                        <span className="hero__stat-value">2.500+</span>
                        <span className="hero__stat-label">Equipamentos</span>
                    </div>
                    <div className="hero__stat-divider" />
                    <div className="hero__stat">
                        <span className="hero__stat-value">350+</span>
                        <span className="hero__stat-label">Prestadores</span>
                    </div>
                    <div className="hero__stat-divider" />
                    <div className="hero__stat">
                        <span className="hero__stat-value">15k+</span>
                        <span className="hero__stat-label">OS Registradas</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
