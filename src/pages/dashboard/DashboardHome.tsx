import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Cpu, ClipboardList, Shield, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { clientsApi, equipmentsApi, serviceOrdersApi } from '../../services/api';
import type { Client, Equipment, ServiceOrder } from '../../types';
import { useNavigate } from 'react-router-dom';

const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};
const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function DashboardHome() {
    const [clients, setClients] = useState<Client[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        clientsApi.getAll().then(setClients);
        equipmentsApi.getAll().then(setEquipments);
        serviceOrdersApi.getAll().then(setOrders);
    }, []);

    const warrantyActive = orders.filter(o =>
        o.warrantyUntil && new Date(o.warrantyUntil) > new Date()
    ).length;

    // Calculate Status Data
    const counts = { abertas: 0, em_progresso: 0, concluidas: 0 };
    orders.forEach(o => {
        if (o.status === 'aberta') counts.abertas++;
        else if (o.status === 'em_progresso') counts.em_progresso++;
        else if (o.status === 'concluida') counts.concluidas++;
    });

    const totalOrders = orders.length || 1; // prevent division by zero

    const statusData = [
        { name: 'Concluídas', value: Math.round((counts.concluidas / totalOrders) * 100) || 0, color: '#34d399' },
        { name: 'Em Progresso', value: Math.round((counts.em_progresso / totalOrders) * 100) || 0, color: '#fbbf24' },
        { name: 'Abertas', value: Math.round((counts.abertas / totalOrders) * 100) || 0, color: '#6366f1' },
    ];

    // Calculate Monthly Data
    const getMonthName = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    };

    const monthMap = new Map<string, { name: string, preventivas: number, corretivas: number }>();

    // Create an empty map for the last 6 months + current month to ensure graph continuity
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const name = getMonthName(d.toISOString());
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthMap.set(key, { name: name.charAt(0).toUpperCase() + name.slice(1), preventivas: 0, corretivas: 0 });
    }

    orders.forEach(o => {
        if (!o.date) return;
        const d = new Date(o.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;

        if (monthMap.has(key)) {
            const data = monthMap.get(key)!;
            if (o.type === 'preventiva') data.preventivas++;
            if (o.type === 'corretiva') data.corretivas++;
        } else {
            // For dates outside our 7 month window, we either ignore or dynamically expand
            // Standard dashboard design usually shows a fixed window, so we'll stick to the pre-filled map
        }
    });

    const monthlyData = Array.from(monthMap.values());

    const stats = [
        { icon: Users, label: 'Clientes', value: clients.length, trend: '+12%', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
        { icon: Cpu, label: 'Equipamentos', value: equipments.length, trend: '+8%', color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.12)' },
        { icon: ClipboardList, label: 'Ordens de Serviço', value: orders.length, trend: '+15%', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
        { icon: Shield, label: 'Garantias Ativas', value: warrantyActive, trend: 'Ativas', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    ];

    return (
        <div>
            <div className="page-header">
                <div className="page-header__left">
                    <h1>Dashboard</h1>
                    <p>Visão geral da sua operação</p>
                </div>
            </div>

            <motion.div className="stats-grid" variants={container} initial="hidden" animate="visible">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <motion.div key={s.label} className="stat-card glass-card" variants={item}>
                            <div className="stat-card__header">
                                <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>
                                    <Icon size={20} />
                                </div>
                                <div className="stat-card__trend stat-card__trend--up">
                                    <TrendingUp size={14} />
                                    {s.trend}
                                </div>
                            </div>
                            <div className="stat-card__value">{s.value}</div>
                            <div className="stat-card__label">{s.label}</div>
                        </motion.div>
                    );
                })}
            </motion.div>

            <div className="charts-grid">
                <motion.div className="glass-card" style={{ padding: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Manutenções por Mês</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCorr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} />
                            <Tooltip
                                contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }}
                            />
                            <Area type="monotone" dataKey="preventivas" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrev)" strokeWidth={2} />
                            <Area type="monotone" dataKey="corretivas" stroke="#fb7185" fillOpacity={1} fill="url(#colorCorr)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                <motion.div className="glass-card" style={{ padding: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Status das OS</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                                {statusData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                        {statusData.map((s) => (
                            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                                {s.name}: {s.value}%
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <motion.div className="glass-card activity-card" style={{ padding: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Atividade Recente</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {orders.slice(0, 5).map((order) => {
                        const eq = equipments.find(e => e.id === order.equipmentId);
                        return (
                            <motion.div
                                key={order.id}
                                onClick={() => navigate('/dashboard/service-orders')}
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                className="activity-item"
                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: order.type === 'preventiva' ? 'rgba(99, 102, 241, 0.12)' : order.type === 'corretiva' ? 'rgba(251, 113, 133, 0.12)' : 'rgba(34, 211, 238, 0.12)',
                                    color: order.type === 'preventiva' ? '#6366f1' : order.type === 'corretiva' ? '#fb7185' : '#22d3ee'
                                }}>
                                    <ClipboardList size={18} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                        {order.type === 'preventiva' ? 'Preventiva' : order.type === 'corretiva' ? 'Corretiva' : 'Instalação'} — {eq?.name || 'Equipamento'}
                                    </div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                                        {order.technicianName} • {new Date(order.date).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                                <span className={`badge ${order.status === 'concluida' ? 'badge-success' : order.status === 'em_progresso' ? 'badge-warning' : 'badge-primary'}`}>
                                    {order.status === 'concluida' ? 'Concluída' : order.status === 'em_progresso' ? 'Em Progresso' : 'Aberta'}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}
