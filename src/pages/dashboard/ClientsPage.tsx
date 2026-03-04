import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Building, User, ExternalLink, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../../services/api';
import type { Client } from '../../types';

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Client | null>(null);
    const [form, setForm] = useState({ name: '', document: '', documentType: 'CNPJ' as 'CNPJ' | 'CPF', email: '', phone: '', address: '' });
    const navigate = useNavigate();

    const copyPortalLink = (id: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/portal/${id}`);
        alert('Link do Portal copiado!'); // Simple feedback
    };

    useEffect(() => { clientsApi.getAll().then(setClients).catch(console.error); }, []);

    const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.document.includes(search));

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', document: '', documentType: 'CNPJ' as const, email: '', phone: '', address: '' });
        setShowModal(true);
    };

    const openEdit = (client: Client) => {
        setEditing(client);
        setForm({ name: client.name, document: client.document, documentType: client.documentType, email: client.email, phone: client.phone, address: client.address });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                const updated = await clientsApi.update(editing.id, { ...form });
                setClients(prev => prev.map(c => c.id === editing.id ? updated : c));
            } else {
                const newClient = await clientsApi.create(form);
                setClients(prev => [...prev, newClient]);
            }
            setShowModal(false);
        } catch (error: any) {
            alert('Erro ao salvar cliente: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            await clientsApi.delete(id);
            setClients(prev => prev.filter(c => c.id !== id));
        }
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header__left">
                    <h1>Clientes</h1>
                    <p>Gerencie seus clientes e suas informações</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={18} />
                    Novo Cliente
                </button>
            </div>

            <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input className="form-input" placeholder="Buscar por nome ou documento..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 'calc(var(--space-4) + 18px + var(--space-3))', width: '100%' }} />
                </div>

                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Documento</th>
                                <th>Email</th>
                                <th>Telefone</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((client, i) => (
                                <motion.tr key={client.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                    <td data-label="Nome">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-lg)', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {client.documentType === 'CNPJ' ? <Building size={16} /> : <User size={16} />}
                                            </div>
                                            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{client.name}</span>
                                        </div>
                                    </td>
                                    <td data-label="Documento"><span className={`badge ${client.documentType === 'CNPJ' ? 'badge-primary' : 'badge-info'}`}>{client.document}</span></td>
                                    <td data-label="Email">{client.email}</td>
                                    <td data-label="Telefone">{client.phone}</td>
                                    <td data-label="Ações">
                                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                            <button className="btn btn-ghost btn-icon" onClick={() => navigate(`/dashboard/equipment?client=${client.id}`)} title="Ver Equipamentos"><ListChecks size={16} /></button>
                                            <button className="btn btn-ghost btn-icon" onClick={() => copyPortalLink(client.id)} title="Copiar Link do Portal do Cliente"><ExternalLink size={16} /></button>
                                            <button className="btn btn-ghost btn-icon" onClick={() => openEdit(client)} title="Editar"><Edit2 size={16} /></button>
                                            <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(client.id)} style={{ color: 'var(--color-rose)' }} title="Excluir"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header">
                                <h2>{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>
                            <div className="modal__form">
                                <div className="form-group">
                                    <label className="form-label">Nome</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do cliente" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Tipo</label>
                                        <select className="form-input" value={form.documentType} onChange={e => setForm(p => ({ ...p, documentType: e.target.value as 'CPF' | 'CNPJ' }))}>
                                            <option value="CNPJ">CNPJ</option>
                                            <option value="CPF">CPF</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Documento</label>
                                        <input className="form-input" value={form.document} onChange={e => setForm(p => ({ ...p, document: e.target.value }))} placeholder="00.000.000/0001-00" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefone</label>
                                        <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Endereço</label>
                                    <input className="form-input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Rua, número - Cidade/UF" />
                                </div>
                                <div className="modal__actions">
                                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Salvar' : 'Criar Cliente'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
