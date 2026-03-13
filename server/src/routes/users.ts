import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/users — list users in the authenticated user's organization
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, org_id, name, email, role, avatar_url, created_at FROM users WHERE org_id = $1 ORDER BY name',
            [req.user!.orgId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST /api/users/technician — create a technician in the same org
router.post('/technician', authMiddleware, async (req, res) => {
    if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Apenas administradores podem criar técnicos' });
        return;
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        return;
    }

    if (password.length < 6) {
        res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
        return;
    }

    try {
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            res.status(409).json({ error: 'Email já cadastrado' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await query(
            `INSERT INTO users (id, org_id, name, email, password_hash, role)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'technician')
       RETURNING id, org_id, name, email, role, created_at`,
            [req.user!.orgId, name, email, passwordHash]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Create technician error:', error);
        if (error.code === '23505') {
            res.status(409).json({ error: 'Email já cadastrado' });
            return;
        }
        res.status(500).json({ error: 'Erro ao criar técnico' });
    }
});

// DELETE /api/users/:id — delete a technician (admin only, same org)
router.delete('/:id', authMiddleware, async (req, res) => {
    if (req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Apenas administradores podem remover usuários' });
        return;
    }

    if (req.params.id === req.user!.id) {
        res.status(400).json({ error: 'Você não pode remover a si mesmo' });
        return;
    }

    try {
        const result = await query(
            'DELETE FROM users WHERE id = $1 AND org_id = $2 AND role = $3 RETURNING id',
            [req.params.id, req.user!.orgId, 'technician']
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Técnico não encontrado' });
            return;
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete technician error:', error);
        res.status(500).json({ error: 'Erro ao remover técnico' });
    }
});

export default router;
