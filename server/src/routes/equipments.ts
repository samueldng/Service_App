import { Router } from 'express';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { subscriptionGuard } from '../middleware/subscriptionGuard.js';

const router = Router();

// GET /api/equipments — list all equipments for the user's org
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT e.* FROM equipments e
       JOIN clients c ON e.client_id = c.id
       WHERE c.org_id = $1
       ORDER BY e.name`,
            [req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get equipments error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/equipments/public/:qrCodeUid — PUBLIC route (no auth)
// Replaces the Supabase RPC get_public_equipment_data
router.get('/public/:qrCodeUid', async (req, res) => {
    const { qrCodeUid } = req.params;

    try {
        // Get equipment
        const eqResult = await query(
            'SELECT * FROM equipments WHERE qr_code_uid = $1',
            [qrCodeUid]
        );

        if (eqResult.rows.length === 0) {
            res.status(404).json({ error: 'Equipamento não encontrado' });
            return;
        }

        const equipment = eqResult.rows[0];

        // Get related client
        const clientResult = await query(
            'SELECT * FROM clients WHERE id = $1',
            [equipment.client_id]
        );

        // Get related sector
        const sectorResult = equipment.sector_id
            ? await query('SELECT * FROM sectors WHERE id = $1', [equipment.sector_id])
            : { rows: [] };

        // Get service orders
        const ordersResult = await query(
            `SELECT so.*, u.name as technician_name
       FROM service_orders so
       LEFT JOIN users u ON so.technician_id = u.id
       WHERE so.equipment_id = $1
       ORDER BY so.date DESC`,
            [equipment.id]
        );

        // Get org info for branding
        let organization = null;
        if (clientResult.rows.length > 0) {
            const orgResult = await query(
                'SELECT name, logo_url, brand_color FROM organizations WHERE id = $1',
                [clientResult.rows[0].org_id]
            );
            organization = orgResult.rows[0] || null;
        }

        res.json({
            equipment,
            client: clientResult.rows[0] || null,
            sector: sectorResult.rows[0] || null,
            orders: ordersResult.rows,
            organization,
        });
    } catch (error: any) {
        console.error('Public tracking error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/equipments — create equipment
router.post('/', authMiddleware, subscriptionGuard, async (req, res) => {
    const { client_id, sector_id, name, brand, model, serial_number, btus, details, install_date, status } = req.body;

    if (!client_id || !name || !brand || !model) {
        res.status(400).json({ error: 'Campos obrigatórios: client_id, name, brand, model' });
        return;
    }

    // Verify limit and client in one transaction/queries
    try {
        const orgInfo = await query('SELECT max_equipments FROM organizations WHERE id = $1', [req.user!.orgId]);
        const maxEquipments = orgInfo.rows[0]?.max_equipments || 30;

        const countQuery = await query(
            'SELECT COUNT(e.id) as total FROM equipments e JOIN clients c ON e.client_id = c.id WHERE c.org_id = $1',
            [req.user!.orgId]
        );
        const currentTotal = parseInt(countQuery.rows[0].total, 10);

        if (currentTotal >= maxEquipments) {
            res.status(403).json({ error: `Limite do plano atingido (${maxEquipments} equipamentos). Faça downgrade ou upgrade do seu plano para adicionar mais.` });
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

        const result = await query(
            `INSERT INTO equipments(client_id, sector_id, name, brand, model, serial_number, btus, details, install_date, status)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
            [client_id, sector_id || null, name, brand, model, serial_number, btus, details, install_date, status || 'active']
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Create equipment error:', error);
        res.status(500).json({ error: 'Erro ao criar equipamento' });
    }
});

// PATCH /api/equipments/:id — update equipment
router.patch('/:id', authMiddleware, subscriptionGuard, async (req, res) => {
    const allowedFields = ['client_id', 'sector_id', 'name', 'brand', 'model', 'serial_number', 'btus', 'details', 'install_date', 'status'];
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
            `UPDATE equipments SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       AND client_id IN(SELECT id FROM clients WHERE org_id = $${paramIndex + 1})
RETURNING * `,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Equipamento não encontrado' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Update equipment error:', error);
        res.status(500).json({ error: 'Erro ao atualizar equipamento' });
    }
});

// DELETE /api/equipments/:id — delete equipment
router.delete('/:id', authMiddleware, subscriptionGuard, async (req, res) => {
    try {
        const result = await query(
            `DELETE FROM equipments
       WHERE id = $1
       AND client_id IN(SELECT id FROM clients WHERE org_id = $2)
       RETURNING id`,
            [req.params.id, req.user!.orgId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Equipamento não encontrado' });
            return;
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete equipment error:', error);
        if (error.code === '23503') {
            res.status(400).json({ error: 'Não é possível excluir este registro pois existem itens (Ordens de Serviço ou Equipamentos) vinculados a ele.' });
            return;
        }
        res.status(500).json({ error: 'Erro ao deletar equipamento' });
    }
});

export default router;
