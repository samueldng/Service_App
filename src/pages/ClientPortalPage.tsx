import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode, Cpu, AlertCircle, MessageCircle, Building,
    Search, Wrench, Shield, ArrowUpRight, ClipboardList, X
} from 'lucide-react';
import { equipmentsApi, serviceOrdersApi, clientsApi, sectorsApi } from '../services/api';
import { mockOrganization } from '../data/mockData';
import type { Equipment, ServiceOrder, Client, Sector } from '../types';
import './PublicEquipmentPage.css'; // Reusing public page styles

export default function ClientPortalPage() {
    const { clientId } = useParams<{ clientId: string }>();
    const [client, setClient] = useState<Client | null>(null);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [orders, setOrders] = useState<Record<string, ServiceOrder[]>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
    const [repairDesc, setRepairDesc] = useState('');

    useEffect(() => {
        if (!clientId) return;
        const load = async () => {
            const cli = await clientsApi.getById(clientId);
            if (cli) {
                setClient(cli);
                const [eqs, secs] = await Promise.all([
                    equipmentsApi.getAll().then(all => all.filter(e => e.clientId === clientId)),
                    sectorsApi.getAll().then(all => all.filter(s => s.clientId === clientId))
                ]);
                setEquipments(eqs);
                setSectors(secs);

                // Fetch all recent orders for these equipments
                const allOrders = await serviceOrdersApi.getAll();
                const ordersMap: Record<string, ServiceOrder[]> = {};
                eqs.forEach(eq => {
                    ordersMap[eq.id] = allOrders.filter(o => o.equipmentId === eq.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                });
                setOrders(ordersMap);

                // Apply tenant's custom brand color
                if (mockOrganization.brandColor) {
                    document.documentElement.style.setProperty('--color-primary', mockOrganization.brandColor);
                    document.documentElement.style.setProperty('--color-accent-primary', mockOrganization.brandColor);
                }
            }
            setLoading(false);
        };
        load();
    }, [clientId]);

    if (loading) {
        return (
            <div className="public-page">
                <div className="public-page__loading">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <QrCode size={40} />
                    </motion.div>
                    <p>Carregando seu portal...</p>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="public-page">
                <div className="public-page__not-found">
                    <AlertCircle size={48} />
                    <h2>Cliente não encontrado</h2>
                    <p>Não foi possível localizar as informações deste cliente.</p>
                    <Link to="/" className="btn btn-primary">Voltar ao Início</Link>
                </div>
            </div>
        );
    }

    const filtered = equipments.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.qrCodeUid.toLowerCase().includes(search.toLowerCase())
    );

    const getSector = (id: string) => sectors.find(s => s.id === id);

    const handleRepairRequest = () => {
        if (!selectedEq) return;
        const sector = getSector(selectedEq.sectorId);
        const whatsappText = encodeURIComponent(
            `🔧 * Solicitação de Reparo *\n\n` +
            `* Cliente *: ${client.name} \n` +
            `* Equipamento *: ${selectedEq.name} (${selectedEq.brand}) \n` +
            `* ID *: ${selectedEq.qrCodeUid} \n` +
            `* Setor *: ${sector?.name || '-'} \n\n` +
            `* Descrição *: ${repairDesc} `
        );
        window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
        setSelectedEq(null);
        setRepairDesc('');
    };

    const shareWhatsApp = () => {
        const text = encodeURIComponent(
            `📱 *Portal de Equipamentos MaintQR*\n\n` +
            `Visão geral dos ativos de ${client.name}.\n\n` +
            `Acesse: ${window.location.href}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="public-page">
            <div className="public-page__bg">
                <div className="public-page__orb public-page__orb--1" />
                <div className="public-page__orb public-page__orb--2" />
            </div>

            <div className="public-page__container" style={{ maxWidth: '800px' }}>
                <motion.div className="public-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="public-header__brand">
                        {mockOrganization.logoUrl ? (
                            <img src={mockOrganization.logoUrl} alt="Logo" style={{ maxHeight: 24, objectFit: 'contain' }} />
                        ) : (
                            <QrCode size={20} />
                        )}
                        <span style={{ marginLeft: 8 }}>{mockOrganization.name}</span>
                    </div>
                </motion.div>

                {/* Client Header Info */}
                <motion.div className="public-card glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0 }}>{client.name}</h1>
                        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', margin: 0 }}>Portal de Ativos</p>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div className="public-status-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                    <div className="public-status-card glass-card">
                        <Cpu size={20} style={{ color: 'var(--color-cyan)' }} />
                        <div>
                            <div className="public-status-card__label">Equipamentos</div>
                            <div className="public-status-card__value">{equipments.length} Total</div>
                        </div>
                    </div>
                    <div className="public-status-card glass-card">
                        <ClipboardList size={20} style={{ color: 'var(--color-emerald)' }} />
                        <div>
                            <div className="public-status-card__label">Saúde da Frota</div>
                            <div className="public-status-card__value">
                                {equipments.length > 0 ? Math.round((equipments.filter(e => e.status === 'active').length / equipments.length) * 100) : 0}% Ativos
                            </div>
                        </div>
                    </div>
                    <div className="public-status-card glass-card">
                        <Shield size={20} style={{ color: 'var(--color-amber)' }} />
                        <div>
                            <div className="public-status-card__label">Garantias</div>
                            <div className="public-status-card__value">
                                {equipments.reduce((acc, eq) => {
                                    const hasWarranty = orders[eq.id]?.some(o => o.warrantyUntil && new Date(o.warrantyUntil) > new Date());
                                    return acc + (hasWarranty ? 1 : 0);
                                }, 0)}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Actions */}
                <motion.div className="public-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={{ marginBottom: 'var(--space-6)' }}>
                    <button className="btn btn-secondary btn-lg public-actions__btn" onClick={shareWhatsApp}>
                        <MessageCircle size={18} />
                        Compartilhar Portal
                    </button>
                </motion.div>

                {/* Equipments List */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Equipamentos ({equipments.length})</h2>
                        <div style={{ position: 'relative', width: '200px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input className="form-input" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '36px', width: '100%', padding: '8px 12px', fontSize: '13px' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {filtered.map(eq => {
                            const sector = getSector(eq.sectorId);
                            const lastOrder = orders[eq.id]?.[0];
                            return (
                                <div key={eq.id} className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{eq.name}</h3>
                                                <span className={`badge ${eq.status === 'active' ? 'badge-success' : eq.status === 'maintenance' ? 'badge-warning' : 'badge-danger'}`} style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}>
                                                    {eq.status === 'active' ? 'Ativos' : eq.status === 'maintenance' ? 'Manutenção' : 'Inativo'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                <span>{eq.brand} - {eq.model}</span>
                                                <span>•</span>
                                                <span style={{ fontFamily: 'monospace', color: 'var(--color-accent-primary)' }}>{eq.qrCodeUid}</span>
                                                <span>•</span>
                                                <span>{sector?.name}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Link to={`/e/${eq.qrCodeUid}`} className="btn btn-secondary btn-icon" title="Ver Histórico Completo">
                                                <ArrowUpRight size={16} />
                                            </Link>
                                            <button className="btn btn-primary btn-icon" onClick={() => setSelectedEq(eq)} title="Solicitar Reparo">
                                                <Wrench size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {lastOrder && (
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>Última Atividade:</span>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                                {lastOrder.type === 'preventiva' ? 'Preventiva' : 'Corretiva'} em {new Date(lastOrder.date).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                Nenhum equipamento encontrado.
                            </div>
                        )}
                    </div>
                </motion.div>

                <AnimatePresence>
                    {selectedEq && (
                        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEq(null)}>
                            <motion.div className="modal glass-card" style={{ maxWidth: '500px' }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                                <div className="modal__header">
                                    <h2>Solicitar Reparo</h2>
                                    <button className="btn btn-ghost btn-icon" onClick={() => setSelectedEq(null)}><X size={20} /></button>
                                </div>
                                <div className="modal__form" style={{ marginTop: '16px' }}>
                                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                                        <strong>Equipamento:</strong> {selectedEq.name} ({selectedEq.qrCodeUid})
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Descrição do Problema</label>
                                        <textarea
                                            className="form-input"
                                            rows={4}
                                            placeholder="Descreva o que está acontecendo (ex: não gela, barulho estranho, vazamento)..."
                                            value={repairDesc}
                                            onChange={e => setRepairDesc(e.target.value)}
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                    <div className="modal__actions">
                                        <button className="btn btn-secondary" onClick={() => setSelectedEq(null)}>Cancelar</button>
                                        <button className="btn btn-primary" onClick={handleRepairRequest}>
                                            <MessageCircle size={16} /> Enviar via WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="public-footer">
                    <p>Powered by <span className="text-gradient">{mockOrganization.name}</span></p>
                </div>
            </div>
        </div>
    );
}
