import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, User, CreditCard, ShoppingCart, Plus, Search, X,
    Package, Wrench, Trash2, FileText, BookOpen, Download, Lock, ArrowUpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi, equipmentsApi, catalogApi, ordersApi, organizationsApi } from '../../services/api';
import type { Client, Equipment, CatalogItem, Order, Organization } from '../../types';
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
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

    // Catalog state
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [showCatalog, setShowCatalog] = useState(false);
    const [showCatalogForm, setShowCatalogForm] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [newCatalogName, setNewCatalogName] = useState('');
    const [newCatalogType, setNewCatalogType] = useState<'peca' | 'servico'>('servico');
    const [newCatalogPrice, setNewCatalogPrice] = useState('');
    const [organization, setOrganization] = useState<Organization | null>(null);

    useEffect(() => {
        if (!id) return;
        loadData();
        organizationsApi.get().then(data => { if (data) setOrganization(data); }).catch(() => { });
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
    const discountAmount = subtotal * (discount / 100);
    const total = Math.max(0, subtotal - discountAmount + deliveryFee);

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
        setEditingOrderId(null);
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
            if (editingOrderId) {
                await ordersApi.update(editingOrderId, {
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
                toast.success('Pedido atualizado com sucesso!');
                setEditingOrderId(null);
                setShowOrderForm(false);
            } else {
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
                setShowOrderForm(false);
                toast.success('Pedido salvo com sucesso!');

                // Prompt PDF generation
                // Auto-generate PDF for pending orders
                if (created.status === 'pendente') {
                    toast.success('Gerando PDF da proposta...');
                    await generatePDFForOrder(created.id);
                }
            }

            // Reload orders list to get equipment_name from JOIN
            ordersApi.getByClient(id!).then(data => setOrders(data)).catch(() => { });

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

    const handleEditOrder = async (orderId: string) => {
        setActionOrderId(null);
        toast.loading('Carregando dados...', { id: 'edit' });
        try {
            const data = await ordersApi.getById(orderId);
            setEditingOrderId(data.id);
            setSelectedEquipmentId(data.equipmentId || '');
            setDefect(data.defect || '');
            setObservations(data.observations || '');
            setDiscount(data.discount || 0);
            setDeliveryFee(data.deliveryFee || 0);
            setPaymentMethod(data.paymentMethod || '');
            setWarranty(data.warranty || '');

            setOrderItems(data.items?.map(i => ({
                catalogItemId: i.catalogItemId,
                name: i.name,
                type: i.type,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: i.totalPrice,
            })) || []);

            setShowOrderForm(true);
            toast.dismiss('edit');
        } catch (err: any) {
            toast.dismiss('edit');
            toast.error(err.message || 'Erro ao carregar pedido para edi\u00e7\u00e3o');
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
            const fullOrder = await ordersApi.getById(orderId) as any;
            const items = fullOrder.items || [];

            const services = items.filter((i: any) => i.type === 'servico');
            const materials = items.filter((i: any) => i.type === 'peca');
            const servicesTotal = services.reduce((acc: number, item: any) => acc + Number(item.totalPrice || item.total_price), 0);
            const materialsTotal = materials.reduce((acc: number, item: any) => acc + Number(item.totalPrice || item.total_price), 0);

            let org: any = {};
            try { const fetched = await organizationsApi.get(); if (fetched) org = fetched; } catch { }

            const doc = new jsPDF();
            const pw = doc.internal.pageSize.getWidth();
            const margin = 15;
            const contentW = pw - margin * 2;

            // Color palette (blue)
            const blue = { r: 26, g: 82, b: 118 };
            const blueLight = { r: 214, g: 234, b: 248 };
            const blueMid = { r: 46, g: 134, b: 193 };
            const dark = { r: 33, g: 37, b: 41 };
            const muted = { r: 120, g: 130, b: 140 };

            let y = 15;

            // Blue top accent line
            doc.setFillColor(blue.r, blue.g, blue.b);
            doc.rect(0, 0, pw, 3, 'F');

            // Logo
            let logoW = 0;
            if (org.logoUrl) {
                try {
                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
                    const logoFullUrl = org.logoUrl.startsWith('http') ? org.logoUrl : `${API_URL.replace('/api', '')}${org.logoUrl}`;
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject();
                        img.src = logoFullUrl;
                    });
                    const logoMaxW = 32;
                    const logoMaxH = 28;
                    const ratio = Math.min(logoMaxW / img.width, logoMaxH / img.height);
                    logoW = img.width * ratio;
                    const logoH = img.height * ratio;
                    doc.addImage(img, 'PNG', margin, y, logoW, logoH);
                } catch { logoW = 0; }
            }

            // Company info
            const infoX = logoW > 0 ? margin + logoW + 6 : margin;
            const infoMaxW = 90;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(blue.r, blue.g, blue.b);
            doc.text(org.name || 'Empresa', infoX, y + 5);

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(muted.r, muted.g, muted.b);

            let infoY = y + 10;
            if (org.ownerName || org.document) {
                const ownerLine = [org.ownerName, org.document ? `CPF/CNPJ: ${org.document}` : ''].filter(Boolean).join(' \u00b7 ');
                const wrapped = doc.splitTextToSize(ownerLine, infoMaxW);
                doc.text(wrapped, infoX, infoY);
                infoY += wrapped.length * 3.5;
            }
            if (org.address) { doc.text(org.address, infoX, infoY); infoY += 3.5; }
            if (org.city || org.state) { doc.text(`${org.city || ''} \u2013 ${org.state || ''}${org.cep ? `, CEP ${org.cep}` : ''}`, infoX, infoY); infoY += 3.5; }
            if (org.email) { doc.text(org.email, infoX, infoY); infoY += 3.5; }
            if (org.phone) { doc.text(`Tel: ${org.phone}`, infoX, infoY); infoY += 3.5; }

            // Date badge (top-right)
            const dateBadgeW = 36;
            const dateBadgeH = 14;
            const dateBadgeX = pw - margin - dateBadgeW;
            doc.setFillColor(blueLight.r, blueLight.g, blueLight.b);
            doc.roundedRect(dateBadgeX, y, dateBadgeW, dateBadgeH, 2, 2, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(blueMid.r, blueMid.g, blueMid.b);
            doc.text('DATA DE EMISS\u00c3O', dateBadgeX + dateBadgeW / 2, y + 4.5, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(blue.r, blue.g, blue.b);
            doc.text(new Date().toLocaleDateString('pt-BR'), dateBadgeX + dateBadgeW / 2, y + 10.5, { align: 'center' });

            y = Math.max(infoY, y + 28) + 6;

            // Separator
            doc.setDrawColor(blueLight.r, blueLight.g, blueLight.b);
            doc.setLineWidth(0.5);
            doc.line(margin, y, pw - margin, y);
            y += 8;

            // Title bar
            doc.setFillColor(blue.r, blue.g, blue.b);
            doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            const orderNumber = fullOrder.orderNumber || fullOrder.order_number || fullOrder.id?.substring(0, 4) || '001';
            const year = new Date(fullOrder.createdAt || fullOrder.created_at || new Date()).getFullYear();
            doc.text(`Or\u00e7amento ${String(orderNumber).padStart(3, '0')}-${year}`, margin + 5, y + 7);
            y += 16;

            // Client
            doc.setTextColor(blue.r, blue.g, blue.b);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('CLIENTE', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(dark.r, dark.g, dark.b);
            doc.setFontSize(10);
            doc.text(fullOrder.clientName || fullOrder.client_name || client?.name || '', margin + 22, y);
            y += 8;

            // Table helpers
            const colDesc = margin;
            const colUnit = 95;
            const colPrice = 125;
            const colQty = 155;
            const colTotal = pw - margin;

            const drawSectionHeader = (title: string, yPos: number) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(blue.r, blue.g, blue.b);
                doc.text(title, margin, yPos);
                yPos += 6;
                doc.setFillColor(blueLight.r, blueLight.g, blueLight.b);
                doc.rect(margin, yPos - 3.5, contentW, 6, 'F');
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(blue.r, blue.g, blue.b);
                doc.text('Descri\u00e7\u00e3o', colDesc + 2, yPos);
                doc.text('Un.', colUnit, yPos);
                doc.text('Pre\u00e7o Unit.', colPrice, yPos);
                doc.text('Qtd.', colQty, yPos);
                doc.text('Pre\u00e7o', colTotal, yPos, { align: 'right' });
                return yPos + 6;
            };

            const drawRows = (itemsList: any[], startY: number) => {
                let cy = startY;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(dark.r, dark.g, dark.b);
                for (let i = 0; i < itemsList.length; i++) {
                    if (cy > 270) { doc.addPage(); cy = 20; }
                    const item = itemsList[i];
                    if (i % 2 === 0) {
                        doc.setFillColor(250, 252, 255);
                        doc.rect(margin, cy - 3.5, contentW, 6, 'F');
                    }
                    doc.text(item.name.substring(0, 50), colDesc + 2, cy);
                    doc.text('un', colUnit, cy);
                    doc.text(formatCurrency(item.unitPrice || item.unit_price), colPrice, cy);
                    doc.text(String(item.quantity || 1), colQty + 2, cy);
                    doc.text(formatCurrency(item.totalPrice || item.total_price), colTotal, cy, { align: 'right' });
                    cy += 6;
                }
                return cy + 2;
            };

            if (services.length > 0) {
                y = drawSectionHeader('Servi\u00e7os', y);
                y = drawRows(services, y);
            }
            if (materials.length > 0) {
                y = drawSectionHeader('Materiais', y);
                y = drawRows(materials, y);
            }

            // Problem description block (left side, next to totals)
            const defectText = fullOrder.defect || fullOrder.description || '';
            const obsText = fullOrder.observations || '';
            if (defectText || obsText) {
                y += 2;
                // Light blue bordered box for problem description
                const descBoxX = margin;
                const descBoxW = colPrice - 10 - margin;
                const descStartY = y;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(blue.r, blue.g, blue.b);
                doc.text('Problema Relatado', descBoxX + 3, y + 4);
                y += 7;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(dark.r, dark.g, dark.b);

                if (defectText) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7);
                    doc.setTextColor(muted.r, muted.g, muted.b);
                    doc.text('Defeito:', descBoxX + 3, y);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(dark.r, dark.g, dark.b);
                    const wrappedDefect = doc.splitTextToSize(defectText, descBoxW - 8);
                    doc.text(wrappedDefect, descBoxX + 3, y + 3.5);
                    y += 3.5 + wrappedDefect.length * 3.2;
                }
                if (obsText) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7);
                    doc.setTextColor(muted.r, muted.g, muted.b);
                    doc.text('Observa\u00e7\u00f5es:', descBoxX + 3, y);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(dark.r, dark.g, dark.b);
                    const wrappedObs = doc.splitTextToSize(obsText, descBoxW - 8);
                    doc.text(wrappedObs, descBoxX + 3, y + 3.5);
                    y += 3.5 + wrappedObs.length * 3.2;
                }

                // Draw border around the description box
                const descBoxH = y - descStartY + 3;
                doc.setDrawColor(blueLight.r, blueLight.g, blueLight.b);
                doc.setLineWidth(0.4);
                doc.roundedRect(descBoxX, descStartY, descBoxW, descBoxH, 1.5, 1.5, 'S');
                y += 4;
            }


            // Totals
            y += 2;
            const totX = colPrice - 5;
            const totW = pw - margin - totX;
            doc.setFontSize(8.5);

            const drawTotalRow = (label: string, value: string, bold = false, accent = false) => {
                if (accent) {
                    doc.setFillColor(blue.r, blue.g, blue.b);
                    doc.rect(totX, y - 3.5, totW, 8, 'F');
                    doc.setTextColor(255, 255, 255);
                } else {
                    doc.setFillColor(blueLight.r, blueLight.g, blueLight.b);
                    doc.rect(totX, y - 3, totW, 6, 'F');
                    doc.setTextColor(dark.r, dark.g, dark.b);
                }
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.text(label, totX + 3, y + (accent ? 1 : 0));
                doc.text(value, colTotal, y + (accent ? 1 : 0), { align: 'right' });
                y += accent ? 10 : 6.5;
            };

            drawTotalRow('Servi\u00e7os', formatCurrency(servicesTotal));
            drawTotalRow('Materiais', formatCurrency(materialsTotal));
            if (fullOrder.discount > 0) {
                const discAmt = (servicesTotal + materialsTotal) * (fullOrder.discount / 100);
                drawTotalRow(`Desconto (${fullOrder.discount}%)`, `- ${formatCurrency(discAmt)}`);
            }
            if (fullOrder.deliveryFee > 0 || fullOrder.delivery_fee > 0) {
                drawTotalRow('Taxa de Entrega', formatCurrency(fullOrder.deliveryFee || fullOrder.delivery_fee || 0));
            }
            drawTotalRow('Total', formatCurrency(fullOrder.total), true, true);

            // Payment
            y += 2;
            if (y > 240) { doc.addPage(); y = 20; }

            doc.setFillColor(blueLight.r, blueLight.g, blueLight.b);
            doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(blue.r, blue.g, blue.b);
            doc.text('Pagamento', margin + 4, y + 5.5);
            y += 13;

            doc.setFontSize(8);
            doc.setTextColor(dark.r, dark.g, dark.b);
            doc.setFont('helvetica', 'bold');
            doc.text('Meios de pagamento', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(muted.r, muted.g, muted.b);
            const methodsText = 'Transfer\u00eancia banc\u00e1ria, dinheiro, cart\u00e3o de cr\u00e9dito, cart\u00e3o de d\u00e9bito ou PIX.';
            doc.text(doc.splitTextToSize(methodsText, 85), margin, y + 4);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(blue.r, blue.g, blue.b);
            doc.text('Chave PIX', 120, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(dark.r, dark.g, dark.b);
            doc.text(org.pixKey || '\u2013', 120, y + 4);
            y += 14;

            if (org.bankName) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(blue.r, blue.g, blue.b);
                doc.text('Dados Banc\u00e1rios', margin, y);
                y += 4;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(muted.r, muted.g, muted.b);
                doc.text(`${org.bankName || '\u2013'}  \u00b7  Ag: ${org.bankAgency || '\u2013'}  \u00b7  Conta: ${org.bankAccount || '\u2013'} (${org.bankAccountType === 'poupanca' ? 'Poupan\u00e7a' : 'Corrente'})`, margin, y);
                y += 3.5;
                doc.text(`Titular: ${org.bankHolder || '\u2013'}`, margin, y);
                y += 8;
            }

            // Footer / Signature
            if (y > 252) { doc.addPage(); y = 40; }
            y += 6;
            doc.setDrawColor(blueLight.r, blueLight.g, blueLight.b);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pw - margin, y);
            y += 10;

            doc.setFontSize(8.5);
            doc.setTextColor(muted.r, muted.g, muted.b);
            doc.setFont('helvetica', 'normal');
            const cityStr = org.city ? `${org.city}, ` : '';
            doc.text(`${cityStr}${new Date().toLocaleDateString('pt-BR')}`, pw / 2, y, { align: 'center' });
            y += 16;

            doc.setDrawColor(blue.r, blue.g, blue.b);
            doc.setLineWidth(0.4);
            doc.line(pw / 2 - 40, y, pw / 2 + 40, y);
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(blue.r, blue.g, blue.b);
            doc.text(org.name || 'Empresa', pw / 2, y, { align: 'center' });
            if (org.ownerName) {
                y += 4;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(muted.r, muted.g, muted.b);
                doc.text(org.ownerName, pw / 2, y, { align: 'center' });
            }

            // Blue bottom accent
            const pageH = doc.internal.pageSize.getHeight();
            doc.setFillColor(blue.r, blue.g, blue.b);
            doc.rect(0, pageH - 3, pw, 3, 'F');

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

                {activeTab === 'orders' && organization?.subscriptionPlan === 'starter' && (
                    <motion.div key="orders-locked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="glass-card" style={{
                            padding: 'var(--space-8)', textAlign: 'center',
                            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
                            border: '1px solid rgba(167, 139, 250, 0.2)',
                        }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%', margin: '0 auto var(--space-4)',
                                background: 'rgba(167, 139, 250, 0.15)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Lock size={28} style={{ color: '#a78bfa' }} />
                            </div>
                            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#ddd6fe', marginBottom: 'var(--space-2)' }}>
                                Pedidos & Orçamentos — Plano Professional
                            </h3>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(221, 214, 254, 0.6)', marginBottom: 'var(--space-5)', maxWidth: 420, margin: '0 auto var(--space-5)' }}>
                                Crie orçamentos profissionais em PDF, gerencie pedidos e catálogo de peças e serviços. Faça upgrade para desbloquear.
                            </p>
                            <button className="btn btn-primary" onClick={() => window.location.href = '/dashboard/settings'}
                                style={{ gap: 'var(--space-2)' }}>
                                <ArrowUpCircle size={18} /> Fazer Upgrade
                            </button>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'orders' && organization?.subscriptionPlan !== 'starter' && !showOrderForm && !viewingOrder && (
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
                {activeTab === 'orders' && organization?.subscriptionPlan !== 'starter' && viewingOrder && (
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

                {activeTab === 'orders' && organization?.subscriptionPlan !== 'starter' && showOrderForm && (
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
                                            <span>Desconto (%)</span>
                                            <input
                                                type="number" className="form-input"
                                                style={{ width: '120px', textAlign: 'right', padding: 'var(--space-1) var(--space-2)' }}
                                                value={discount || ''} min={0} max={100} step="1"
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
                                    onClick={() => handleEditOrder(actionOrderId)}
                                >
                                    <FileText size={18} /> Editar Pedido
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
