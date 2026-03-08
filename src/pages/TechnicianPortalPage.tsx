import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList, Camera, CheckCircle2, LogOut, Loader2, ChevronDown, ChevronUp,
    Wrench, Calendar, Building, QrCode, Send
} from 'lucide-react';
import { serviceOrdersApi, equipmentsApi, clientsApi, authApi } from '../services/api';
import type { ServiceOrder, Equipment, Client, User } from '../types';
import PhotoCapture from '../components/PhotoCapture';
import toast, { Toaster } from 'react-hot-toast';

export default function TechnicianPortalPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [photosBefore, setPhotosBefore] = useState<string[]>([]);
    const [photosAfter, setPhotosAfter] = useState<string[]>([]);
    const [activePhotoOrder, setActivePhotoOrder] = useState<{ id: string; type: 'before' | 'after' } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            const currentUser = await authApi.getCurrentUser();
            if (!currentUser) { navigate('/login'); return; }
            if (currentUser.role !== 'technician') {
                toast.error('Acesso restrito a técnicos');
                navigate('/dashboard');
                return;
            }
            setUser(currentUser);
            await loadData();
        } catch {
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        const [ordersData, eqData, clientsData] = await Promise.all([
            serviceOrdersApi.getAll(),
            equipmentsApi.getAll(),
            clientsApi.getAll()
        ]);
        setOrders(ordersData);
        setEquipments(eqData);
        setClients(clientsData);
    };

    const getEquipment = (id: string) => equipments.find(e => e.id === id);

    const handleStartOrder = async (id: string) => {
        const updated = await serviceOrdersApi.update(id, { status: 'em_progresso' });
        setOrders(prev => prev.map(o => o.id === id ? updated : o));
        toast.success('OS iniciada!');
    };

    const handleSubmitPhotos = async (orderId: string, type: 'before' | 'after') => {
        const photos = type === 'before' ? photosBefore : photosAfter;
        if (photos.length === 0) { toast.error('Adicione pelo menos 1 foto'); return; }

        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const existing = type === 'before' ? (order.photosBefore || []) : (order.photosAfter || []);
        const updatePayload = type === 'before'
            ? { photosBefore: [...existing, ...photos] }
            : { photosAfter: [...existing, ...photos] };

        const updated = await serviceOrdersApi.update(orderId, updatePayload as any);
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        setActivePhotoOrder(null);
        type === 'before' ? setPhotosBefore([]) : setPhotosAfter([]);
        toast.success(`Fotos ${type === 'before' ? 'antes' : 'depois'} salvas!`);
    };

    const handleFinishOrder = async (id: string) => {
        const order = orders.find(o => o.id === id);
        if (!order?.photosAfter || order.photosAfter.length === 0) {
            toast.error('Adicione fotos do DEPOIS antes de finalizar');
            return;
        }
        const updated = await serviceOrdersApi.update(id, { status: 'aguardando_aprovacao' });
        setOrders(prev => prev.map(o => o.id === id ? updated : o));
        toast.success('OS enviada para aprovação do administrador!');
    };

    const handleLogout = async () => {
        await authApi.logout();
        navigate('/login');
    };

    const statusLabels: Record<string, string> = {
        aberta: 'Aberta', em_progresso: 'Em Progresso',
        aguardando_aprovacao: 'Aguardando Aprovação', concluida: 'Concluída'
    };
    const statusColors: Record<string, string> = {
        aberta: 'var(--color-accent-primary)', em_progresso: 'var(--color-amber)',
        aguardando_aprovacao: 'var(--color-cyan)', concluida: 'var(--color-emerald)'
    };
    const typeLabels: Record<string, string> = { preventiva: 'Preventiva', corretiva: 'Corretiva', instalacao: 'Instalação' };

    // Only show orders that are not concluded
    const myOrders = orders
        .filter(o => o.status !== 'concluida')
        .sort((a, b) => {
            const priority: Record<string, number> = { em_progresso: 0, aberta: 1, aguardando_aprovacao: 2 };
            return (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
        });

    const completedOrders = orders.filter(o => o.status === 'concluida').slice(0, 5);

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
                <Loader2 size={32} className="spin" style={{ color: 'var(--color-accent-primary)' }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
            <Toaster position="top-center" />

            {/* Header */}
            <header style={{
                padding: 'var(--space-4) var(--space-5)', background: 'var(--color-bg-secondary)',
                borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <QrCode size={18} color="#fff" />
                    </div>
                    <div>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)' }}>
                            Maint<span style={{ color: 'var(--color-accent-primary)' }}>QR</span>
                        </span>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                            Olá, {user?.name}
                        </p>
                    </div>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={handleLogout}>
                    <LogOut size={18} />
                </button>
            </header>

            {/* Content */}
            <div style={{ padding: 'var(--space-5)', maxWidth: 640, margin: '0 auto' }}>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', fontFamily: 'var(--font-heading)' }}>
                    <ClipboardList size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                    Minhas Ordens de Serviço
                </h2>

                {myOrders.length === 0 ? (
                    <div className="glass-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                        <CheckCircle2 size={48} style={{ color: 'var(--color-emerald)', margin: '0 auto var(--space-4)', opacity: 0.5 }} />
                        <p style={{ color: 'var(--color-text-tertiary)' }}>Nenhuma OS pendente 🎉</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {myOrders.map((order, i) => {
                            const eq = getEquipment(order.equipmentId);
                            const client = clients.find(c => c.id === eq?.clientId);
                            const isExpanded = expandedOrder === order.id;

                            return (
                                <motion.div key={order.id} className="glass-card" style={{ padding: 'var(--space-4)' }}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>

                                    <div onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 'var(--radius-md)',
                                                    fontSize: '0.65rem', fontWeight: 600,
                                                    background: `${statusColors[order.status]}20`, color: statusColors[order.status]
                                                }}>
                                                    {statusLabels[order.status]}
                                                </span>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 'var(--radius-md)',
                                                    fontSize: '0.65rem', fontWeight: 500,
                                                    background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)'
                                                }}>
                                                    {typeLabels[order.type]}
                                                </span>
                                            </div>
                                            <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 'var(--space-1) 0' }}>
                                                {eq?.name || 'Equipamento'}
                                            </p>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building size={12} /> {client?.name}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(order.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--color-text-muted)' }} />}
                                    </div>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                style={{ overflow: 'hidden', borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>

                                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                                                    {order.description}
                                                </p>

                                                {/* Photos Before */}
                                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>📷 Fotos Antes</span>
                                                    {order.photosBefore && order.photosBefore.length > 0 ? (
                                                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                                                            {order.photosBefore.map((p, i) => (
                                                                <img key={i} src={p} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 'var(--space-1) 0' }}>Sem fotos</p>
                                                    )}
                                                    {order.status === 'em_progresso' && (
                                                        <button className="btn btn-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}
                                                            onClick={() => { setActivePhotoOrder({ id: order.id, type: 'before' }); setPhotosBefore([]); }}>
                                                            <Camera size={14} /> Adicionar Fotos Antes
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Photos After */}
                                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>✅ Fotos Depois</span>
                                                    {order.photosAfter && order.photosAfter.length > 0 ? (
                                                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                                                            {order.photosAfter.map((p, i) => (
                                                                <img key={i} src={p} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 'var(--space-1) 0' }}>Sem fotos</p>
                                                    )}
                                                    {order.status === 'em_progresso' && (
                                                        <button className="btn btn-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}
                                                            onClick={() => { setActivePhotoOrder({ id: order.id, type: 'after' }); setPhotosAfter([]); }}>
                                                            <Camera size={14} /> Adicionar Fotos Depois
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                                    {order.status === 'aberta' && (
                                                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleStartOrder(order.id)}>
                                                            <Wrench size={16} /> Iniciar Serviço
                                                        </button>
                                                    )}
                                                    {order.status === 'em_progresso' && (
                                                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleFinishOrder(order.id)}>
                                                            <Send size={16} /> Enviar para Aprovação
                                                        </button>
                                                    )}
                                                    {order.status === 'aguardando_aprovacao' && (
                                                        <div style={{
                                                            width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                                                            background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.2)',
                                                            textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-cyan)'
                                                        }}>
                                                            ⏳ Aguardando aprovação do administrador
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Completed */}
                {completedOrders.length > 0 && (
                    <div style={{ marginTop: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
                            Últimas Concluídas
                        </h3>
                        {completedOrders.map(order => {
                            const eq = getEquipment(order.equipmentId);
                            return (
                                <div key={order.id} className="glass-card" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-2)', opacity: 0.6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 'var(--text-sm)' }}>{eq?.name}</span>
                                        <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Concluída</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Photo Upload Modal */}
            <AnimatePresence>
                {activePhotoOrder && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setActivePhotoOrder(null)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className="modal__header">
                                <h2>{activePhotoOrder.type === 'before' ? '📷 Fotos Antes' : '✅ Fotos Depois'}</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setActivePhotoOrder(null)}>
                                    <span style={{ fontSize: 20, lineHeight: 1 }}>✕</span>
                                </button>
                            </div>
                            <div className="modal__form">
                                <PhotoCapture
                                    label={activePhotoOrder.type === 'before' ? 'Fotos antes do serviço' : 'Fotos depois do serviço'}
                                    photos={activePhotoOrder.type === 'before' ? photosBefore : photosAfter}
                                    onChange={activePhotoOrder.type === 'before' ? setPhotosBefore : setPhotosAfter}
                                    maxPhotos={5}
                                />
                                <div className="modal__actions">
                                    <button className="btn btn-secondary" onClick={() => setActivePhotoOrder(null)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={() => handleSubmitPhotos(activePhotoOrder.id, activePhotoOrder.type)}>
                                        Salvar Fotos
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
