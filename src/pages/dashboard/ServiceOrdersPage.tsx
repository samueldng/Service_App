import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, ClipboardList, Calendar, Wrench, Shield, Building, Camera, ChevronDown, ChevronUp, UserCog, Send } from 'lucide-react';
import { serviceOrdersApi, equipmentsApi, clientsApi, organizationsApi } from '../../services/api';
import type { ServiceOrder, Equipment, Client, Organization } from '../../types';
import PhotoCapture from '../../components/PhotoCapture';

interface TechnicianOption {
    id: string;
    name: string;
}

export default function ServiceOrdersPage() {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<string>('all');
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [photosBefore, setPhotosBefore] = useState<string[]>([]);
    const [photosAfter, setPhotosAfter] = useState<string[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [viewingOrder, setViewingOrder] = useState<ServiceOrder | null>(null);
    const [showPhotoModal, setShowPhotoModal] = useState<{ orderId: string; type: 'before' | 'after' } | null>(null);
    const [addingPhotos, setAddingPhotos] = useState<string[]>([]);
    const [techniciansList, setTechniciansList] = useState<TechnicianOption[]>([]);
    const [form, setForm] = useState<{ clientId: string, equipmentId: string, type: ServiceOrder['type'], description: string, technicianId: string, warrantyUntil: string }>({ clientId: '', equipmentId: '', type: 'preventiva', description: '', technicianId: '', warrantyUntil: '' });

    useEffect(() => {
        serviceOrdersApi.getAll().then(setOrders);
        equipmentsApi.getAll().then(setEquipments);
        clientsApi.getAll().then(setClients);
        organizationsApi.get().then(setOrganization);
        loadTechnicians();
    }, []);

    const loadTechnicians = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
            const token = localStorage.getItem('maintqr_token');
            if (!token) return;
            const res = await fetch(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const users = await res.json();
            setTechniciansList(
                (users || [])
                    .filter((u: any) => u.role === 'technician')
                    .map((d: any) => ({ id: d.id, name: d.name }))
            );
        } catch (err) {
            console.error('Failed to load technicians:', err);
        }
    };

    const getEquipment = (id: string) => equipments.find(e => e.id === id);

    const handleSendToTechnician = (order: ServiceOrder) => {
        const eq = getEquipment(order.equipmentId);
        const cli = clients.find(c => c.id === eq?.clientId);
        const tech = techniciansList.find(t => t.id === order.technicianId);
        const techName = tech ? tech.name : 'Não Atribuído';

        const text = `*Nova Ordem de Serviço* 🛠️\n\n*Cliente:* ${cli?.name || 'N/A'}\n*Equipamento:* ${eq?.name || 'N/A'}\n*Data:* ${new Date(order.date).toLocaleDateString('pt-BR')}\n*Técnico Atribuído:* ${techName}\n*Descrição:* ${order.description}\n\nAcesse o sistema para ver os detalhes e executar a ordem de serviço:\n${window.location.origin}/login`;

        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const filtered = orders
        .filter(o => filter === 'all' || o.status === filter)
        .filter(o => {
            const eq = getEquipment(o.equipmentId);
            return o.description.toLowerCase().includes(search.toLowerCase()) ||
                eq?.name.toLowerCase().includes(search.toLowerCase()) || false;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getTechnicianName = (techId?: string) => {
        if (!techId) return 'Não atribuído';
        const tech = techniciansList.find(t => t.id === techId);
        return tech?.name || 'Técnico';
    };

    const handleCreate = async () => {
        if (!form.equipmentId) return;

        const newOrder: Omit<ServiceOrder, 'id' | 'createdAt'> = {
            equipmentId: form.equipmentId,
            type: form.type,
            description: form.description,
            technicianName: form.technicianId ? getTechnicianName(form.technicianId) : '',
            technicianId: form.technicianId || undefined,
            date: new Date().toISOString().split('T')[0],
            status: 'aberta',
            photosBefore: photosBefore.length > 0 ? photosBefore : undefined,
            photosAfter: photosAfter.length > 0 ? photosAfter : undefined,
            ...(form.warrantyUntil ? { warrantyUntil: form.warrantyUntil } : {})
        };
        const created = await serviceOrdersApi.create(newOrder);
        setOrders(prev => [...prev, created]);
        setShowModal(false);
        setPhotosBefore([]);
        setPhotosAfter([]);
    };

    const updateStatus = async (id: string, status: ServiceOrder['status']) => {
        const updated = await serviceOrdersApi.update(id, { status });
        setOrders(prev => prev.map(o => o.id === id ? updated : o));
    };

    const handleAddPhotosAfter = async (orderId: string) => {
        if (addingPhotos.length === 0) return;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        const existingAfter = order.photosAfter || [];
        const updated = await serviceOrdersApi.update(orderId, {
            photosAfter: [...existingAfter, ...addingPhotos]
        } as any);
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        setShowPhotoModal(null);
        setAddingPhotos([]);
    };

    const statusLabels: Record<string, string> = { aberta: 'Aberta', em_progresso: 'Em Progresso', aguardando_aprovacao: 'Aguardando Aprovação', concluida: 'Concluída' };
    const typeLabels = { preventiva: 'Preventiva', corretiva: 'Corretiva', instalacao: 'Instalação' };
    const typeColors = { preventiva: '#6366f1', corretiva: '#fb7185', instalacao: '#22d3ee' };

    const PhotoThumbnails = ({ photos, label }: { photos?: string[]; label: string }) => {
        if (!photos || photos.length === 0) return null;
        return (
            <div style={{ marginTop: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
                    <Camera size={12} /> {label} ({photos.length})
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {photos.map((photo, i) => (
                        <img
                            key={i}
                            src={photo}
                            alt={`${label} ${i + 1}`}
                            style={{
                                width: 56, height: 56, objectFit: 'cover',
                                borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                                cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header__left">
                    <h1>Ordens de Serviço</h1>
                    <p>Gerencie todas as suas ordens de serviço</p>
                </div>
                <button className="btn btn-primary" onClick={() => {
                    const firstClient = clients[0]?.id || '';
                    const firstEq = equipments.find(e => e.clientId === firstClient)?.id || '';
                    setForm({ clientId: firstClient, equipmentId: firstEq, type: 'preventiva', description: '', technicianId: '', warrantyUntil: '' });
                    setPhotosBefore([]);
                    setPhotosAfter([]);
                    setShowModal(true);
                }}>
                    <Plus size={18} /> Nova OS
                </button>
            </div>

            <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                    {['all', 'aberta', 'em_progresso', 'aguardando_aprovacao', 'concluida'].map(f => (
                        <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)} style={{ fontSize: 'var(--text-xs)' }}>
                            {f === 'all' ? 'Todas' : (statusLabels as any)[f]}
                        </button>
                    ))}
                </div>

                <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input className="form-input" placeholder="Buscar ordens..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 'calc(var(--space-4) + 18px + var(--space-3))', width: '100%' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {filtered.map((order, i) => {
                        const eq = getEquipment(order.equipmentId);
                        const client = clients.find(c => c.id === eq?.clientId);
                        const isWarranty = order.warrantyUntil && new Date(order.warrantyUntil) > new Date();
                        const isExpanded = expandedOrder === order.id;
                        const hasPhotos = (order.photosBefore && order.photosBefore.length > 0) || (order.photosAfter && order.photosAfter.length > 0);

                        return (
                            <motion.div key={order.id} className="glass-card" style={{ padding: 'var(--space-5)', cursor: 'pointer' }} onClick={() => setViewingOrder(order)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'start', flex: 1 }}>
                                        <div style={{
                                            width: 42, height: 42, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            background: `${typeColors[order.type]}15`, color: typeColors[order.type]
                                        }}>
                                            {order.type === 'corretiva' ? <Wrench size={20} /> : <ClipboardList size={20} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{typeLabels[order.type]}</span>
                                                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>•</span>
                                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Building size={12} /> {client?.name} <span style={{ opacity: 0.5 }}>→</span> {eq?.name} ({eq?.qrCodeUid})
                                                </span>
                                                {isWarranty && (
                                                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                                                        <Shield size={10} /> Garantia
                                                    </span>
                                                )}
                                                {hasPhotos && (
                                                    <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                                                        <Camera size={10} /> Fotos
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-2)' }}>
                                                {order.description.slice(0, 150)}{order.description.length > 150 ? '...' : ''}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                                    <Calendar size={12} />
                                                    {new Date(order.date).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span>{getTechnicianName(order.technicianId)}</span>
                                                {order.nextMaintenanceDate && (
                                                    <span>Próxima: {new Date(order.nextMaintenanceDate).toLocaleDateString('pt-BR')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }} onClick={e => e.stopPropagation()}>
                                        {hasPhotos && (
                                            <button
                                                className="btn btn-ghost btn-icon"
                                                onClick={(e) => { e.stopPropagation(); setExpandedOrder(isExpanded ? null : order.id); }}
                                                style={{ padding: 'var(--space-1)' }}
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        )}
                                        {organization?.subscriptionPlan !== 'starter' && order.status === 'concluida' && (!order.photosAfter || order.photosAfter.length === 0) && (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={(e) => { e.stopPropagation(); setShowPhotoModal({ orderId: order.id, type: 'after' }); setAddingPhotos([]); }}
                                                style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
                                            >
                                                <Camera size={14} /> Fotos Depois
                                            </button>
                                        )}
                                        <span className={`badge ${order.status === 'concluida' ? 'badge-success' : order.status === 'em_progresso' ? 'badge-warning' : order.status === 'aguardando_aprovacao' ? 'badge-info' : 'badge-primary'}`}>
                                            {statusLabels[order.status]}
                                        </span>
                                        {order.status === 'aguardando_aprovacao' && (
                                            <button className="btn btn-primary" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
                                                onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'concluida'); }}>
                                                ✅ Aprovar
                                            </button>
                                        )}
                                        {order.status !== 'concluida' && order.status !== 'aguardando_aprovacao' && (
                                            <select
                                                className="form-input"
                                                value={order.status}
                                                onClick={e => e.stopPropagation()}
                                                onChange={e => { e.stopPropagation(); updateStatus(order.id, e.target.value as ServiceOrder['status']); }}
                                                style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)', width: 'auto' }}
                                            >
                                                <option value="aberta">Aberta</option>
                                                <option value="em_progresso">Em Progresso</option>
                                                <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                                                <option value="concluida">Concluída</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded photos section */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden', borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}
                                        >
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                                <div>
                                                    <PhotoThumbnails photos={order.photosBefore} label="📷 Antes do Serviço" />
                                                    {(!order.photosBefore || order.photosBefore.length === 0) && (
                                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem fotos do antes</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <PhotoThumbnails photos={order.photosAfter} label="✅ Depois do Serviço" />
                                                    {(!order.photosAfter || order.photosAfter.length === 0) && (
                                                        <div>
                                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 'var(--space-2)' }}>Sem fotos do depois</p>
                                                            {organization?.subscriptionPlan !== 'starter' && (
                                                                <button
                                                                    className="btn btn-secondary"
                                                                    onClick={() => { setShowPhotoModal({ orderId: order.id, type: 'after' }); setAddingPhotos([]); }}
                                                                    style={{ fontSize: 'var(--text-xs)' }}
                                                                >
                                                                    <Camera size={14} /> Adicionar Fotos
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Create OS Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
                            style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="modal__header">
                                <h2>Nova Ordem de Serviço</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>
                            <div className="modal__form">
                                <div className="form-group">
                                    <label className="form-label">Cliente (Empresa)</label>
                                    <select
                                        className="form-input"
                                        value={form.clientId}
                                        onChange={e => {
                                            const newClientId = e.target.value;
                                            const firstEqId = equipments.find(eq => eq.clientId === newClientId)?.id || '';
                                            setForm(p => ({ ...p, clientId: newClientId, equipmentId: firstEqId }));
                                        }}
                                    >
                                        <option value="" disabled>Selecione um cliente...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Equipamento</label>
                                    <select
                                        className="form-input"
                                        value={form.equipmentId}
                                        onChange={e => setForm(p => ({ ...p, equipmentId: e.target.value }))}
                                        disabled={!form.clientId || equipments.filter(e => e.clientId === form.clientId).length === 0}
                                    >
                                        <option value="" disabled>Selecione um equipamento...</option>
                                        {equipments.filter(e => e.clientId === form.clientId).map(e => (
                                            <option key={e.id} value={e.id}>{e.name} ({e.qrCodeUid})</option>
                                        ))}
                                    </select>
                                    {form.clientId && equipments.filter(e => e.clientId === form.clientId).length === 0 && (
                                        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>Este cliente não possui equipamentos cadastrados.</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tipo</label>
                                    <select className="form-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ServiceOrder['type'] }))}>
                                        <option value="preventiva">Preventiva</option>
                                        <option value="corretiva">Corretiva</option>
                                        <option value="instalacao">Instalação</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Técnico (Opcional)</label>
                                    <select
                                        className="form-input"
                                        value={form.technicianId}
                                        onChange={e => setForm(p => ({ ...p, technicianId: e.target.value }))}
                                    >
                                        <option value="">Sem técnico atribuído</option>
                                        {techniciansList.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    {techniciansList.length === 0 && (
                                        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <UserCog size={12} /> Nenhum técnico cadastrado. Cadastre em Técnicos.
                                        </p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Data de Garantia (Opcional)</label>
                                    <input className="form-input" type="date" value={form.warrantyUntil} onChange={e => setForm(p => ({ ...p, warrantyUntil: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Descrição</label>
                                    <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o serviço..." style={{ resize: 'vertical' }} />
                                </div>

                                {/* Photo Capture Sections */}
                                {organization?.subscriptionPlan !== 'starter' && (
                                    <>
                                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                                            <PhotoCapture
                                                label="Fotos ANTES do Serviço"
                                                photos={photosBefore}
                                                onChange={setPhotosBefore}
                                                maxPhotos={5}
                                            />
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
                                            <PhotoCapture
                                                label="Fotos DEPOIS do Serviço (opcional)"
                                                photos={photosAfter}
                                                onChange={setPhotosAfter}
                                                maxPhotos={5}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="modal__actions">
                                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={handleCreate}>Criar OS</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Photos After Modal */}
            <AnimatePresence>
                {showPhotoModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPhotoModal(null)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header">
                                <h2>Adicionar Fotos — Depois do Serviço</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowPhotoModal(null)}><X size={20} /></button>
                            </div>
                            <div className="modal__form">
                                <PhotoCapture
                                    label="Fotos do equipamento após o serviço"
                                    photos={addingPhotos}
                                    onChange={setAddingPhotos}
                                    maxPhotos={5}
                                />
                                <div className="modal__actions">
                                    <button className="btn btn-secondary" onClick={() => setShowPhotoModal(null)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={() => handleAddPhotosAfter(showPhotoModal.orderId)} disabled={addingPhotos.length === 0}>
                                        Salvar Fotos
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View OS Details Modal */}
            <AnimatePresence>
                {viewingOrder && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingOrder(null)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
                            style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="modal__header">
                                <h2>Detalhes da Ordem de Serviço</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setViewingOrder(null)}><X size={20} /></button>
                            </div>
                            <div className="modal__form">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                                    <div>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Status</p>
                                        <span className={`badge ${viewingOrder.status === 'concluida' ? 'badge-success' : viewingOrder.status === 'em_progresso' ? 'badge-warning' : viewingOrder.status === 'aguardando_aprovacao' ? 'badge-info' : 'badge-primary'}`}>
                                            {statusLabels[viewingOrder.status]}
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Tipo</p>
                                        <span style={{ fontWeight: 600 }}>{typeLabels[viewingOrder.type]}</span>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Data da OS</p>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} /> {new Date(viewingOrder.date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Técnico Responsável</p>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <UserCog size={14} style={{ color: 'var(--color-text-muted)' }} /> {getTechnicianName(viewingOrder.technicianId)}
                                        </span>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                                    <label className="form-label" style={{ color: 'var(--color-text-tertiary)' }}>Equipamento / Cliente</label>
                                    <div style={{ padding: 'var(--space-3)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                        {(() => {
                                            const eq = getEquipment(viewingOrder.equipmentId);
                                            const cli = clients.find(c => c.id === eq?.clientId);
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontWeight: 600 }}>{eq?.name || 'Desconhecido'}</span>
                                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Building size={12} /> {cli?.name || 'Cliente Desconhecido'}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                                    <label className="form-label" style={{ color: 'var(--color-text-tertiary)' }}>Descrição do Serviço</label>
                                    <div style={{ padding: 'var(--space-3)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                        <p style={{ margin: 0, fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>{viewingOrder.description}</p>
                                    </div>
                                </div>

                                {(viewingOrder.warrantyUntil || viewingOrder.nextMaintenanceDate) && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                                        {viewingOrder.warrantyUntil && (
                                            <div style={{ padding: 'var(--space-3)', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 'var(--radius-md)' }}>
                                                <p style={{ fontSize: 'var(--text-xs)', color: '#4ade80', marginBottom: 4, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Shield size={12} /> Garantia Até
                                                </p>
                                                <span style={{ fontWeight: 600, color: '#bbf7d0' }}>{viewingOrder.warrantyUntil ? new Date(viewingOrder.warrantyUntil).toLocaleDateString('pt-BR') : ''}</span>
                                            </div>
                                        )}
                                        {viewingOrder.nextMaintenanceDate && (
                                            <div style={{ padding: 'var(--space-3)', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 'var(--radius-md)' }}>
                                                <p style={{ fontSize: 'var(--text-xs)', color: '#7dd3fc', marginBottom: 4, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={12} /> Próx. Manutenção
                                                </p>
                                                <span style={{ fontWeight: 600, color: '#e0f2fe' }}>{viewingOrder.nextMaintenanceDate ? new Date(viewingOrder.nextMaintenanceDate).toLocaleDateString('pt-BR') : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {((viewingOrder.photosBefore && viewingOrder.photosBefore.length > 0) || (viewingOrder.photosAfter && viewingOrder.photosAfter.length > 0)) && (
                                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                                        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Fotos do Serviço</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                            <div>
                                                <PhotoThumbnails photos={viewingOrder.photosBefore} label="📷 Antes do Serviço" />
                                            </div>
                                            <div>
                                                <PhotoThumbnails photos={viewingOrder.photosAfter} label="✅ Depois do Serviço" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="modal__actions" style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
                                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setViewingOrder(null)}>Fechar Ficha</button>
                                    {organization?.subscriptionPlan !== 'starter' && (
                                        <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => handleSendToTechnician(viewingOrder)}>
                                            <Send size={16} /> Enviar para Técnico
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
