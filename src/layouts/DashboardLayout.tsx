import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, MapPin, Cpu, ClipboardList,
    QrCode, Menu, LogOut, Bell, ChevronLeft, Settings, Loader2, UserCog
} from 'lucide-react';
import { authApi, organizationsApi } from '../services/api';
import type { Organization, User } from '../types';
import PaymentBlockedPage from '../pages/PaymentBlockedPage';
import './DashboardLayout.css';

const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { path: '/dashboard/clients', icon: Users, label: 'Clientes', end: false },
    { path: '/dashboard/sectors', icon: MapPin, label: 'Setores', end: false },
    { path: '/dashboard/equipment', icon: Cpu, label: 'Equipamentos', end: false },
    { path: '/dashboard/service-orders', icon: ClipboardList, label: 'Ordens de Serviço', end: false },
    { path: '/dashboard/technicians', icon: UserCog, label: 'Técnicos', end: false },
    { path: '/dashboard/settings', icon: Settings, label: 'Configurações', end: false },
];

export default function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [blocked, setBlocked] = useState<'trial_expired' | 'past_due' | 'canceled' | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const loadSession = async () => {
            try {
                const currentUser = await authApi.getCurrentUser();
                if (!currentUser) {
                    navigate('/login');
                    return;
                }
                setUser(currentUser);
                const org = await organizationsApi.get();
                setOrganization(org);

                if (org?.brandColor) {
                    document.documentElement.style.setProperty('--color-primary', org.brandColor);
                    document.documentElement.style.setProperty('--color-accent-primary', org.brandColor);
                }

                // Check trial/payment status
                if (org) {
                    if (org.paymentStatus === 'past_due') {
                        setBlocked('past_due');
                    } else if (org.paymentStatus === 'canceled') {
                        setBlocked('canceled');
                    } else if ((org as any).trialEndsAt) {
                        const trialEnd = new Date((org as any).trialEndsAt);
                        if (trialEnd < new Date() && org.paymentStatus !== 'active') {
                            setBlocked('trial_expired');
                        }
                    }
                }
            } catch (error) {
                console.error("Session error:", error);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };
        loadSession();
    }, [navigate]);

    const handleLogout = async () => {
        await authApi.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
                <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div className={`dashboard ${collapsed ? 'dashboard--collapsed' : ''}`}>
            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
                onClick={() => setMobileOpen(false)}
            />
            <motion.aside
                className={`sidebar ${mobileOpen ? 'open' : ''}`}
                animate={{ width: collapsed ? 72 : 280 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
            >
                <div className="sidebar__header">
                    {!collapsed && (
                        <motion.div className="sidebar__logo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="navbar__logo-icon" style={{ width: 32, height: 32 }}>
                                <QrCode size={18} />
                            </div>
                            <span className="navbar__logo-text" style={{ fontSize: '1rem' }}>
                                Maint<span className="text-gradient">QR</span>
                            </span>
                        </motion.div>
                    )}
                    {collapsed && (
                        <div className="navbar__logo-icon" style={{ width: 36, height: 36, margin: '0 auto' }}>
                            <QrCode size={18} />
                        </div>
                    )}
                    <button className="sidebar__toggle" onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav className="sidebar__nav">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                            >
                                <Icon size={20} />
                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: 'auto' }}
                                            exit={{ opacity: 0, width: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="sidebar__footer">
                    <button className="sidebar__link" onClick={handleLogout}>
                        <LogOut size={20} />
                        {!collapsed && <span>Sair</span>}
                    </button>
                </div>
            </motion.aside>

            <div className="dashboard__main">
                <header className="topbar">
                    <div className="topbar__left">
                        <button className="topbar__mobile-toggle" onClick={() => setMobileOpen(true)}>
                            <Menu size={20} />
                        </button>
                        <h2 className="topbar__org">{organization?.name || 'MaintQR'}</h2>
                    </div>
                    <div className="topbar__right">
                        <button className="btn btn-icon btn-ghost">
                            <Bell size={20} />
                        </button>
                        <button className="btn btn-icon btn-ghost" onClick={() => navigate('/dashboard/settings')}>
                            <Settings size={20} />
                        </button>
                        <div className="topbar__user">
                            <div className="topbar__avatar">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            {!collapsed && <span className="topbar__username">{user?.name || 'Técnico'}</span>}
                        </div>
                    </div>
                </header>

                <main className="dashboard__content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
