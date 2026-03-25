import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

export default function HeroSection() {
    return (
        <section className="hero">
            <div className="hero__bg-effects">
                <div className="hero__grid-pattern" />
                <div className="hero__glow hero__glow--1" />
                <div className="hero__glow hero__glow--2" />
            </div>

            <div className="hero__qr-visual" aria-hidden="true">
                <svg viewBox="0 0 210 210" className="hero__qr-svg" fill="none">
                    {/* QR-style decorative pattern — pure CSS animated SVG */}
                    <defs>
                        <linearGradient id="qr-grad" x1="0" y1="0" x2="210" y2="210" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>
                    {/* Corner markers */}
                    <rect x="10" y="10" width="60" height="60" rx="4" stroke="url(#qr-grad)" strokeWidth="3" fill="none" className="hero__qr-block" />
                    <rect x="20" y="20" width="40" height="40" rx="2" fill="url(#qr-grad)" className="hero__qr-block hero__qr-block--delay1" />
                    <rect x="140" y="10" width="60" height="60" rx="4" stroke="url(#qr-grad)" strokeWidth="3" fill="none" className="hero__qr-block hero__qr-block--delay2" />
                    <rect x="150" y="20" width="40" height="40" rx="2" fill="url(#qr-grad)" className="hero__qr-block hero__qr-block--delay3" />
                    <rect x="10" y="140" width="60" height="60" rx="4" stroke="url(#qr-grad)" strokeWidth="3" fill="none" className="hero__qr-block hero__qr-block--delay4" />
                    <rect x="20" y="150" width="40" height="40" rx="2" fill="url(#qr-grad)" className="hero__qr-block hero__qr-block--delay1" />
                    {/* Data dots */}
                    {[85, 95, 105, 115, 125].map((x) =>
                        [85, 95, 105, 115, 125].map((y) => (
                            <rect
                                key={`${x}-${y}`}
                                x={x}
                                y={y}
                                width="8"
                                height="8"
                                rx="1"
                                fill="url(#qr-grad)"
                                className="hero__qr-dot"
                                style={{ animationDelay: `${(x + y) * 0.005}s` }}
                            />
                        ))
                    )}
                    {/* Scan line */}
                    <line x1="0" y1="0" x2="210" y2="0" stroke="#0ea5e9" strokeWidth="2" strokeOpacity="0.5" className="hero__scan-line" />
                </svg>
            </div>

            <div className="hero__content">
                <div className="hero__badge hero__fade-in">
                    <Sparkles size={14} />
                    <span>Plataforma de Gestão Inteligente</span>
                </div>

                <h1 className="hero__title hero__fade-in hero__fade-in--d1">
                    Controle total dos seus{' '}
                    <span className="hero__gradient-text">ativos</span> com{' '}
                    <span className="hero__gradient-text">QR Code</span>
                </h1>

                <p className="hero__subtitle hero__fade-in hero__fade-in--d2">
                    Gere QR Codes únicos para cada equipamento, registre manutenções em tempo real
                    e ofereça transparência total aos seus clientes.
                </p>

                <div className="hero__actions hero__fade-in hero__fade-in--d3">
                    <Link to="/register" className="hero__cta-primary">
                        Começar Agora
                        <ArrowRight size={18} />
                    </Link>
                    <a href="#features" className="hero__cta-secondary">
                        Ver Recursos
                    </a>
                </div>

                <div className="hero__stats hero__fade-in hero__fade-in--d4">
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
                </div>
            </div>
        </section>
    );
}
