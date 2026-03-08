import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, Mail, Lock, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';
import './LoginPage.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authApi.login(email, password);
            // Check role to redirect accordingly
            const currentUser = await authApi.getCurrentUser();
            if (currentUser?.role === 'technician') {
                navigate('/tecnico');
            } else {
                navigate('/dashboard');
            }
        } catch {
            alert('Credenciais inválidas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-page__bg">
                <div className="login-page__orb login-page__orb--1" />
                <div className="login-page__orb login-page__orb--2" />
                <div className="login-page__grid-overlay" />
            </div>

            <motion.div
                className="login-card glass-card"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <div className="login-card__header">
                    <Link to="/" className="login-card__logo">
                        <div className="navbar__logo-icon">
                            <QrCode size={24} />
                        </div>
                        <span className="navbar__logo-text">
                            Maint<span className="text-gradient">QR</span>
                        </span>
                    </Link>
                    <h1 className="login-card__title">Bem-vindo de volta</h1>
                    <p className="login-card__subtitle">Entre na sua conta para continuar</p>
                </div>

                <form className="login-card__form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <div className="login-input-wrapper">
                            <Mail size={18} className="login-input-icon" />
                            <input
                                type="email"
                                className="form-input login-input"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <div className="login-input-wrapper">
                            <Lock size={18} className="login-input-icon" />
                            <input
                                type="password"
                                className="form-input login-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="login-card__footer">
                    <p>Não tem uma conta? <Link to="/register">Criar conta grátis</Link></p>
                </div>
            </motion.div>
        </div>
    );
}
