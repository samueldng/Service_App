import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Menu, X } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Recursos', href: '#features' },
        { label: 'Como Funciona', href: '#how-it-works' },
        { label: 'Planos', href: '#pricing' },
    ];

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        setMobileOpen(false);
        const targetId = href.replace('#', '');
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
            <div className="navbar__inner">
                <Link to="/" className="navbar__logo">
                    <div className="navbar__logo-icon">
                        <QrCode size={24} />
                    </div>
                    <span className="navbar__logo-text">
                        Maint<span className="hero__gradient-text">QR</span>
                    </span>
                </Link>

                <div className="navbar__links">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="navbar__link"
                            onClick={(e) => handleNavClick(e, link.href)}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="navbar__actions">
                    <Link to="/login" className="navbar__login-btn">Entrar</Link>
                    <Link to="/register" className="hero__cta-primary" style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem' }}>
                        Começar Grátis
                    </Link>
                </div>

                <button
                    className="navbar__mobile-toggle"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                >
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <div className={`navbar__mobile-menu ${mobileOpen ? 'navbar__mobile-menu--open' : ''}`}>
                {navLinks.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="navbar__mobile-link"
                        onClick={(e) => handleNavClick(e, link.href)}
                    >
                        {link.label}
                    </a>
                ))}
                <div className="navbar__mobile-actions">
                    <Link to="/login" className="navbar__mobile-login-btn" onClick={() => setMobileOpen(false)}>Entrar</Link>
                    <Link to="/register" className="hero__cta-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>Começar Grátis</Link>
                </div>
            </div>
        </nav>
    );
}
