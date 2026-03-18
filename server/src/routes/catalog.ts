import { Router } from 'express';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { subscriptionGuard } from '../middleware/subscriptionGuard.js';

const router = Router();

// GET /api/catalog — list all catalog items for the user's org
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM catalog_items WHERE org_id = $1 ORDER BY name',
            [req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get catalog items error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/catalog — create catalog item
router.post('/', authMiddleware, subscriptionGuard, async (req, res) => {
    const { name, type, default_price } = req.body;

    if (!name || !type) {
        res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        return;
    }

    try {
        const result = await query(
            `INSERT INTO catalog_items (org_id, name, type, default_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [req.user!.orgId, name, type, default_price || 0]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Create catalog item error:', error);
        res.status(500).json({ error: 'Erro ao criar item do catálogo' });
    }
});

// PATCH /api/catalog/:id — update catalog item
router.patch('/:id', authMiddleware, subscriptionGuard, async (req, res) => {
    const allowedFields = ['name', 'type', 'default_price'];
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
            `UPDATE catalog_items SET ${updates.join(', ')} WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Item não encontrado' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Update catalog item error:', error);
        res.status(500).json({ error: 'Erro ao atualizar item' });
    }
});

// DELETE /api/catalog/:id — delete catalog item
router.delete('/:id', authMiddleware, subscriptionGuard, async (req, res) => {
    try {
        const result = await query(
            'DELETE FROM catalog_items WHERE id = $1 AND org_id = $2 RETURNING id',
            [req.params.id, req.user!.orgId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Item não encontrado' });
            return;
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete catalog item error:', error);
        res.status(500).json({ error: 'Erro ao deletar item' });
    }
});

export default router;
