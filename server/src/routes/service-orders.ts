import { Router } from 'express';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/service-orders — list all service orders for the user's org
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT so.*, u.name as technician_name
       FROM service_orders so
       LEFT JOIN users u ON so.technician_id = u.id
       JOIN equipments e ON so.equipment_id = e.id
       JOIN clients c ON e.client_id = c.id
       WHERE c.org_id = $1
       ORDER BY so.date DESC`,
            [req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get service orders error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/service-orders/equipment/:equipmentId — list orders by equipment
router.get('/equipment/:equipmentId', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT so.*, u.name as technician_name
       FROM service_orders so
       LEFT JOIN users u ON so.technician_id = u.id
       JOIN equipments e ON so.equipment_id = e.id
       JOIN clients c ON e.client_id = c.id
       WHERE so.equipment_id = $1 AND c.org_id = $2
       ORDER BY so.date DESC`,
            [req.params.equipmentId, req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get equipment orders error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/service-orders — create service order
router.post('/', authMiddleware, async (req, res) => {
    const {
        equipment_id, date, type, status, description,
        technician_id, warranty_until, notes,
        next_maintenance_date, photos_before, photos_after
    } = req.body;

    if (!equipment_id || !date || !type || !description) {
        res.status(400).json({ error: 'Campos obrigatórios: equipment_id, date, type, description' });
        return;
    }

    // Verify equipment belongs to org
    const eqCheck = await query(
        `SELECT e.id FROM equipments e
     JOIN clients c ON e.client_id = c.id
     WHERE e.id = $1 AND c.org_id = $2`,
        [equipment_id, req.user!.orgId]
    );

    if (eqCheck.rows.length === 0) {
        res.status(403).json({ error: 'Equipamento não pertence à sua organização' });
        return;
    }

    try {
        const result = await query(
            `INSERT INTO service_orders (
        equipment_id, date, type, status, description,
        technician_id, warranty_until, notes,
        next_maintenance_date, photos_before, photos_after
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
            [
                equipment_id, date, type, status || 'aberta', description,
                technician_id || null, warranty_until || null, notes || null,
                next_maintenance_date || null,
                photos_before || null,
                photos_after || null,
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Create service order error:', error);
        res.status(500).json({ error: 'Erro ao criar ordem de serviço' });
    }
});

// PATCH /api/service-orders/:id — update service order
router.patch('/:id', authMiddleware, async (req, res) => {
    const allowedFields = [
        'equipment_id', 'date', 'type', 'status', 'description',
        'technician_id', 'warranty_until', 'notes',
        'next_maintenance_date', 'photos_before', 'photos_after'
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            const value = req.body[field];
            updates.push(`${field} = $${paramIndex}`);
            values.push(value);
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
            `UPDATE service_orders SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       AND equipment_id IN (
         SELECT e.id FROM equipments e
         JOIN clients c ON e.client_id = c.id
         WHERE c.org_id = $${paramIndex + 1}
       )
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Ordem de serviço não encontrada' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Update service order error:', error);
        res.status(500).json({ error: 'Erro ao atualizar ordem de serviço' });
    }
});

export default router;
