import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Wrench, Shield, CheckCircle, Clock, QrCode, AlertCircle, Cpu, ClipboardList, MessageCircle, Camera, X } from 'lucide-react';
import { equipmentsApi } from '../services/api';
import type { Equipment, ServiceOrder, Client, Sector } from '../types';
import './PublicEquipmentPage.css';

export default function PublicEquipmentPage() {
    const { qrCodeUid } = useParams<{ qrCodeUid: string }>();
    const [equipment, setEquipment] = useState<Equipment | null>(null);
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [client, setClient] = useState<Client | null>(null);
    const [sector, setSector] = useState<Sector | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRepairForm, setShowRepairForm] = useState(false);
    const [repairDesc, setRepairDesc] = useState('');
    const [lightboxImg, setLightboxImg] = useState<string | null>(null);

    useEffect(() => {
        if (!qrCodeUid) return;
        const load = async () => {
            try {
                const data = await equipmentsApi.getPublicTrackingData(qrCodeUid);
                if (data.equipment) {
                    setEquipment(data.equipment);
                    if (data.client) setClient(data.client);
                    if (data.sector) setSector(data.sector);
                    setOrders(data.orders || []);
                }
            } catch (err) {
                console.error("Erro ao carregar dados do equipamento:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [qrCodeUid]);

    if (loading) {
        return (
            <div className="public-page">
                <div className="public-page__loading">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <QrCode size={40} />
                    </motion.div>
                    <p>Carregando informações...</p>
                </div>
            </div>
        );
    }

    if (!equipment) {
        return (
            <div className="public-page">
                <div className="public-page__not-found">
                    <AlertCircle size={48} />
                    <h2>Equipamento não encontrado</h2>
                    <p>O código QR "{qrCodeUid}" não corresponde a nenhum equipamento registrado.</p>
                    <Link to="/" className="btn btn-primary">Voltar ao Início</Link>
                </div>
            </div>
        );
    }

    const lastOrder = orders.find(o => o.status === 'concluida');
    const nextMaint = orders.find(o => o.nextMaintenanceDate);
    const activeWarranty = orders.find(o => o.warrantyUntil && new Date(o.warrantyUntil) > new Date());

    const daysUntilNext = nextMaint?.nextMaintenanceDate
        ? Math.ceil((new Date(nextMaint.nextMaintenanceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const handleRepairRequest = () => {
        const whatsappText = encodeURIComponent(
            `🔧 Solicitação de Reparo\n\nEquipamento: ${equipment.name} \nCódigo: ${equipment.qrCodeUid} \nSetor: ${sector?.name || '-'} \n\nDescrição: ${repairDesc} `
        );
        window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
        setShowRepairForm(false);
        setRepairDesc('');
    };

    const shareWhatsApp = () => {
        const text = encodeURIComponent(
            `📱 Status do Equipamento\n\n${equipment.name} (${equipment.qrCodeUid})\n${lastOrder ? `✅ Última manutenção: ${new Date(lastOrder.date).toLocaleDateString('pt-BR')}` : ''}\n${nextMaint?.nextMaintenanceDate ? `📅 Próxima: ${new Date(nextMaint.nextMaintenanceDate).toLocaleDateString('pt-BR')}` : ''}\n\nVeja mais: ${window.location.href}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="public-page">
            <div className="public-page__bg">
                <div className="public-page__orb public-page__orb--1" />
                <div className="public-page__orb public-page__orb--2" />
            </div>

            <div className="public-page__container">
                <motion.div className="public-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="public-header__brand">
                        <QrCode size={20} />
                        <span>Maint<span className="text-gradient">QR</span></span>
                    </div>
                </motion.div>

                {/* Equipment Info Card */}
                <motion.div className="public-card glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                    <div className="public-card__equipment">
                        <div className="public-card__icon-large">
                            <Cpu size={28} />
                        </div>
                        <h1 className="public-card__name">{equipment.name}</h1>
                        <p className="public-card__brand">{equipment.brand} {equipment.model}</p>
                        <div className="public-card__badges">
                            <span className={`badge ${equipment.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                {equipment.status === 'active' ? 'Ativo' : 'Em Manutenção'}
                            </span>
                            {activeWarranty && (
                                <span className="badge badge-info">
                                    <Shield size={10} /> Garantia até {new Date(activeWarranty.warrantyUntil!).toLocaleDateString('pt-BR')}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="public-card__details">
                        <div className="public-card__detail-row">
                            <span>Código</span>
                            <span className="mono">{equipment.qrCodeUid}</span>
                        </div>
                        {equipment.btus && (
                            <div className="public-card__detail-row">
                                <span>Capacidade</span>
                                <span>{equipment.btus.toLocaleString()} BTUs</span>
                            </div>
                        )}
                        <div className="public-card__detail-row">
                            <span>Nº Série</span>
                            <span>{equipment.serialNumber}</span>
                        </div>
                        <div className="public-card__detail-row">
                            <span>Local</span>
                            <span>{sector?.name} — {client?.name}</span>
                        </div>
                        <div className="public-card__detail-row">
                            <span>Instalação</span>
                            <span>{new Date(equipment.installDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Status Cards */}
                <motion.div className="public-status-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                    {lastOrder && (
                        <div className="public-status-card glass-card">
                            <CheckCircle size={20} style={{ color: 'var(--color-emerald)' }} />
                            <div>
                                <div className="public-status-card__label">Última Manutenção</div>
                                <div className="public-status-card__value">{new Date(lastOrder.date).toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>
                    )}
                    {nextMaint?.nextMaintenanceDate && (
                        <div className="public-status-card glass-card">
                            <Calendar size={20} style={{ color: 'var(--color-accent-primary)' }} />
                            <div>
                                <div className="public-status-card__label">Próxima Manutenção</div>
                                <div className="public-status-card__value">{new Date(nextMaint.nextMaintenanceDate).toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>
                    )}
                    {daysUntilNext !== null && (
                        <div className="public-status-card glass-card">
                            <Clock size={20} style={{ color: daysUntilNext < 30 ? 'var(--color-amber)' : 'var(--color-cyan)' }} />
                            <div>
                                <div className="public-status-card__label">Faltam</div>
                                <div className="public-status-card__value">{daysUntilNext > 0 ? `${daysUntilNext} dias` : 'Agendada!'}</div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Service Timeline */}
                <motion.div className="public-timeline glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                    <h2 className="public-timeline__title">
                        <ClipboardList size={20} />
                        Histórico de Serviços
                    </h2>
                    <div className="public-timeline__list">
                        {orders.map((order, i) => (
                            <motion.div
                                key={order.id}
                                className="public-timeline__item"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                            >
                                <div className={`public-timeline__dot public-timeline__dot--${order.type}`} />
                                <div className="public-timeline__content">
                                    <div className="public-timeline__header">
                                        <span className={`badge ${order.type === 'preventiva' ? 'badge-primary' : order.type === 'corretiva' ? 'badge-danger' : 'badge-info'}`}>
                                            {order.type === 'preventiva' ? 'Preventiva' : order.type === 'corretiva' ? 'Corretiva' : 'Instalação'}
                                        </span>
                                        <span className="public-timeline__date">{new Date(order.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <p className="public-timeline__desc">{order.description}</p>
                                    {/* Before/After Photos */}
                                    {((order.photosBefore && order.photosBefore.length > 0) || (order.photosAfter && order.photosAfter.length > 0)) && (
                                        <div className="public-timeline__photos">
                                            {order.photosBefore && order.photosBefore.length > 0 && (
                                                <div className="public-timeline__photo-group">
                                                    <span className="public-timeline__photo-label">
                                                        <Camera size={10} /> Antes
                                                    </span>
                                                    <div className="public-timeline__photo-grid">
                                                        {order.photosBefore.map((photo, pi) => (
                                                            <img
                                                                key={`before-${pi}`}
                                                                src={photo}
                                                                alt={`Antes ${pi + 1}`}
                                                                className="public-timeline__photo"
                                                                onClick={() => setLightboxImg(photo)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {order.photosAfter && order.photosAfter.length > 0 && (
                                                <div className="public-timeline__photo-group">
                                                    <span className="public-timeline__photo-label public-timeline__photo-label--after">
                                                        <CheckCircle size={10} /> Depois
                                                    </span>
                                                    <div className="public-timeline__photo-grid">
                                                        {order.photosAfter.map((photo, pi) => (
                                                            <img
                                                                key={`after-${pi}`}
                                                                src={photo}
                                                                alt={`Depois ${pi + 1}`}
                                                                className="public-timeline__photo"
                                                                onClick={() => setLightboxImg(photo)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="public-timeline__meta">
                                        <span>Técnico: {order.technicianName}</span>
                                        {order.warrantyUntil && (
                                            <span className={new Date(order.warrantyUntil) > new Date() ? 'active-warranty' : ''}>
                                                <Shield size={12} /> Garantia: {new Date(order.warrantyUntil).toLocaleDateString('pt-BR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Actions */}
                <motion.div className="public-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
                    <button className="btn btn-primary btn-lg public-actions__btn" onClick={() => setShowRepairForm(!showRepairForm)}>
                        <Wrench size={18} />
                        Solicitar Reparo
                    </button>
                    <button className="btn btn-secondary btn-lg public-actions__btn" onClick={shareWhatsApp}>
                        <MessageCircle size={18} />
                        Compartilhar via WhatsApp
                    </button>
                </motion.div>

                {showRepairForm && (
                    <motion.div className="public-repair glass-card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <h3 style={{ marginBottom: 'var(--space-4)' }}>Solicitar Reparo</h3>
                        <textarea
                            className="form-input"
                            rows={3}
                            placeholder="Descreva o problema..."
                            value={repairDesc}
                            onChange={e => setRepairDesc(e.target.value)}
                            style={{ width: '100%', resize: 'vertical', marginBottom: 'var(--space-4)' }}
                        />
                        <button className="btn btn-primary" onClick={handleRepairRequest} style={{ width: '100%' }}>
                            <MessageCircle size={16} /> Enviar via WhatsApp
                        </button>
                    </motion.div>
                )}

                <div className="public-footer">
                    <p>Powered by <span className="text-gradient">MaintQR</span></p>
                </div>
            </div>

            {/* Photo Lightbox */}
            {lightboxImg && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setLightboxImg(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.9)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                >
                    <button
                        onClick={() => setLightboxImg(null)}
                        style={{
                            position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)',
                            border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={lightboxImg}
                        alt="Foto ampliada"
                        style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 'var(--radius-lg)', objectFit: 'contain' }}
                    />
                </motion.div>
            )}
        </div>
    );
}
