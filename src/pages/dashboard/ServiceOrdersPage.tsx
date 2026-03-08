import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, ClipboardList, Calendar, Wrench, Shield, Building, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { serviceOrdersApi, equipmentsApi, clientsApi } from '../../services/api';
import type { ServiceOrder, Equipment, Client } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import PhotoCapture from '../../components/PhotoCapture';

export default function ServiceOrdersPage() {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [photosBefore, setPhotosBefore] = useState<string[]>([]);
    const [photosAfter, setPhotosAfter] = useState<string[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [showPhotoModal, setShowPhotoModal] = useState<{ orderId: string; type: 'before' | 'after' } | null>(null);
    const [addingPhotos, setAddingPhotos] = useState<string[]>([]);
    const [form, setForm] = useState<{ clientId: string, equipmentId: string, type: ServiceOrder['type'], description: string, technicianName: string, warrantyUntil: string }>({ clientId: '', equipmentId: '', type: 'preventiva', description: '', technicianName: 'Carlos Mendes', warrantyUntil: '' });

    useEffect(() => {
        serviceOrdersApi.getAll().then(setOrders);
        equipmentsApi.getAll().then(setEquipments);
        clientsApi.getAll().then(setClients);
    }, []);

    const getEquipment = (id: string) => equipments.find(e => e.id === id);

    const filtered = orders
        .filter(o => filter === 'all' || o.status === filter)
        .filter(o => {
            const eq = getEquipment(o.equipmentId);
            return o.description.toLowerCase().includes(search.toLowerCase()) ||
                eq?.name.toLowerCase().includes(search.toLowerCase()) || false;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleCreate = async () => {
        if (!form.equipmentId) return;

        const newOrder: ServiceOrder = {
            id: `os-${uuidv4().slice(0, 8)}`,
            equipmentId: form.equipmentId,
            type: form.type,
            description: form.description,
            technicianName: form.technicianName,
            date: new Date().toISOString().split('T')[0],
            status: 'aberta',
            createdAt: new Date().toISOString().split('T')[0],
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

    const statusLabels = { aberta: 'Aberta', em_progresso: 'Em Progresso', concluida: 'Concluída' };
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
                    setForm({ clientId: firstClient, equipmentId: firstEq, type: 'preventiva', description: '', technicianName: 'Carlos Mendes', warrantyUntil: '' });
                    setPhotosBefore([]);
                    setPhotosAfter([]);
                    setShowModal(true);
                }}>
                    <Plus size={18} /> Nova OS
                </button>
            </div>

            <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                    {['all', 'aberta', 'em_progresso', 'concluida'].map(f => (
                        <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)} style={{ fontSize: 'var(--text-xs)' }}>
                            {f === 'all' ? 'Todas' : statusLabels[f as keyof typeof statusLabels]}
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
                            <motion.div key={order.id} className="glass-card" style={{ padding: 'var(--space-5)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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
                                                <span>{order.technicianName}</span>
                                                {order.nextMaintenanceDate && (
                                                    <span>Próxima: {new Date(order.nextMaintenanceDate).toLocaleDateString('pt-BR')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        {hasPhotos && (
                                            <button
                                                className="btn btn-ghost btn-icon"
                                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                style={{ padding: 'var(--space-1)' }}
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        )}
                                        {order.status === 'concluida' && (!order.photosAfter || order.photosAfter.length === 0) && (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => { setShowPhotoModal({ orderId: order.id, type: 'after' }); setAddingPhotos([]); }}
                                                style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}
                                            >
                                                <Camera size={14} /> Fotos Depois
                                            </button>
                                        )}
                                        <span className={`badge ${order.status === 'concluida' ? 'badge-success' : order.status === 'em_progresso' ? 'badge-warning' : 'badge-primary'}`}>
                                            {statusLabels[order.status]}
                                        </span>
                                        {order.status !== 'concluida' && (
                                            <select
                                                className="form-input"
                                                value={order.status}
                                                onChange={e => updateStatus(order.id, e.target.value as ServiceOrder['status'])}
                                                style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)', width: 'auto' }}
                                            >
                                                <option value="aberta">Aberta</option>
                                                <option value="em_progresso">Em Progresso</option>
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
                                                            <button
                                                                className="btn btn-secondary"
                                                                onClick={() => { setShowPhotoModal({ orderId: order.id, type: 'after' }); setAddingPhotos([]); }}
                                                                style={{ fontSize: 'var(--text-xs)' }}
                                                            >
                                                                <Camera size={14} /> Adicionar Fotos
                                                            </button>
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
                                    <label className="form-label">Técnico</label>
                                    <input className="form-input" value={form.technicianName} onChange={e => setForm(p => ({ ...p, technicianName: e.target.value }))} />
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
        </div>
    );
}
