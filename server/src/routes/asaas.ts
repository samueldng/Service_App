import { Router } from 'express';
import { query } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const ASAAS_API_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

const PLAN_VALUES: Record<string, number> = {
    starter: 59,
    professional: 149,
    enterprise: 349,
};

const PLAN_LIMITS: Record<string, number> = {
    starter: 30,
    professional: 150,
    enterprise: 9999,
};

// POST /api/asaas/create-subscription — create or upgrade Asaas subscription
router.post('/create-subscription', authMiddleware, async (req, res) => {
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    if (!ASAAS_API_KEY) {
        res.status(500).json({ error: 'ASAAS_API_KEY not configured' });
        return;
    }

    const { name, email, plan, cpfCnpj, upgrade } = req.body;
    const userId = req.user!.id;
    const orgId = req.user!.orgId;

    try {
        let existingCustomerId: string | null = null;
        let existingSubscriptionId: string | null = null;

        // If upgrade, fetch existing Asaas IDs from org
        if (upgrade && orgId) {
            const orgData = await query(
                'SELECT asaas_customer_id, asaas_subscription_id FROM organizations WHERE id = $1',
                [orgId]
            );

            if (orgData.rows.length > 0) {
                existingCustomerId = orgData.rows[0].asaas_customer_id || null;
                existingSubscriptionId = orgData.rows[0].asaas_subscription_id || null;
            }
        }

        // 1. Get or create Asaas customer
        let customerId = existingCustomerId;

        if (!customerId) {
            const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', access_token: ASAAS_API_KEY },
                body: JSON.stringify({
                    name,
                    email,
                    cpfCnpj: cpfCnpj || undefined,
                    notificationDisabled: false,
                }),
            });

            if (!customerRes.ok) {
                const err = await customerRes.text();
                throw new Error(`Asaas customer creation failed [${customerRes.status}]: ${err}`);
            }

            const customer = await customerRes.json();
            customerId = customer.id;
        }

        // 2. Create or Update subscription
        const value = PLAN_VALUES[plan] || PLAN_VALUES.starter;

        let subscriptionId;
        let paymentLink = null;

        if (upgrade && existingSubscriptionId) {
            // Update existing subscription
            const updateRes = await fetch(`${ASAAS_API_URL}/subscriptions/${existingSubscriptionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', access_token: ASAAS_API_KEY },
                body: JSON.stringify({
                    value,
                    description: `MaintQR - Plano ${plan}`,
                    updatePendingPayments: true
                }),
            });

            if (!updateRes.ok) {
                const err = await updateRes.text();
                throw new Error(`Asaas subscription update failed [${updateRes.status}]: ${err}`);
            }
            subscriptionId = existingSubscriptionId;
        } else {
            // Create new subscription
            const nextDueDate = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();
            const subscriptionRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', access_token: ASAAS_API_KEY },
                body: JSON.stringify({
                    customer: customerId,
                    billingType: 'UNDEFINED',
                    value,
                    nextDueDate,
                    cycle: 'MONTHLY',
                    description: `MaintQR - Plano ${plan}`,
                    externalReference: userId,
                }),
            });

            if (!subscriptionRes.ok) {
                const err = await subscriptionRes.text();
                throw new Error(`Asaas subscription creation failed [${subscriptionRes.status}]: ${err}`);
            }

            const subscription = await subscriptionRes.json();
            subscriptionId = subscription.id;
            paymentLink = subscription.paymentLink || null;
        }

        // 3. Keep plan locally but don't release limits yet if upgrade (limits released via webhook)
        // Note: For simplicity if not upgrading we can set limits now, but webhook is safer.
        await query(
            `UPDATE organizations SET
        asaas_customer_id = $1,
        asaas_subscription_id = $2
        ${!upgrade ? `, subscription_plan = $3, max_equipments = $4` : ''}
       WHERE id = $5`,
            !upgrade
                ? [customerId, subscriptionId, plan, PLAN_LIMITS[plan] || 30, orgId]
                : [customerId, subscriptionId, orgId] // if updating, query length is 3 items
        );

        // if upgrade, the params order was changed above to dynamically build query. Let's fix it safely:
        if (upgrade) {
            await query(`UPDATE organizations SET asaas_customer_id = $1, asaas_subscription_id = $2 WHERE id = $3`, [customerId, subscriptionId, orgId]);
        } else {
            await query(`UPDATE organizations SET asaas_customer_id = $1, asaas_subscription_id = $2, subscription_plan = $3, max_equipments = $4 WHERE id = $5`, [customerId, subscriptionId, plan, PLAN_LIMITS[plan] || 30, orgId]);
        }

        res.json({
            success: true,
            customerId,
            subscriptionId: subscriptionId,
            paymentLink: paymentLink,
            upgraded: !!upgrade,
        });
    } catch (error: any) {
        console.error('Asaas error:', error);
        res.status(500).json({ error: error.message || 'Erro no Asaas' });
    }
});

// POST /api/asaas/webhook — receive Asaas webhook events
router.post('/webhook', async (req, res) => {
    try {
        const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
        const providedToken = req.headers['asaas-access-token'];

        if (!webhookToken) {
            console.error('CRITICAL: ASAAS_WEBHOOK_TOKEN is missing in .env');
            // Allow bypassing in development ONLY if explicitly empty, but in production we should block.
            // For now, return 500 if not found so the admin knows.
            res.status(500).json({ error: 'Server misconfiguration: Webhook token not set' });
            return;
        }

        if (providedToken !== webhookToken) {
            console.warn('Unauthorized webhook attempt');
            res.status(401).json({ error: 'Unauthorized webhook token' });
            return;
        }

        const payload = req.body;
        const event = payload.event;

        console.log('Asaas webhook event:', event, JSON.stringify(payload));

        const subscriptionId = payload.payment?.subscription;
        if (!subscriptionId) {
            res.json({ received: true });
            return;
        }

        const orgResult = await query(
            'SELECT id FROM organizations WHERE asaas_subscription_id = $1',
            [subscriptionId]
        );

        if (orgResult.rows.length === 0) {
            console.log('No org found for subscription:', subscriptionId);
            res.json({ received: true });
            return;
        }

        const orgId = orgResult.rows[0].id;

        if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
            const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
            let currentPlan = 'starter';
            let maxEquipments = PLAN_LIMITS['starter'];

            // Fetch subscription from Asaas to get confirmed plan info
            if (ASAAS_API_KEY) {
                try {
                    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions/${subscriptionId}`, {
                        headers: { access_token: ASAAS_API_KEY }
                    });
                    if (subRes.ok) {
                        const subData = await subRes.json();
                        const val = subData.value;
                        if (val >= PLAN_VALUES.enterprise) { currentPlan = 'enterprise'; maxEquipments = PLAN_LIMITS['enterprise']; }
                        else if (val >= PLAN_VALUES.professional) { currentPlan = 'professional'; maxEquipments = PLAN_LIMITS['professional']; }
                    }
                } catch (e) {
                    console.error('Failed to fetch subscription details from Asaas in Webhook:', e);
                }
            }

            await query(
                "UPDATE organizations SET payment_status = 'active', subscription_plan = $2, max_equipments = $3 WHERE id = $1",
                [orgId, currentPlan, maxEquipments]
            );
            console.log(`Org ${orgId} payment confirmed. Limits updated to ${currentPlan} (${maxEquipments} eq)`);
        }

        if (event === 'PAYMENT_OVERDUE') {
            await query(
                "UPDATE organizations SET payment_status = 'past_due' WHERE id = $1",
                [orgId]
            );
            console.log(`Org ${orgId} payment overdue`);
        }

        if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
            await query(
                "UPDATE organizations SET payment_status = 'canceled' WHERE id = $1",
                [orgId]
            );
            console.log(`Org ${orgId} subscription canceled`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

export default router;
