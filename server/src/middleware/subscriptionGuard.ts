import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db.js';

/**
 * Subscription Guard Middleware
 * 1. Checks if the organization's payment is overdue or trial expired.
 * 2. If blocked, prevents POST, PATCH, DELETE operations (Read-Only mode).
 * 3. Can be used to check if the user has a specific plan for premium features.
 */
export const subscriptionGuard = async (req: Request, res: Response, next: NextFunction) => {
    // Only block mutating methods on resources
    if (req.method === 'GET') {
        return next();
    }

    try {
        const orgId = req.user!.orgId;

        const result = await query(
            'SELECT payment_status, trial_ends_at, asaas_subscription_id FROM organizations WHERE id = $1',
            [orgId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Organization not found' });
            return;
        }

        let { payment_status, trial_ends_at, asaas_subscription_id } = result.rows[0];

        // Check if trial is expired and no active subscription exists
        if (!asaas_subscription_id && trial_ends_at) {
            const now = new Date();
            const trialEnd = new Date(trial_ends_at);
            if (now > trialEnd) {
                payment_status = 'trial_expired';
            }
        }

        // Block writing if not active
        if (payment_status !== 'active') {
            res.status(403).json({
                error: 'Sua assinatura ou período de teste expirou. Atualize seu plano para continuar gerenciando dados.',
                code: 'SUBSCRIPTION_BLOCKED',
                payment_status
            });
            return;
        }

        next();
    } catch (error) {
        console.error('Subscription Guard Error:', error);
        res.status(500).json({ error: 'Internal Server Error connecting to subscription check' });
    }
};

/**
 * Feature Guard Middleware
 * Checks if the organization is on required or better plan.
 */
export const featureGuard = (requiredPlans: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orgId = req.user!.orgId;

            const result = await query(
                'SELECT subscription_plan FROM organizations WHERE id = $1',
                [orgId]
            );

            if (result.rows.length === 0) {
                res.status(404).json({ error: 'Organization not found' });
                return;
            }

            const currentPlan = result.rows[0].subscription_plan || 'starter';

            if (!requiredPlans.includes(currentPlan) && !requiredPlans.includes('enterprise')) {
                res.status(403).json({
                    error: 'Seu plano atual não possui acesso a esse recurso. Faça um upgrade para utilizar.',
                    code: 'FEATURE_BLOCKED'
                });
                return;
            }

            next();
        } catch (error) {
            console.error('Feature Guard Error:', error);
            res.status(500).json({ error: 'Internal Server Error connecting to feature guard' });
        }
    };
};
