import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Menu, X } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Recursos', href: '#features' },
        { label: 'Como Funciona', href: '#how-it-works' },
        { label: 'Planos', href: '#pricing' },
    ];

    return (
        <motion.nav
            className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="navbar__inner">
                <Link to="/" className="navbar__logo">
                    <div className="navbar__logo-icon">
                        <QrCode size={24} />
                    </div>
                    <span className="navbar__logo-text">
                        Maint<span className="text-gradient">QR</span>
                    </span>
                </Link>

                <div className="navbar__links">
                    {navLinks.map((link) => (
                        <a key={link.href} href={link.href} className="navbar__link">
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="navbar__actions">
                    <Link to="/login" className="btn btn-ghost">Entrar</Link>
                    <Link to="/register" className="btn btn-primary">Começar Grátis</Link>
                </div>

                <button className="navbar__mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="navbar__mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {navLinks.map((link) => (
                            <a key={link.href} href={link.href} className="navbar__mobile-link" onClick={() => setMobileOpen(false)}>
                                {link.label}
                            </a>
                        ))}
                        <div className="navbar__mobile-actions">
                            <Link to="/login" className="btn btn-ghost" style={{ width: '100%' }}>Entrar</Link>
                            <Link to="/register" className="btn btn-primary" style={{ width: '100%' }}>Começar Grátis</Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
