import { Router } from 'express';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/sectors — list all sectors for the user's org (via clients join)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `SELECT s.* FROM sectors s
       JOIN clients c ON s.client_id = c.id
       WHERE c.org_id = $1
       ORDER BY s.name`,
            [req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get sectors error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/sectors — create sector
router.post('/', authMiddleware, async (req, res) => {
    const { name, description, client_id } = req.body;

    if (!name || !client_id) {
        res.status(400).json({ error: 'Nome e client_id são obrigatórios' });
        return;
    }

    // Verify client belongs to user's org
    const clientCheck = await query(
        'SELECT id FROM clients WHERE id = $1 AND org_id = $2',
        [client_id, req.user!.orgId]
    );

    if (clientCheck.rows.length === 0) {
        res.status(403).json({ error: 'Cliente não pertence à sua organização' });
        return;
    }

    try {
        const result = await query(
            `INSERT INTO sectors (client_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [client_id, name, description]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Create sector error:', error);
        res.status(500).json({ error: 'Erro ao criar setor' });
    }
});

// PATCH /api/sectors/:id — update sector
router.patch('/:id', authMiddleware, async (req, res) => {
    const allowedFields = ['name', 'description', 'client_id'];
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
            `UPDATE sectors SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       AND client_id IN (SELECT id FROM clients WHERE org_id = $${paramIndex + 1})
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Setor não encontrado' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Update sector error:', error);
        res.status(500).json({ error: 'Erro ao atualizar setor' });
    }
});

// DELETE /api/sectors/:id — delete sector
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            `DELETE FROM sectors
       WHERE id = $1
       AND client_id IN (SELECT id FROM clients WHERE org_id = $2)
       RETURNING id`,
            [req.params.id, req.user!.orgId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Setor não encontrado' });
            return;
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete sector error:', error);
        res.status(500).json({ error: 'Erro ao deletar setor' });
    }
});

export default router;
