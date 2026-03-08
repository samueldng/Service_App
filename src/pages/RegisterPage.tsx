import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, Mail, Lock, User, Building, ArrowRight, Crown, FileText } from 'lucide-react';
import { authApi } from '../services/api';
import './LoginPage.css';

const planNames: Record<string, string> = {
    starter: 'Starter — R$ 59/mês',
    professional: 'Professional — R$ 149/mês',
    enterprise: 'Enterprise — R$ 349/mês',
};

export default function RegisterPage() {
    const [searchParams] = useSearchParams();
    const selectedPlan = searchParams.get('plan') || 'starter';

    const [formData, setFormData] = useState({
        name: '', company: '', cpfCnpj: '', email: '', password: '',
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authApi.register(formData.email, formData.password, formData.name, formData.company, selectedPlan, formData.cpfCnpj);
            navigate('/dashboard');
        } catch (error: any) {
            alert('Erro ao criar conta: ' + error.message);
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
                    <h1 className="login-card__title">Crie sua conta</h1>
                    <p className="login-card__subtitle">7 dias grátis • Sem cartão de crédito</p>
                </div>

                {/* Selected Plan Badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)',
                    background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                    marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-accent-tertiary)'
                }}>
                    <Crown size={16} />
                    <span>Plano selecionado: <strong style={{ color: 'var(--color-text-primary)' }}>{planNames[selectedPlan] || planNames.starter}</strong></span>
                </div>

                <form className="login-card__form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Seu nome</label>
                        <div className="login-input-wrapper">
                            <User size={18} className="login-input-icon" />
                            <input type="text" name="name" className="form-input login-input" placeholder="João Silva" value={formData.name} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nome da empresa</label>
                        <div className="login-input-wrapper">
                            <Building size={18} className="login-input-icon" />
                            <input type="text" name="company" className="form-input login-input" placeholder="Minha Empresa Ltda" value={formData.company} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">CPF ou CNPJ</label>
                        <div className="login-input-wrapper">
                            <FileText size={18} className="login-input-icon" />
                            <input type="text" name="cpfCnpj" className="form-input login-input" placeholder="000.000.000-00" value={formData.cpfCnpj} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <div className="login-input-wrapper">
                            <Mail size={18} className="login-input-icon" />
                            <input type="email" name="email" className="form-input login-input" placeholder="seu@email.com" value={formData.email} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <div className="login-input-wrapper">
                            <Lock size={18} className="login-input-icon" />
                            <input type="password" name="password" className="form-input login-input" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Criando conta...' : 'Começar Trial de 7 Dias'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="login-card__footer">
                    <p>Já tem uma conta? <Link to="/login">Fazer login</Link></p>
                </div>
            </motion.div>
        </div>
    );
}
