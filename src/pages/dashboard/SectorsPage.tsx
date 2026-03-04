import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, MapPin, ChevronRight } from 'lucide-react';
import { sectorsApi, clientsApi } from '../../services/api';
import type { Sector, Client } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export default function SectorsPage() {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Sector | null>(null);
    const [form, setForm] = useState({ name: '', clientId: '', description: '' });

    useEffect(() => {
        sectorsApi.getAll().then(setSectors);
        clientsApi.getAll().then(setClients);
    }, []);

    const filtered = sectors.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    const getClient = (id: string) => clients.find(c => c.id === id);

    const openCreate = () => { setEditing(null); setForm({ name: '', clientId: clients[0]?.id || '', description: '' }); setShowModal(true); };

    const openEdit = (sector: Sector) => {
        setEditing(sector);
        setForm({ name: sector.name, clientId: sector.clientId, description: sector.description || '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (editing) {
            const updated = await sectorsApi.update(editing.id, { ...form });
            setSectors(prev => prev.map(s => s.id === editing.id ? updated : s));
        } else {
            const newSector: Sector = { id: `sec-${uuidv4().slice(0, 8)}`, ...form, createdAt: new Date().toISOString().split('T')[0] };
            await sectorsApi.create(newSector);
            setSectors(prev => [...prev, newSector]);
        }
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza?')) { await sectorsApi.delete(id); setSectors(prev => prev.filter(s => s.id !== id)); }
    };

    // Group sectors by client
    const grouped = clients.map(client => ({
        client,
        sectors: filtered.filter(s => s.clientId === client.id),
    })).filter(g => g.sectors.length > 0);

    return (
        <div>
            <div className="page-header">
                <div className="page-header__left">
                    <h1>Setores</h1>
                    <p>Organize os equipamentos por localização</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Novo Setor</button>
            </div>

            <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ marginBottom: 'var(--space-6)', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input className="form-input" placeholder="Buscar setores..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 'calc(var(--space-4) + 18px + var(--space-3))', width: '100%' }} />
                </div>

                {grouped.map(({ client, sectors: secs }) => (
                    <div key={client.id} style={{ marginBottom: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <ChevronRight size={14} />
                            {client.name}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
                            {secs.map((sector, i) => (
                                <motion.div key={sector.id} className="glass-card" style={{ padding: 'var(--space-5)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'rgba(34, 211, 238, 0.12)', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <MapPin size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{sector.name}</div>
                                                {sector.description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{sector.description}</div>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                            <button className="btn btn-ghost btn-icon" onClick={() => openEdit(sector)}><Edit2 size={14} /></button>
                                            <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(sector.id)} style={{ color: 'var(--color-rose)' }}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header">
                                <h2>{editing ? 'Editar Setor' : 'Novo Setor'}</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>
                            <div className="modal__form">
                                <div className="form-group">
                                    <label className="form-label">Cliente</label>
                                    <select className="form-input" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nome do Setor</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Sala de Reunião, CPD, Bloco A" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Descrição</label>
                                    <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição do setor (opcional)" />
                                </div>
                                <div className="modal__actions">
                                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Salvar' : 'Criar Setor'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
