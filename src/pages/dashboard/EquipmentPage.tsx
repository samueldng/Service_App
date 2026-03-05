import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Cpu, QrCode, Printer, Copy, ExternalLink } from 'lucide-react';
import { equipmentsApi, sectorsApi, clientsApi } from '../../services/api';
import type { Equipment, Sector, Client } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams } from 'react-router-dom';

export default function EquipmentPage() {
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const clientFilter = searchParams.get('client');

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Equipment | null>(null);
    const [viewing, setViewing] = useState<Equipment | null>(null);
    const [form, setForm] = useState({ name: '', brand: '', model: '', serialNumber: '', btus: '', sectorId: '', clientId: '', details: '' });

    useEffect(() => {
        equipmentsApi.getAll().then(setEquipments);
        sectorsApi.getAll().then(setSectors);
        clientsApi.getAll().then(setClients);
    }, []);

    const filtered = equipments
        .filter(e => !clientFilter || e.clientId === clientFilter)
        .filter(e =>
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.brand.toLowerCase().includes(search.toLowerCase()) ||
            e.qrCodeUid.toLowerCase().includes(search.toLowerCase())
        );

    const getSector = (id: string) => sectors.find(s => s.id === id);
    const getClient = (id: string) => clients.find(c => c.id === id);
    const getUrl = (uid: string) => `${window.location.origin}/e/${uid}`;

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', brand: '', model: '', serialNumber: '', btus: '', sectorId: sectors[0]?.id || '', clientId: clientFilter || clients[0]?.id || '', details: '' });
        setShowModal(true);
    };

    const openEdit = (eq: Equipment) => {
        setEditing(eq);
        setForm({ name: eq.name, brand: eq.brand, model: eq.model, serialNumber: eq.serialNumber, btus: eq.btus?.toString() || '', sectorId: eq.sectorId, clientId: eq.clientId, details: eq.details || '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (editing) {
            const updated = await equipmentsApi.update(editing.id, {
                ...form, btus: form.btus ? parseInt(form.btus) : undefined,
            });
            setEquipments(prev => prev.map(e => e.id === editing.id ? updated : e));
        } else {
            const uid = `MQR-${uuidv4().slice(0, 6).toUpperCase()}`;
            const newEq: Equipment = {
                id: `eq-${uuidv4().slice(0, 8)}`, ...form,
                btus: form.btus ? parseInt(form.btus) : undefined,
                qrCodeUid: uid, installDate: new Date().toISOString().split('T')[0],
                status: 'active', createdAt: new Date().toISOString().split('T')[0],
            };
            await equipmentsApi.create(newEq);
            setEquipments(prev => [...prev, newEq]);
        }
        setShowModal(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Excluir equipamento?')) { await equipmentsApi.delete(id); setEquipments(prev => prev.filter(e => e.id !== id)); setViewing(null); }
    };

    const printQR = async (eq: Equipment) => {
        let companyName = 'Empresa Prestadora';
        try {
            const org = await import('../../services/api').then(m => m.organizationsApi.get());
            if (org && org.name) {
                companyName = org.name;
            }
        } catch (e) {
            console.error('Failed to fetch org name for label', e);
        }

        // Use a more reliable QR code generator API that returns an image directly
        // Google Charts API reliably returns a PNG that can be printed
        const qrUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(getUrl(eq.qrCodeUid))}&choe=UTF-8`;

        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta QR Code - ${eq.qrCodeUid}</title>
        <style>
          @page { margin: 0; size: 58mm auto; }
          body { 
            font-family: 'Inter', sans-serif; 
            text-align: center; 
            margin: 0; 
            padding: 2mm; 
            width: 54mm; /* Total 58mm minus padding */
            color: #000;
          }
          .qr-label { 
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .qr-label h3 { 
            margin: 0 0 2mm 0; 
            font-size: 11px; 
            font-weight: bold;
            line-height: 1.2;
            word-wrap: break-word;
            max-width: 100%;
          }
          .qr-image {
            width: 35mm;
            height: 35mm;
            margin-bottom: 2mm;
          }
          .company-name { 
            font-size: 10px; 
            font-weight: bold; 
            margin: 0;
            line-height: 1.2;
            border-top: 1px dashed #000;
            padding-top: 2mm;
            width: 100%;
          }
          .uid {
            font-family: monospace;
            font-size: 8px;
            margin-top: 1mm;
          }
        </style>
      </head>
      <body>
        <div class="qr-label">
          <h3>${eq.name}</h3>
          <img src="${qrUrl}" class="qr-image" alt="QR Code" onload="window.print(); setTimeout(() => window.close(), 500);" />
          <div class="company-name">${companyName}</div>
          <div class="uid">${eq.qrCodeUid}</div>
        </div>
      </body>
      </html>
    `);
        win.document.close();
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header__left">
                    <h1>Equipamentos {clientFilter && `- ${getClient(clientFilter)?.name}`}</h1>
                    <p>Inventário completo dos seus ativos</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    {clientFilter && (
                        <button className="btn btn-secondary" onClick={() => setSearchParams({})}>
                            Mostrar Todos
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Novo Equipamento</button>
                </div>
            </div>

            <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input className="form-input" placeholder="Buscar por nome, marca ou QR Code..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 'calc(var(--space-4) + 18px + var(--space-3))', width: '100%' }} />
                </div>

                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Equipamento</th>
                                <th>QR Code</th>
                                <th>Setor</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((eq, i) => {
                                const sector = getSector(eq.sectorId);
                                const client = getClient(eq.clientId);
                                return (
                                    <motion.tr key={eq.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                        <td data-label="Equipamento">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-lg)', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Cpu size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)' }}>{eq.name}</div>
                                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{eq.brand} {eq.model}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="QR Code"><span className="badge badge-primary" style={{ fontFamily: 'monospace' }}>{eq.qrCodeUid}</span></td>
                                        <td data-label="Setor / Cliente">
                                            <div style={{ fontSize: 'var(--text-sm)' }}>{sector?.name}</div>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{client?.name}</div>
                                        </td>
                                        <td data-label="Status">
                                            <span className={`badge ${eq.status === 'active' ? 'badge-success' : eq.status === 'maintenance' ? 'badge-warning' : 'badge-danger'}`}>
                                                {eq.status === 'active' ? 'Ativo' : eq.status === 'maintenance' ? 'Manutenção' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td data-label="Ações">
                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                <button className="btn btn-ghost btn-icon" onClick={() => setViewing(eq)} title="Visualizar Detalhes & QR Code"><QrCode size={16} /></button>
                                                <button className="btn btn-ghost btn-icon" onClick={() => openEdit(eq)} title="Editar"><Edit2 size={16} /></button>
                                                <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(eq.id)} style={{ color: 'var(--color-rose)' }} title="Excluir"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {/* Create/Edit Modal */}
                {showModal && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header">
                                <h2>{editing ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                            </div>
                            <div className="modal__form">
                                <div className="form-group">
                                    <label className="form-label">Nome</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Split Hi-Wall Inverter" />
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Marca</label>
                                        <input className="form-input" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="Daikin" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Modelo</label>
                                        <input className="form-input" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="FTKC60TV16U" />
                                    </div>
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Nº Série</label>
                                        <input className="form-input" value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">BTUs</label>
                                        <input className="form-input" type="number" value={form.btus} onChange={e => setForm(p => ({ ...p, btus: e.target.value }))} placeholder="12000" />
                                    </div>
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Cliente</label>
                                        <select className="form-input" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Setor</label>
                                        <select className="form-input" value={form.sectorId} onChange={e => setForm(p => ({ ...p, sectorId: e.target.value }))}>
                                            {sectors.filter(s => s.clientId === form.clientId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Detalhes</label>
                                    <input className="form-input" value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))} placeholder="Observações adicionais" />
                                </div>
                                <div className="modal__actions">
                                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Salvar' : 'Criar Equipamento'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Viewing / QR Code Modal */}
                {viewing && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewing(null)}>
                        <motion.div className="modal glass-card" style={{ maxWidth: '600px' }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header">
                                <h2>Detalhes e QR Code</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setViewing(null)}><X size={20} /></button>
                            </div>

                            <div className="details-grid">
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ background: 'white', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', display: 'inline-block', marginBottom: 'var(--space-4)' }}>
                                        <QRCodeSVG value={getUrl(viewing.qrCodeUid)} size={150} />
                                    </div>
                                    <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--color-accent-primary)', marginBottom: 'var(--space-3)' }}>{viewing.qrCodeUid}</div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                        <button className="btn btn-primary" onClick={() => printQR(viewing)}>
                                            <Printer size={16} /> Imprimir Etiqueta
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(getUrl(viewing.qrCodeUid))}>
                                            <Copy size={16} /> Copiar Link
                                        </button>
                                        <a href={getUrl(viewing.qrCodeUid)} target="_blank" rel="noopener" className="btn btn-secondary">
                                            <ExternalLink size={16} /> Abrir Portal
                                        </a>
                                    </div>
                                </div>

                                <div>
                                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{viewing.name}</h3>
                                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-6)' }}>{viewing.brand} {viewing.model}</div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>Setor</span>
                                            <span>{getSector(viewing.sectorId)?.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>Cliente</span>
                                            <span>{getClient(viewing.clientId)?.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>Nº Série</span>
                                            <span>{viewing.serialNumber}</span>
                                        </div>
                                        {viewing.btus && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--color-text-tertiary)' }}>BTUs</span>
                                                <span>{viewing.btus.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>Instalação</span>
                                            <span>{new Date(viewing.installDate).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>Status</span>
                                            <span className={`badge ${viewing.status === 'active' ? 'badge-success' : viewing.status === 'maintenance' ? 'badge-warning' : 'badge-danger'}`}>
                                                {viewing.status === 'active' ? 'Ativo' : viewing.status === 'maintenance' ? 'Manutenção' : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
