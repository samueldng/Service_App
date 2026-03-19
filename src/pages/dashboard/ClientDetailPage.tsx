import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, User, CreditCard, ShoppingCart, Plus, Search, X,
    Package, Wrench, Trash2, FileText, BookOpen, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi, equipmentsApi, catalogApi, ordersApi, organizationsApi } from '../../services/api';
import type { Client, Equipment, CatalogItem, Order } from '../../types';
import { jsPDF } from 'jspdf';
import './ClientDetailPage.css';

type TabKey = 'info' | 'payments' | 'orders';

interface LocalOrderItem {
    catalogItemId?: string;
    name: string;
    type: 'peca' | 'servico';
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export default function ClientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabKey>('orders');

    const [client, setClient] = useState<Client | null>(null);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Order detail / action state
    const [actionOrderId, setActionOrderId] = useState<string | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // New Order state
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
    const [defect, setDefect] = useState('');
    const [observations, setObservations] = useState('');
    const [orderItems, setOrderItems] = useState<LocalOrderItem[]>([]);
    const [discount, setDiscount] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [warranty, setWarranty] = useState('');
    const [saving, setSaving] = useState(false);

    // Catalog state
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [showCatalog, setShowCatalog] = useState(false);
    const [showCatalogForm, setShowCatalogForm] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [newCatalogName, setNewCatalogName] = useState('');
    const [newCatalogType, setNewCatalogType] = useState<'peca' | 'servico'>('servico');
    const [newCatalogPrice, setNewCatalogPrice] = useState('');

    useEffect(() => {
        if (!id) return;
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Load client first (critical)
            const clientData = await clientsApi.getById(id!);
            setClient(clientData);

            // Load the rest independently — failures won't crash the page
            equipmentsApi.getAll()
                .then(eqData => setEquipments(eqData.filter((e: Equipment) => e.clientId === id)))
                .catch(() => { });

            ordersApi.getByClient(id!)
                .then(data => setOrders(data))
                .catch(() => { });

            catalogApi.getAll()
                .then(data => setCatalogItems(data))
                .catch(() => { });
        } catch (err: any) {
            toast.error(err.message || 'Erro ao carregar cliente');
        } finally {
            setLoading(false);
        }
    };

    // Computed
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = Math.max(0, subtotal - discount + deliveryFee);

    const selectedEquipment = equipments.find(e => e.id === selectedEquipmentId);

    const filteredCatalog = catalogItems.filter(item =>
        item.name.toLowerCase().includes(catalogSearch.toLowerCase())
    );

    const statusLabel: Record<string, string> = {
        pendente: 'Pendente', aprovado: 'Aprovado',
        em_andamento: 'Em Andamento', concluido: 'Concluído', cancelado: 'Cancelado',
    };
    const statusBadge: Record<string, string> = {
        pendente: 'badge-warning', aprovado: 'badge-info',
        em_andamento: 'badge-primary', concluido: 'badge-success', cancelado: 'badge-danger',
    };

    // Handlers

    const openNewOrder = () => {
        setSelectedEquipmentId(equipments[0]?.id || '');
        setDefect('');
        setObservations('');
        setOrderItems([]);
        setDiscount(0);
        setDeliveryFee(0);
        setPaymentMethod('');
        setWarranty('');
        setShowOrderForm(true);
    };

    const addCatalogItem = (item: CatalogItem) => {
        setOrderItems(prev => [...prev, {
            catalogItemId: item.id,
            name: item.name,
            type: item.type,
            quantity: 1,
            unitPrice: item.defaultPrice,
            totalPrice: item.defaultPrice,
        }]);
        setShowCatalog(false);
        toast.success(`${item.name} adicionado`);
    };

    const updateItemQuantity = (index: number, quantity: number) => {
        if (quantity < 1) return;
        setOrderItems(prev => prev.map((item, i) =>
            i === index ? { ...item, quantity, totalPrice: item.unitPrice * quantity } : item
        ));
    };

    const updateItemPrice = (index: number, unitPrice: number) => {
        setOrderItems(prev => prev.map((item, i) =>
            i === index ? { ...item, unitPrice, totalPrice: unitPrice * item.quantity } : item
        ));
    };

    const removeItem = (index: number) => {
        setOrderItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateCatalogItem = async () => {
        if (!newCatalogName) { toast.error('Nome é obrigatório'); return; }
        try {
            const item = await catalogApi.create({
                name: newCatalogName,
                type: newCatalogType,
                defaultPrice: parseFloat(newCatalogPrice) || 0,
            });
            setCatalogItems(prev => [...prev, item]);
            setNewCatalogName('');
            setNewCatalogPrice('');
            setShowCatalogForm(false);
            toast.success('Item cadastrado no catálogo');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cadastrar item');
        }
    };

    const handleSaveOrder = async () => {
        if (!client) return;
        if (orderItems.length === 0) { toast.error('Adicione pelo menos um item'); return; }

        setSaving(true);
        try {
            const created = await ordersApi.create({
                clientId: client.id,
                equipmentId: selectedEquipmentId || undefined,
                defect: defect || undefined,
                observations: observations || undefined,
                subtotal,
                discount,
                deliveryFee,
                total,
                paymentMethod: paymentMethod || undefined,
                warranty: warranty || undefined,
                items: orderItems,
            });

            // Reload orders list to get equipment_name from JOIN
            ordersApi.getByClient(id!).then(data => setOrders(data)).catch(() => { });

            setShowOrderForm(false);
            toast.success('Pedido salvo com sucesso!');

            // Prompt PDF generation
            // Auto-generate PDF for pending orders
            if (created.status === 'pendente') {
                toast.success('Gerando PDF da proposta...');
                await generatePDFForOrder(created.id);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar pedido');
        } finally {
            setSaving(false);
        }
    };

    const handleOrderClick = (orderId: string) => {
        setActionOrderId(orderId);
    };

    const handleViewOrder = async (orderId: string) => {
        setActionOrderId(null);
        setLoadingDetail(true);
        try {
            const full = await ordersApi.getById(orderId);
            setViewingOrder(full);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao carregar pedido');
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleDownloadPdf = async (orderId: string) => {
        setActionOrderId(null);
        toast.loading('Gerando PDF...', { id: 'pdf' });
        try {
            await generatePDFForOrder(orderId);
            toast.dismiss('pdf');
        } catch {
            toast.dismiss('pdf');
        }
    };

    const generatePDFForOrder = async (orderId: string) => {
        try {
            // Fetch order with full details
            const fullOrder = await ordersApi.getById(orderId) as any;
            const items = fullOrder.items || [];

            // Separate items by type
            const services = items.filter((i: any) => i.type === 'servico');
            const materials = items.filter((i: any) => i.type === 'peca');

            const servicesTotal = services.reduce((acc: number, item: any) => acc + Number(item.totalPrice || item.total_price), 0);
            const materialsTotal = materials.reduce((acc: number, item: any) => acc + Number(item.totalPrice || item.total_price), 0);

            // Fetch organization details
            let org: any = {};
            try {
                const fetchedOrg = await organizationsApi.get();
                if (fetchedOrg) org = fetchedOrg;
            } catch { /* ignore */ }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let y = 20;

            // --- HEADER ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(org.name || 'Empresa', 15, y);
            y += 6;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');

            const leftX = 15;
            const midX = 110;

            // Left column header
            doc.text(`${(org.ownerName || '').toUpperCase()} ${org.document ? `CPF/CNPJ: ${org.document}` : ''}`, leftX, y);
            if (org.address) { y += 4; doc.text(org.address, leftX, y); }
            if (org.city || org.state) { y += 4; doc.text(`${org.city || ''} - ${org.state || ''}`, leftX, y); }
            if (org.cep) { y += 4; doc.text(`CEP ${org.cep}`, leftX, y); }

            // Right column header (Email/Phone)
            let rightY = 26;
            if (org.email) { doc.text(`Email: ${org.email}`, midX, rightY); rightY += 4; }
            if (org.phone) { doc.text(`Tel: ${org.phone}`, midX, rightY); rightY += 4; }

            // Date Box (Top Right)
            doc.setFillColor(240, 240, 240);
            doc.rect(pageWidth - 45, 18, 30, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - 42, 23.5);

            y = Math.max(y, rightY) + 10;

            // --- TITLE BAR ---
            doc.setFillColor(220, 220, 220); // Gray background
            doc.rect(15, y, pageWidth - 30, 10, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            const orderNumber = fullOrder.order_number || fullOrder.id?.substring(0, 4) || '001';
            const year = new Date(fullOrder.created_at || new Date()).getFullYear();
            doc.text(`Orçamento ${String(orderNumber).padStart(3, '0')}-${year}`, 18, y + 7);
            y += 16;

            // --- CLIENT ---
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Cliente: `, 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(fullOrder.client_name || fullOrder.clientName || client?.name || '', 30, y);
            y += 10;

            const drawTableHeader = (title: string, yPos: number) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(title, 15, yPos);

                let hy = yPos + 6;
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Descrição', 15, hy);
                doc.text('Unidade', 100, hy);
                doc.text('Preço unitário', 130, hy);
                doc.text('Qtd.', 160, hy);
                doc.text('Preço', 190, hy, { align: 'right' });
                doc.setTextColor(0, 0, 0);
                doc.line(15, hy + 2, pageWidth - 15, hy + 2);
                return hy + 7;
            };

            const drawItems = (itemsList: any[], startY: number) => {
                let currentY = startY;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                for (const item of itemsList) {
                    if (currentY > 270) { doc.addPage(); currentY = 20; }
                    doc.text(item.name.substring(0, 45), 15, currentY);
                    doc.text('un', 100, currentY); // fixed unit
                    doc.text(formatCurrency(item.unitPrice || item.unit_price), 130, currentY);
                    doc.text(String(item.quantity || 1), 160, currentY);
                    doc.text(formatCurrency(item.totalPrice || item.total_price), 190, currentY, { align: 'right' });
                    currentY += 6;
                }
                return currentY + 4;
            };

            // --- SERVICES ---
            if (services.length > 0) {
                y = drawTableHeader('Serviços', y);
                y = drawItems(services, y);
            }

            // --- MATERIALS ---
            if (materials.length > 0) {
                y = drawTableHeader('Materiais', y);
                y = drawItems(materials, y);
            }

            // --- TOTALS BLOCK ---
            y += 4;
            const totalsX = 100;

            doc.setFontSize(9);
            // Services Total
            doc.setFillColor(248, 248, 248);
            doc.rect(totalsX, y, pageWidth - 15 - totalsX, 6, 'F');
            doc.text('Serviços', totalsX + 2, y + 4.5);
            doc.text(formatCurrency(servicesTotal), 190, y + 4.5, { align: 'right' });
            y += 6;

            // Materials Total
            doc.setFillColor(248, 248, 248);
            doc.rect(totalsX, y, pageWidth - 15 - totalsX, 6, 'F');
            doc.text('Materiais', totalsX + 2, y + 4.5);
            doc.text(formatCurrency(materialsTotal), 190, y + 4.5, { align: 'right' });
            y += 6;

            // Discount/Fee if exist
            if (fullOrder.discount > 0) {
                doc.setFillColor(248, 248, 248);
                doc.rect(totalsX, y, pageWidth - 15 - totalsX, 6, 'F');
                doc.text('Desconto', totalsX + 2, y + 4.5);
                doc.text(`- ${formatCurrency(fullOrder.discount)}`, 190, y + 4.5, { align: 'right' });
                y += 6;
            }
            if (fullOrder.delivery_fee > 0 || fullOrder.deliveryFee > 0) {
                const fee = fullOrder.deliveryFee || fullOrder.delivery_fee;
                doc.setFillColor(248, 248, 248);
                doc.rect(totalsX, y, pageWidth - 15 - totalsX, 6, 'F');
                doc.text('Taxa de Entrega', totalsX + 2, y + 4.5);
                doc.text(formatCurrency(fee), 190, y + 4.5, { align: 'right' });
                y += 6;
            }

            // Grand Total
            doc.setFillColor(220, 220, 220);
            doc.rect(totalsX, y, pageWidth - 15 - totalsX, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('Total', totalsX + 2, y + 5.5);
            doc.text(formatCurrency(fullOrder.total), 190, y + 5.5, { align: 'right' });
            y += 14;

            // --- PAYMENT BLOCK ---
            doc.setFillColor(240, 240, 240);
            doc.rect(15, y, pageWidth - 30, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Pagamento', 18, y + 5.5);
            y += 12;

            doc.setFontSize(9);
            // Methods
            doc.text('Meios de pagamento', 15, y);
            const methodsText = 'Transferência bancária, dinheiro, cartão de crédito, cartão de débito ou pix.';
            doc.setFont('helvetica', 'normal');
            doc.text(doc.splitTextToSize(methodsText, 90), 15, y + 5);

            // PIX Key
            doc.setFont('helvetica', 'bold');
            doc.text('PIX', 120, y);
            doc.setFont('helvetica', 'normal');
            doc.text(org.pixKey || '-', 120, y + 5);

            y += 16;

            // Bank Data
            doc.setFont('helvetica', 'bold');
            doc.text('Dados bancários', 15, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Banco: ${org.bankName || '-'}`, 15, y); y += 4;
            doc.text(`Agência: ${org.bankAgency || '-'}`, 15, y); y += 4;
            doc.text(`Conta: ${org.bankAccount || '-'}`, 15, y); y += 4;
            doc.text(`Tipo de conta: ${org.bankAccountType === 'poupanca' ? 'Poupança' : 'Corrente'}`, 15, y); y += 4;
            doc.text(`Titular da conta: ${org.bankHolder || '-'}`, 15, y); y += 12;

            // --- FOOTER SIGNATURE ---
            if (y > 250) { doc.addPage(); y = 40; }

            doc.setFontSize(9);
            const dateStr = new Date().toLocaleDateString('pt-BR');
            const cityStr = org.city ? `${org.city}, ` : '';
            doc.text(`${cityStr}${dateStr}`, pageWidth / 2, y, { align: 'center' });

            y += 20;
            doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
            y += 4;
            doc.setFont('helvetica', 'bold');
            doc.text(org.name || 'Empresa', pageWidth / 2, y, { align: 'center' });
            if (org.ownerName) {
                y += 4;
                doc.setFont('helvetica', 'normal');
                doc.text(org.ownerName, pageWidth / 2, y, { align: 'center' });
            }

            // Save PDF
            doc.save(`Orcamento_${String(orderNumber).padStart(3, '0')}_${client?.name?.replace(/\s+/g, '_') || 'cliente'}.pdf`);
            toast.success('PDF gerado com sucesso!');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao gerar PDF');
        }
    };

    const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (loading) return <div className="empty-state"><div className="empty-state__text">Carregando...</div></div>;
    if (!client) return <div className="empty-state"><div className="empty-state__text">Cliente não encontrado</div></div>;

    const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: 'info', label: 'Informações', icon: <User size={16} /> },
        { key: 'payments', label: 'Pagamentos', icon: <CreditCard size={16} /> },
        { key: 'orders', label: 'Pedidos', icon: <ShoppingCart size={16} /> },
    ];

    return (
        <div className="client-detail">
            {/* Header */}
            <div className="page-header">
                <div className="page-header__left" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => navigate('/dashboard/clients')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>{client.name}</h1>
                        <p>{client.document}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="client-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`client-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'info' && (
                    <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card" style={{ padding: 'var(--space-6)' }}>
                        <div className="client-info-grid">
                            <div className="client-info-item">
                                <span className="client-info-item__label">Nome</span>
                                <span className="client-info-item__value">{client.name}</span>
                            </div>
                            <div className="client-info-item">
                                <span className="client-info-item__label">Documento</span>
                                <span className="client-info-item__value">{client.document} ({client.documentType})</span>
                            </div>
                            <div className="client-info-item">
                                <span className="client-info-item__label">Email</span>
                                <span className="client-info-item__value">{client.email || '-'}</span>
                            </div>
                            <div className="client-info-item">
                                <span className="client-info-item__label">Telefone</span>
                                <span className="client-info-item__value">{client.phone || '-'}</span>
                            </div>
                            <div className="client-info-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="client-info-item__label">Endereço</span>
                                <span className="client-info-item__value">{client.address || '-'}</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'payments' && (
                    <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card" style={{ padding: 'var(--space-6)' }}>
                        <div className="empty-state">
                            <CreditCard size={48} className="empty-state__icon" />
                            <div className="empty-state__text">Módulo de pagamentos em breve</div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'orders' && !showOrderForm && !viewingOrder && (
                    <motion.div key="orders-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
                            <button className="btn btn-primary" onClick={openNewOrder}>
                                <Plus size={18} /> Novo Pedido
                            </button>
                        </div>

                        {loadingDetail && (
                            <div className="glass-card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Carregando pedido...</div>
                        )}

                        {orders.length === 0 ? (
                            <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                                <div className="empty-state">
                                    <ShoppingCart size={48} className="empty-state__icon" />
                                    <div className="empty-state__text">Nenhum pedido registrado para este cliente</div>
                                </div>
                            </div>
                        ) : (
                            <div className="orders-list">
                                {orders.map(order => (
                                    <motion.div key={order.id} className="order-card" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => handleOrderClick(order.id)}>
                                        <div className="order-card__info">
                                            <div className="order-card__title">
                                                {order.defect || order.equipmentName || 'Pedido'}
                                            </div>
                                            <div className="order-card__meta">
                                                {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                                {order.equipmentName && ` • ${order.equipmentName}`}
                                            </div>
                                        </div>
                                        <div className="order-card__right">
                                            <span className={`badge ${statusBadge[order.status] || 'badge-secondary'}`}>
                                                {statusLabel[order.status] || order.status}
                                            </span>
                                            <span className="order-card__total">{formatCurrency(order.total)}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Order Detail View */}
                {activeTab === 'orders' && viewingOrder && (
                    <motion.div key="order-detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Detalhes do Pedido</h2>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <button className="btn btn-secondary" onClick={() => handleDownloadPdf(viewingOrder.id)}>
                                    <Download size={16} /> PDF
                                </button>
                                <button className="btn btn-ghost btn-icon" onClick={() => setViewingOrder(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                            <div className="order-form">
                                {/* Status */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className={`badge ${statusBadge[viewingOrder.status] || 'badge-secondary'}`} style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}>
                                        {statusLabel[viewingOrder.status] || viewingOrder.status}
                                    </span>
                                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                                        {new Date(viewingOrder.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                {/* Client Info */}
                                <div className="order-form__section">
                                    <div className="order-form__section-title">Dados do Cliente</div>
                                    <div className="client-info-grid">
                                        <div className="client-info-item">
                                            <span className="client-info-item__label">Cliente</span>
                                            <span className="client-info-item__value">{(viewingOrder as any).clientName || client?.name}</span>
                                        </div>
                                        <div className="client-info-item">
                                            <span className="client-info-item__label">Documento</span>
                                            <span className="client-info-item__value">{(viewingOrder as any).clientDocument || client?.document}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment */}
                                {(viewingOrder as any).equipmentName && (
                                    <div className="order-form__section">
                                        <div className="order-form__section-title">Equipamento</div>
                                        <div className="client-info-grid">
                                            <div className="client-info-item">
                                                <span className="client-info-item__label">Nome</span>
                                                <span className="client-info-item__value">{(viewingOrder as any).equipmentName}</span>
                                            </div>
                                            <div className="client-info-item">
                                                <span className="client-info-item__label">Marca / Modelo</span>
                                                <span className="client-info-item__value">{(viewingOrder as any).equipmentBrand} {(viewingOrder as any).equipmentModel}</span>
                                            </div>
                                            <div className="client-info-item">
                                                <span className="client-info-item__label">Nº Série</span>
                                                <span className="client-info-item__value">{(viewingOrder as any).equipmentSerialNumber || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Defect */}
                                {viewingOrder.defect && (
                                    <div className="order-form__section">
                                        <div className="order-form__section-title">Defeito</div>
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>{viewingOrder.defect}</p>
                                    </div>
                                )}

                                {viewingOrder.observations && (
                                    <div className="order-form__section">
                                        <div className="order-form__section-title">Observações</div>
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>{viewingOrder.observations}</p>
                                    </div>
                                )}

                                {/* Items */}
                                {viewingOrder.items && viewingOrder.items.length > 0 && (
                                    <div className="order-form__section">
                                        <div className="order-form__section-title">Peças e Serviços</div>
                                        <div className="order-items-list">
                                            {viewingOrder.items.map((item, idx) => (
                                                <div key={idx} className="order-item-row">
                                                    <div className="order-item-row__info">
                                                        <div className="order-item-row__name">{item.name}</div>
                                                        <div className="order-item-row__detail">
                                                            {item.type === 'peca' ? 'Peça' : 'Serviço'} • Qtd: {item.quantity}
                                                        </div>
                                                    </div>
                                                    <div className="order-item-row__price">{formatCurrency(item.totalPrice)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Summary */}
                                <div className="order-form__section">
                                    <div className="order-form__section-title">Resumo</div>
                                    <div className="order-summary">
                                        <div className="order-summary__row">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(viewingOrder.subtotal)}</span>
                                        </div>
                                        {viewingOrder.discount > 0 && (
                                            <div className="order-summary__row">
                                                <span>Desconto</span>
                                                <span style={{ color: 'var(--color-rose)' }}>- {formatCurrency(viewingOrder.discount)}</span>
                                            </div>
                                        )}
                                        {viewingOrder.deliveryFee > 0 && (
                                            <div className="order-summary__row">
                                                <span>Taxa de Entrega</span>
                                                <span>{formatCurrency(viewingOrder.deliveryFee)}</span>
                                            </div>
                                        )}
                                        <div className="order-summary__row order-summary__row--total">
                                            <span>TOTAL</span>
                                            <span>{formatCurrency(viewingOrder.total)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment & Warranty */}
                                {(viewingOrder.paymentMethod || viewingOrder.warranty) && (
                                    <div className="order-form__section">
                                        <div className="order-form__section-title">Pagamento e Garantia</div>
                                        <div className="client-info-grid">
                                            {viewingOrder.paymentMethod && (
                                                <div className="client-info-item">
                                                    <span className="client-info-item__label">Forma de Pagamento</span>
                                                    <span className="client-info-item__value">
                                                        {{ dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito', boleto: 'Boleto', transferencia: 'Transferência' }[viewingOrder.paymentMethod] || viewingOrder.paymentMethod}
                                                    </span>
                                                </div>
                                            )}
                                            {viewingOrder.warranty && (
                                                <div className="client-info-item">
                                                    <span className="client-info-item__label">Garantia</span>
                                                    <span className="client-info-item__value">{viewingOrder.warranty}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'orders' && showOrderForm && (
                    <motion.div key="order-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Novo Pedido</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowOrderForm(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
                            <div className="order-form">

                                {/* Client Info (readonly) */}
                                <div className="order-form__section">
                                    <div className="order-form__section-title">Dados do Cliente</div>
                                    <div className="client-info-grid">
                                        <div className="client-info-item">
                                            <span className="client-info-item__label">Cliente</span>
                                            <span className="client-info-item__value">{client.name}</span>
                                        </div>
                                        <div className="client-info-item">
                                            <span className="client-info-item__label">Documento</span>
                                            <span className="client-info-item__value">{client.document}</span>
                                        </div>
                                        <div className="client-info-item">
                                            <span className="client-info-item__label">Telefone</span>
                                            <span className="client-info-item__value">{client.phone || '-'}</span>
                                        </div>
                                        <div className="client-info-item">
                                            <span className="client-info-item__label">Email</span>
                                            <span className="client-info-item__value">{client.email || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment Select */}
                                <div className="order-form__section">
                                    <div className="order-form__section-title">Equipamento</div>
                                    <div className="form-group">
                                        <label className="form-label">Selecione o equipamento</label>
                                        <select className="form-input" value={selectedEquipmentId} onChange={e => setSelectedEquipmentId(e.target.value)}>
                                            <option value="">— Nenhum equipamento —</option>
                                            {equipments.map(eq => (
                                                <option key={eq.id} value={eq.id}>
                                                    {eq.name} — {eq.brand} {eq.model} (Nº {eq.serialNumber || '-'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedEquipment && (
                                        <div className="client-info-grid" style={{ marginTop: 'var(--space-3)' }}>
                                            <div className="client-info-item">
                                                <span className="client-info-item__label">Marca</span>
                                                <span className="client-info-item__value">{selectedEquipment.brand}</span>
                                            </div>
                                            <div className="client-info-item">
                                                <span className="client-info-item__label">Modelo</span>
                                                <span className="client-info-item__value">{selectedEquipment.model}</span>
                                            </div>
                                            <div className="client-info-item">
                                                <span className="client-info-item__label">Nº Série</span>
                                                <span className="client-info-item__value">{selectedEquipment.serialNumber || '-'}</span>
                                            </div>
                                            {selectedEquipment.btus && (
                                                <div className="client-info-item">
                                                    <span className="client-info-item__label">BTUs</span>
                                                    <span className="client-info-item__value">{selectedEquipment.btus.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Defect & Observations */}
                                <div className="order-form__section">
                                    <div className="order-form__section-title">Problema</div>
                                    <div className="form-group">
                                        <label className="form-label">Defeito</label>
                                        <textarea className="form-input" rows={3} value={defect} onChange={e => setDefect(e.target.value)} placeholder="Descreva o defeito relatado pelo cliente..." />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Observações</label>
                                        <textarea className="form-input" rows={2} value={observations} onChange={e => setObservations(e.target.value)} placeholder="Observações adicionais..." />
                                    </div>
                                </div>

                                {/* Catalog & Items */}
                                <div className="order-form__section">
                                    <div className="order-form__section-title">Peças e Serviços</div>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                        <button className="btn btn-primary" onClick={() => setShowCatalog(true)}>
                                            <BookOpen size={16} /> Catálogo
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => setShowCatalogForm(true)}>
                                            <Plus size={16} /> Cadastrar Item
                                        </button>
                                    </div>

                                    {orderItems.length > 0 && (
                                        <div className="order-items-list">
                                            {orderItems.map((item, idx) => (
                                                <div key={idx} className="order-item-row">
                                                    <div className="order-item-row__info">
                                                        <div className="order-item-row__name">{item.name}</div>
                                                        <div className="order-item-row__detail">
                                                            {item.type === 'peca' ? 'Peça' : 'Serviço'}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            style={{ width: '54px', textAlign: 'center', padding: 'var(--space-1) var(--space-2)' }}
                                                            value={item.quantity}
                                                            min={1}
                                                            onChange={e => updateItemQuantity(idx, parseInt(e.target.value) || 1)}
                                                        />
                                                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>×</span>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            style={{ width: '90px', textAlign: 'right', padding: 'var(--space-1) var(--space-2)' }}
                                                            value={item.unitPrice}
                                                            step="0.01"
                                                            min={0}
                                                            onChange={e => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <div className="order-item-row__price">{formatCurrency(item.totalPrice)}</div>
                                                    <button className="btn btn-ghost btn-icon" onClick={() => removeItem(idx)} style={{ color: 'var(--color-rose)' }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Summary */}
                                <div className="order-form__section">
                                    <div className="order-form__section-title">Resumo</div>
                                    <div className="order-summary">
                                        <div className="order-summary__row">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(subtotal)}</span>
                                        </div>
                                        <div className="order-summary__row">
                                            <span>Desconto (R$)</span>
                                            <input
                                                type="number" className="form-input"
                                                style={{ width: '120px', textAlign: 'right', padding: 'var(--space-1) var(--space-2)' }}
                                                value={discount || ''} min={0} step="0.01"
                                                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="order-summary__row">
                                            <span>Taxa de Entrega (R$)</span>
                                            <input
                                                type="number" className="form-input"
                                                style={{ width: '120px', textAlign: 'right', padding: 'var(--space-1) var(--space-2)' }}
                                                value={deliveryFee || ''} min={0} step="0.01"
                                                onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="order-summary__row order-summary__row--total">
                                            <span>TOTAL</span>
                                            <span>{formatCurrency(total)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment & Warranty */}
                                <div className="order-form__section">
                                    <div className="order-form__section-title">Pagamento e Garantia</div>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Forma de Pagamento</label>
                                            <select className="form-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                                <option value="">— Selecione —</option>
                                                <option value="dinheiro">Dinheiro</option>
                                                <option value="pix">PIX</option>
                                                <option value="cartao_credito">Cartão de Crédito</option>
                                                <option value="cartao_debito">Cartão de Débito</option>
                                                <option value="boleto">Boleto</option>
                                                <option value="transferencia">Transferência</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Garantia</label>
                                            <input className="form-input" value={warranty} onChange={e => setWarranty(e.target.value)} placeholder="Ex: 90 dias, 6 meses" />
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <button className="btn btn-primary" onClick={handleSaveOrder} disabled={saving} style={{ width: '100%', padding: 'var(--space-4)' }}>
                                    <FileText size={18} />
                                    {saving ? 'Salvando...' : 'Salvar Pedido'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Menu Modal */}
            <AnimatePresence>
                {actionOrderId && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActionOrderId(null)}>
                        <motion.div className="modal glass-card" style={{ maxWidth: '340px', padding: 'var(--space-6)' }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header" style={{ marginBottom: 'var(--space-4)' }}>
                                <h2 style={{ fontSize: 'var(--text-base)' }}>O que deseja fazer?</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setActionOrderId(null)}><X size={20} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-4)' }}
                                    onClick={() => handleViewOrder(actionOrderId)}
                                >
                                    <ShoppingCart size={18} /> Consultar Pedido
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-4)' }}
                                    onClick={() => handleDownloadPdf(actionOrderId)}
                                >
                                    <Download size={18} /> Baixar Orçamento PDF
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Catalog Modal */}
            <AnimatePresence>
                {showCatalog && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCatalog(false)}>
                        <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header">
                                <h2>Catálogo de Peças e Serviços</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowCatalog(false)}><X size={20} /></button>
                            </div>
                            <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input className="form-input" placeholder="Buscar no catálogo..." value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} style={{ paddingLeft: 'calc(var(--space-3) + 16px + var(--space-2))', width: '100%' }} />
                            </div>
                            {filteredCatalog.length === 0 ? (
                                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                                    <div className="empty-state__text">Nenhum item encontrado. Cadastre itens no catálogo.</div>
                                </div>
                            ) : (
                                <div className="catalog-grid">
                                    {filteredCatalog.map(item => (
                                        <div key={item.id} className="catalog-item" onClick={() => addCatalogItem(item)}>
                                            <div>
                                                <div className="catalog-item__name">{item.name}</div>
                                                <div className="catalog-item__type">
                                                    {item.type === 'peca' ? <><Package size={12} /> Peça</> : <><Wrench size={12} /> Serviço</>}
                                                </div>
                                            </div>
                                            <div className="catalog-item__price">{formatCurrency(item.defaultPrice)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {showCatalogForm && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCatalogForm(false)}>
                        <motion.div className="modal glass-card" style={{ maxWidth: '420px' }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <div className="modal__header">
                                <h2>Cadastrar Item no Catálogo</h2>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowCatalogForm(false)}><X size={20} /></button>
                            </div>
                            <div className="modal__form">
                                <div className="form-group">
                                    <label className="form-label">Nome</label>
                                    <input className="form-input" value={newCatalogName} onChange={e => setNewCatalogName(e.target.value)} placeholder="Ex: Gás R410a, Troca de compressor" />
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Tipo</label>
                                        <select className="form-input" value={newCatalogType} onChange={e => setNewCatalogType(e.target.value as 'peca' | 'servico')}>
                                            <option value="servico">Serviço</option>
                                            <option value="peca">Peça</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Valor Padrão (R$)</label>
                                        <input className="form-input" type="number" step="0.01" min="0" value={newCatalogPrice} onChange={e => setNewCatalogPrice(e.target.value)} placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="modal__actions">
                                    <button className="btn btn-secondary" onClick={() => setShowCatalogForm(false)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={handleCreateCatalogItem}>Cadastrar</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
