import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Building, User, ExternalLink, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../../services/api';
import { maskDocument, maskPhone } from '../../lib/masks';
import { filterUFs, getCitiesByUF, filterCities, type UF, type City } from '../../lib/locations';
import type { Client } from '../../types';

interface ClientForm {
    name: string;
    document: string;
    documentType: 'CPF' | 'CNPJ';
    email: string;
    phone: string;
    street: string;
    city: string;
    uf: string;
}

const emptyForm: ClientForm = { name: '', document: '', documentType: 'CNPJ', email: '', phone: '', street: '', city: '', uf: '' };

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Client | null>(null);
    const [form, setForm] = useState<ClientForm>({ ...emptyForm });
    const navigate = useNavigate();

    // UF autocomplete
    const [ufQuery, setUfQuery] = useState('');
    const [ufSuggestions, setUfSuggestions] = useState<UF[]>([]);
    const [showUfDropdown, setShowUfDropdown] = useState(false);
    const ufRef = useRef<HTMLDivElement>(null);

    // City autocomplete
    const [cityQuery, setCityQuery] = useState('');
    const [allCities, setAllCities] = useState<City[]>([]);
    const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const cityRef = useRef<HTMLDivElement>(null);

    const copyPortalLink = (id: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/portal/${id}`);
        alert('Link do Portal copiado!');
    };

    useEffect(() => { clientsApi.getAll().then(setClients).catch(console.error); }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ufRef.current && !ufRef.current.contains(e.target as Node)) setShowUfDropdown(false);
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) setShowCityDropdown(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Load cities when UF changes
    useEffect(() => {
        if (form.uf) {
            setLoadingCities(true);
            getCitiesByUF(form.uf).then(cities => {
                setAllCities(cities);
                setLoadingCities(false);
            });
        } else {
            setAllCities([]);
        }
    }, [form.uf]);

    const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.document.includes(search));

    const parseAddress = (address: string) => {
        if (!address) return { street: '', city: '', uf: '' };
        // Parse "Rua X, 123 - Cidade/UF" or "Rua X - UF" format
        const parts = address.split(' - ');
        const street = parts[0] || '';
        const cityUf = parts[1] || '';

        if (cityUf.includes('/')) {
            const cityUfParts = cityUf.split('/');
            return { street, city: cityUfParts[0]?.trim() || '', uf: cityUfParts[1]?.trim() || '' };
        }

        // No '/' separator — check if it's a bare UF abbreviation (2 letters)
        const trimmed = cityUf.trim();
        const knownUFs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
        if (trimmed.length === 2 && knownUFs.includes(trimmed.toUpperCase())) {
            return { street, city: '', uf: trimmed.toUpperCase() };
        }

        // Otherwise treat as city only
        return { street, city: trimmed, uf: '' };
    };

    const buildAddress = (street: string, city: string, uf: string) => {
        if (!street && !city && !uf) return '';
        const location = [city, uf].filter(Boolean).join('/');
        return [street, location].filter(Boolean).join(' - ');
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ ...emptyForm });
        setUfQuery('');
        setCityQuery('');
        setShowModal(true);
    };

    const openEdit = (client: Client) => {
        setEditing(client);
        const addr = parseAddress(client.address);
        setForm({
            name: client.name,
            document: client.document,
            documentType: client.documentType,
            email: client.email,
            phone: client.phone,
            street: addr.street,
            city: addr.city,
            uf: addr.uf,
        });
        setUfQuery(addr.uf);
        setCityQuery(addr.city);
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: form.name,
                document: form.document,
                documentType: form.documentType,
                email: form.email,
                phone: form.phone,
                address: buildAddress(form.street, form.city, form.uf),
            };
            if (editing) {
                const updated = await clientsApi.update(editing.id, payload);
                setClients(prev => prev.map(c => c.id === editing.id ? updated : c));
            } else {
                const newClient = await clientsApi.create(payload);
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

    // Mask handlers
    const handleDocumentChange = (value: string) => {
        setForm(p => ({ ...p, document: maskDocument(value, p.documentType) }));
    };

    const handleDocTypeChange = (type: 'CPF' | 'CNPJ') => {
        setForm(p => ({ ...p, documentType: type, document: maskDocument(p.document, type) }));
    };

    const handlePhoneChange = (value: string) => {
        setForm(p => ({ ...p, phone: maskPhone(value) }));
    };

    // UF autocomplete handlers
    const handleUfInput = (value: string) => {
        setUfQuery(value);
        setUfSuggestions(filterUFs(value));
        setShowUfDropdown(true);
        // If exact match with a known UF sigla, don't clear
        const exactMatch = filterUFs(value).find(uf => uf.sigla.toLowerCase() === value.toLowerCase());
        if (!exactMatch) {
            setForm(p => ({ ...p, uf: '', city: '' }));
            setCityQuery('');
            setAllCities([]);
        } else {
            // Auto-select exact match if the user typed it fully (e.g. "MA")
            if (form.uf !== exactMatch.sigla) {
                setForm(p => ({ ...p, uf: exactMatch.sigla, city: '' }));
                setCityQuery('');
            }
        }
    };

    const selectUF = (uf: UF) => {
        setForm(p => ({ ...p, uf: uf.sigla, city: '' }));
        setUfQuery(uf.sigla);
        setCityQuery('');
        setShowUfDropdown(false);
    };

    // City autocomplete handlers
    const handleCityInput = (value: string) => {
        setCityQuery(value);
        setCitySuggestions(filterCities(allCities, value).slice(0, 15));
        setShowCityDropdown(true);
    };

    const selectCity = (city: City) => {
        setForm(p => ({ ...p, city: city.nome }));
        setCityQuery(city.nome);
        setShowCityDropdown(false);
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
                                            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/clients/${client.id}`)}>{client.name}</span>
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
                                {/* Nome */}
                                <div className="form-group">
                                    <label className="form-label">Nome</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do cliente" />
                                </div>

                                {/* Tipo + Documento */}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Tipo</label>
                                        <select className="form-input" value={form.documentType} onChange={e => handleDocTypeChange(e.target.value as 'CPF' | 'CNPJ')}>
                                            <option value="CNPJ">CNPJ</option>
                                            <option value="CPF">CPF</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{form.documentType}</label>
                                        <input
                                            className="form-input"
                                            value={form.document}
                                            onChange={e => handleDocumentChange(e.target.value)}
                                            placeholder={form.documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0001-00'}
                                            maxLength={form.documentType === 'CPF' ? 14 : 18}
                                        />
                                    </div>
                                </div>

                                {/* Email + Telefone */}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefone</label>
                                        <input
                                            className="form-input"
                                            value={form.phone}
                                            onChange={e => handlePhoneChange(e.target.value)}
                                            placeholder="(00) 00000-0000"
                                            maxLength={15}
                                        />
                                    </div>
                                </div>

                                {/* Endereço: Rua + Número */}
                                <div className="form-group">
                                    <label className="form-label">Rua e Número</label>
                                    <input className="form-input" value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} placeholder="Ex: Rua das Flores, 123" />
                                </div>

                                {/* UF + Cidade */}
                                <div className="form-grid">
                                    <div className="form-group" ref={ufRef} style={{ position: 'relative' }}>
                                        <label className="form-label">UF</label>
                                        <input
                                            className="form-input"
                                            value={ufQuery}
                                            onChange={e => handleUfInput(e.target.value)}
                                            onFocus={() => { setUfSuggestions(filterUFs(ufQuery)); setShowUfDropdown(true); }}
                                            placeholder="Digite UF..."
                                            autoComplete="off"
                                        />
                                        {showUfDropdown && ufSuggestions.length > 0 && (
                                            <div className="autocomplete-dropdown">
                                                {ufSuggestions.map(uf => (
                                                    <div
                                                        key={uf.sigla}
                                                        className={`autocomplete-item ${form.uf === uf.sigla ? 'autocomplete-item--active' : ''}`}
                                                        onClick={() => selectUF(uf)}
                                                    >
                                                        <strong>{uf.sigla}</strong> — {uf.nome}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group" ref={cityRef} style={{ position: 'relative' }}>
                                        <label className="form-label">Cidade</label>
                                        <input
                                            className="form-input"
                                            value={cityQuery}
                                            onChange={e => handleCityInput(e.target.value)}
                                            onFocus={() => { if (allCities.length > 0) { setCitySuggestions(filterCities(allCities, cityQuery).slice(0, 15)); setShowCityDropdown(true); } }}
                                            placeholder={!form.uf ? 'Selecione UF primeiro' : loadingCities ? 'Carregando cidades...' : 'Digite a cidade...'}
                                            disabled={!form.uf}
                                            autoComplete="off"
                                        />
                                        {showCityDropdown && citySuggestions.length > 0 && (
                                            <div className="autocomplete-dropdown">
                                                {citySuggestions.map(city => (
                                                    <div
                                                        key={city.nome}
                                                        className={`autocomplete-item ${form.city === city.nome ? 'autocomplete-item--active' : ''}`}
                                                        onClick={() => selectCity(city)}
                                                    >
                                                        {city.nome}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
