import { Router } from 'express';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/organizations — returns the authenticated user's organization
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM organizations WHERE id = $1',
            [req.user!.orgId]
        );

        if (result.rows.length === 0) {
            res.json(null);
            return;
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Get org error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// PATCH /api/organizations/:id — update organization
router.patch('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    if (id !== req.user!.orgId) {
        res.status(403).json({ error: 'Sem permissão para editar esta organização' });
        return;
    }

    const allowedFields = [
        'name', 'document', 'email', 'phone', 'logo_url', 'brand_color',
        'subscription_plan', 'payment_status', 'address', 'city', 'state', 'cep',
        'owner_name', 'pix_key', 'bank_name', 'bank_agency', 'bank_account',
        'bank_account_type', 'bank_holder'
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

    values.push(id);

    try {
        const result = await query(
            `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Organização não encontrada' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Update org error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
