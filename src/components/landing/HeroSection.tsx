import { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

// QR Code pattern — 1 = filled pixel, 0 = empty
const QR_PATTERN = [
    [1,1,1,1,1,1,1,0,1,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,1,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0],
    [1,0,1,0,1,1,1,1,0,0,1,1,1,0,1,1,1,0,1,0],
    [1,1,0,1,0,0,1,0,1,0,0,0,1,1,0,0,1,1,0,1],
    [0,1,1,1,1,0,0,1,0,1,1,1,0,0,0,1,0,1,1,0],
    [1,0,0,1,0,1,1,1,1,0,0,1,0,1,1,1,1,0,0,1],
    [0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,1,1,1,0],
    [1,1,1,1,1,1,1,0,1,1,0,0,0,1,0,1,0,0,1,1],
    [1,0,0,0,0,0,1,0,0,1,1,1,1,0,1,1,1,1,0,0],
    [1,0,1,1,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,0,0,1,1,0,1,1,1,0,1,1,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,1,1,0,0,1,1,0,0],
    [1,1,1,1,1,1,1,0,0,1,1,1,0,1,1,1,0,0,1,1],
];

const GRID_SIZE = QR_PATTERN.length;

export default function HeroSection() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawQR = () => {
            const dpr = Math.min(window.devicePixelRatio, 2);
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (!rect) return;

            // Canvas covers the full container
            const w = rect.width;
            const h = rect.height;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.scale(dpr, dpr);

            ctx.clearRect(0, 0, w, h);

            // Center the QR grid in the canvas
            const cellSize = Math.min(w, h) * 0.018;
            const gap = cellSize * 0.25;
            const totalSize = GRID_SIZE * (cellSize + gap);
            const offsetX = (w - totalSize) / 2;
            const offsetY = (h - totalSize) / 2;

            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    if (QR_PATTERN[row][col] === 1) {
                        const x = offsetX + col * (cellSize + gap);
                        const y = offsetY + row * (cellSize + gap);

                        // Subtle gradient from cyan to emerald
                        const t = (row + col) / (GRID_SIZE * 2);
                        const r = Math.round(14 + t * 38);
                        const g = Math.round(165 + t * 46);
                        const b = Math.round(233 - t * 134);

                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }
                }
            }
        };

        drawQR();

        const handleResize = () => drawQR();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <section className="hero" id="hero">
            {/* Background ambient effects */}
            <div className="hero__bg-effects">
                <div className="hero__grid-pattern" />
                <div className="hero__glow hero__glow--1" />
                <div className="hero__glow hero__glow--2" />
            </div>

            {/* QR Code canvas + scanner overlay */}
            <div className="hero__qr-visual" aria-hidden="true">
                <canvas ref={canvasRef} className="hero__qr-canvas" />
                <div className="hero__scanner-line" />
            </div>

            {/* Main content */}
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
