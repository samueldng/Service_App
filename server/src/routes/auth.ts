import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password, company, plan, cpfCnpj } = req.body;

    if (!name || !email || !password || !company) {
        res.status(400).json({ error: 'Campos obrigatórios: name, email, password, company' });
        return;
    }

    try {
        // Check if email already exists
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            res.status(409).json({ error: 'Email já cadastrado' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const selectedPlan = plan || 'starter';

        // Transaction: create org + user
        await query('BEGIN');

        try {
            // 1. Create organization
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 7);

            const orgResult = await query(
                `INSERT INTO organizations (name, subscription_plan, payment_status, trial_ends_at)
         VALUES ($1, $2, 'active', $3)
         RETURNING id`,
                [company, selectedPlan, trialEndsAt.toISOString()]
            );
            const orgId = orgResult.rows[0].id;

            // 2. Create user linked to org
            const userResult = await query(
                `INSERT INTO users (id, org_id, name, email, password_hash, role)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'admin')
         RETURNING id, org_id, name, email, role, avatar_url`,
                [orgId, name, email, passwordHash]
            );
            const user = userResult.rows[0];

            await query('COMMIT');

            // 3. Generate JWT
            const token = jwt.sign(
                { id: user.id, orgId: user.org_id, role: user.role, email: user.email },
                process.env.JWT_SECRET!,
                { expiresIn: '7d' }
            );

            res.status(201).json({
                token,
                user: {
                    id: user.id,
                    orgId: user.org_id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar_url,
                },
            });
        } catch (txError) {
            await query('ROLLBACK');
            throw txError;
        }
    } catch (error: any) {
        console.error('Register error:', error);
        if (error.code === '23505') {
            res.status(409).json({ error: 'Email já cadastrado' });
            return;
        }
        res.status(500).json({ error: error.message || 'Erro ao criar conta' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email e senha são obrigatórios' });
        return;
    }

    try {
        const result = await query(
            'SELECT id, org_id, name, email, password_hash, role, avatar_url FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const user = result.rows[0];

        if (!user.password_hash) {
            res.status(401).json({ error: 'Senha não configurada. Entre em contato com o administrador.' });
            return;
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, orgId: user.org_id, role: user.role, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                orgId: user.org_id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar_url,
            },
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, org_id, name, email, role, avatar_url FROM users WHERE id = $1',
            [req.user!.id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }

        const user = result.rows[0];
        res.json({
            id: user.id,
            orgId: user.org_id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar_url,
        });
    } catch (error: any) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
