import { QrCode, Github, Linkedin, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer__grid">
                    <div className="footer__brand">
                        <div className="footer__logo">
                            <div className="navbar__logo-icon">
                                <QrCode size={20} />
                            </div>
                            <span className="navbar__logo-text">
                                Maint<span className="text-gradient">QR</span>
                            </span>
                        </div>
                        <p className="footer__desc">
                            Plataforma inteligente de gestão de ativos e manutenção com QR Codes.
                            Transparência e controle para prestadores e clientes.
                        </p>
                        <div className="footer__social">
                            <a href="#" className="footer__social-link"><Instagram size={18} /></a>
                            <a href="#" className="footer__social-link"><Linkedin size={18} /></a>
                            <a href="#" className="footer__social-link"><Github size={18} /></a>
                        </div>
                    </div>

                    <div className="footer__col">
                        <h4 className="footer__col-title">Produto</h4>
                        <a href="#features" className="footer__link">Recursos</a>
                        <a href="#pricing" className="footer__link">Planos</a>
                        <a href="#how-it-works" className="footer__link">Como Funciona</a>
                        <a href="#" className="footer__link">Integrações</a>
                    </div>

                    <div className="footer__col">
                        <h4 className="footer__col-title">Empresa</h4>
                        <a href="#" className="footer__link">Sobre</a>
                        <a href="#" className="footer__link">Blog</a>
                        <a href="#" className="footer__link">Carreiras</a>
                        <a href="#" className="footer__link">Contato</a>
                    </div>

                    <div className="footer__col">
                        <h4 className="footer__col-title">Legal</h4>
                        <a href="#" className="footer__link">Privacidade</a>
                        <a href="#" className="footer__link">Termos</a>
                        <a href="#" className="footer__link">Cookies</a>
                    </div>
                </div>

                <div className="footer__bottom">
                    <p>&copy; 2026 MaintQR. Todos os direitos reservados.</p>
                    <p>Feito com 💜 no Brasil</p>
                </div>
            </div>
        </footer>
    );
}
