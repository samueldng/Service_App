import { Router } from 'express';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { subscriptionGuard } from '../middleware/subscriptionGuard.js';

const router = Router();

// GET /api/clients — list all clients for the user's org
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM clients WHERE org_id = $1 ORDER BY name',
            [req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get clients error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/clients/:id — get client by ID (with org check)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM clients WHERE id = $1 AND org_id = $2',
            [req.params.id, req.user!.orgId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Get client error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/clients — create client
router.post('/', authMiddleware, subscriptionGuard, async (req, res) => {
    const { name, document, document_type, email, phone, address } = req.body;

    if (!name || !document) {
        res.status(400).json({ error: 'Nome e documento são obrigatórios' });
        return;
    }

    try {
        const result = await query(
            `INSERT INTO clients (org_id, name, document, document_type, email, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [req.user!.orgId, name, document, document_type, email, phone, address]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Create client error:', error);
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// PATCH /api/clients/:id — update client
router.patch('/:id', authMiddleware, subscriptionGuard, async (req, res) => {
    const allowedFields = ['name', 'document', 'document_type', 'email', 'phone', 'address'];
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
            `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Update client error:', error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// DELETE /api/clients/:id — delete client
router.delete('/:id', authMiddleware, subscriptionGuard, async (req, res) => {
    try {
        const result = await query(
            'DELETE FROM clients WHERE id = $1 AND org_id = $2 RETURNING id',
            [req.params.id, req.user!.orgId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Cliente não encontrado' });
            return;
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete client error:', error);
        res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
});

export default router;
