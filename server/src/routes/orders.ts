import { Router } from 'express';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { subscriptionGuard, featureGuard } from '../middleware/subscriptionGuard.js';

const router = Router();

// GET /api/orders — list all orders for the user's org
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT o.*, c.name as client_name, e.name as equipment_name
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN equipments e ON o.equipment_id = e.id
       WHERE o.org_id = $1
       ORDER BY o.created_at DESC`,
            [req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/orders/client/:clientId — list orders for a specific client
router.get('/client/:clientId', authMiddleware, async (req, res) => {
    try {
        // Verify client belongs to org
        const clientCheck = await query(
            'SELECT id FROM clients WHERE id = $1 AND org_id = $2',
            [req.params.clientId, req.user!.orgId]
        );
        if (clientCheck.rows.length === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }

        const result = await query(
            `SELECT o.*, c.name as client_name, e.name as equipment_name
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN equipments e ON o.equipment_id = e.id
       WHERE o.client_id = $1 AND o.org_id = $2
       ORDER BY o.created_at DESC`,
            [req.params.clientId, req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get client orders error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/orders/:id — get single order with items
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const orderResult = await query(
            `SELECT o.*, c.name as client_name, c.document as client_document,
              c.phone as client_phone, c.email as client_email, c.address as client_address,
              e.name as equipment_name, e.brand as equipment_brand, e.model as equipment_model,
              e.serial_number as equipment_serial_number
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN equipments e ON o.equipment_id = e.id
       WHERE o.id = $1 AND o.org_id = $2`,
            [req.params.id, req.user!.orgId]
        );

        if (orderResult.rows.length === 0) {
            res.status(404).json({ error: 'Pedido não encontrado' });
            return;
        }

        const itemsResult = await query(
            'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
            [req.params.id]
        );

        res.json({
            ...orderResult.rows[0],
            items: itemsResult.rows,
        });
    } catch (error: any) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/orders — create order with items
router.post('/', authMiddleware, subscriptionGuard, featureGuard(['professional', 'pro', 'enterprise']), async (req, res) => {
    const {
        client_id, equipment_id, defect, observations,
        subtotal, discount, delivery_fee, total,
        payment_method, warranty, items
    } = req.body;

    if (!client_id) {
        res.status(400).json({ error: 'Cliente é obrigatório' });
        return;
    }

    // Verify client belongs to org
    const clientCheck = await query(
        'SELECT id FROM clients WHERE id = $1 AND org_id = $2',
        [client_id, req.user!.orgId]
    );
    if (clientCheck.rows.length === 0) {
        res.status(403).json({ error: 'Cliente não pertence à sua organização' });
        return;
    }

    try {
        // Auto-increment order number
        const counterResult = await query(
            `UPDATE organizations SET order_counter = COALESCE(order_counter, 0) + 1
             WHERE id = $1 RETURNING order_counter`,
            [req.user!.orgId]
        );
        const orderNumber = counterResult.rows[0]?.order_counter || 1;

        // Create the order
        const orderResult = await query(
            `INSERT INTO orders (org_id, client_id, equipment_id, defect, observations,
        subtotal, discount, delivery_fee, total, payment_method, warranty, order_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                req.user!.orgId, client_id, equipment_id || null,
                defect || null, observations || null,
                subtotal || 0, discount || 0, delivery_fee || 0, total || 0,
                payment_method || null, warranty || null, orderNumber,
            ]
        );

        const order = orderResult.rows[0];

        // Insert order items
        if (items && Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                await query(
                    `INSERT INTO order_items (order_id, catalog_item_id, name, type, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        order.id,
                        item.catalog_item_id || null,
                        item.name,
                        item.type,
                        item.quantity || 1,
                        item.unit_price,
                        item.total_price,
                    ]
                );
            }
        }

        // Fetch the complete order with items
        const itemsResult = await query(
            'SELECT * FROM order_items WHERE order_id = $1',
            [order.id]
        );

        res.status(201).json({
            ...order,
            items: itemsResult.rows,
        });
    } catch (error: any) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});

// PATCH /api/orders/:id — update order
router.patch('/:id', authMiddleware, subscriptionGuard, featureGuard(['professional', 'pro', 'enterprise']), async (req, res) => {
    const allowedFields = [
        'equipment_id', 'defect', 'observations', 'status',
        'subtotal', 'discount', 'delivery_fee', 'total',
        'payment_method', 'warranty'
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates.push(`${field} = $${paramIndex}`);
            values.push(req.body[field]);
            paramIndex++;
        }
    }

    if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
    }

    values.push(req.params.id, req.user!.orgId);

    try {
        const result = await query(
            `UPDATE orders SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Pedido não encontrado' });
            return;
        }

        const order = result.rows[0];

        // If items are provided, replace them
        if (req.body.items && Array.isArray(req.body.items)) {
            await query('DELETE FROM order_items WHERE order_id = $1', [order.id]);

            for (const item of req.body.items) {
                await query(
                    `INSERT INTO order_items (order_id, catalog_item_id, name, type, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        order.id,
                        item.catalog_item_id || null,
                        item.name,
                        item.type,
                        item.quantity || 1,
                        item.unit_price,
                        item.total_price,
                    ]
                );
            }
        }

        const itemsResult = await query(
            'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
            [order.id]
        );

        res.json({
            ...order,
            items: itemsResult.rows,
        });
    } catch (error: any) {
        console.error('Update order error:', error);
        res.status(500).json({ error: 'Erro ao atualizar pedido' });
    }
});

// DELETE /api/orders/:id — delete order (cascade deletes items)
router.delete('/:id', authMiddleware, subscriptionGuard, featureGuard(['professional', 'pro', 'enterprise']), async (req, res) => {
    try {
        const result = await query(
            'DELETE FROM orders WHERE id = $1 AND org_id = $2 RETURNING id',
            [req.params.id, req.user!.orgId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Pedido não encontrado' });
            return;
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: 'Erro ao deletar pedido' });
    }
});

export default router;
