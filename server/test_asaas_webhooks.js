import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const WEBHOOK_URL = 'http://localhost:3333/api/asaas/webhook';
const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

async function sendWebhook(event, subscriptionId) {
    const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'asaas-access-token': WEBHOOK_TOKEN
        },
        body: JSON.stringify({
            event: event,
            payment: { subscription: subscriptionId }
        })
    });
    return res.json();
}

async function run() {
    try {
        console.log("🛠️ Starting Webhook Simulation Tests...\n");

        // Setup initial org
        const orgRes = await pool.query("SELECT id FROM organizations LIMIT 1");
        if (orgRes.rows.length === 0) throw new Error("No orgs found");
        const orgId = orgRes.rows[0].id;

        const subId = "sub_test_123456";
        await pool.query("UPDATE organizations SET asaas_subscription_id = $1, payment_status = 'past_due', subscription_plan = 'starter', max_equipments = 30 WHERE id = $2", [subId, orgId]);

        console.log(`✅ Base Setup: Org [${orgId}] mapped to Subscription [${subId}].\n`);

        // TEST 1: PAYMENT_CONFIRMED (Pix caiu)
        console.log("🟢 Simulating EVENT: PAYMENT_CONFIRMED");
        await sendWebhook('PAYMENT_CONFIRMED', subId);
        await new Promise(r => setTimeout(r, 500)); // wait for db
        let check1 = await pool.query("SELECT payment_status, subscription_plan, max_equipments FROM organizations WHERE id = $1", [orgId]);
        console.log(`   -> Status: ${check1.rows[0].payment_status}`);
        if (check1.rows[0].payment_status === 'active') console.log(`   ✅ SUCCESS: Account activated.\n`);
        else console.log(`   ❌ FAILED: Account not active.\n`);

        // TEST 2: PAYMENT_OVERDUE (Boleto Venceu)
        console.log("🔴 Simulating EVENT: PAYMENT_OVERDUE");
        await sendWebhook('PAYMENT_OVERDUE', subId);
        await new Promise(r => setTimeout(r, 500));
        let check2 = await pool.query("SELECT payment_status FROM organizations WHERE id = $1", [orgId]);
        console.log(`   -> Status: ${check2.rows[0].payment_status}`);
        if (check2.rows[0].payment_status === 'past_due') console.log(`   ✅ SUCCESS: Account marked as past_due (Virtual Guards Enabled).\n`);
        else console.log(`   ❌ FAILED: Account not overdue.\n`);

        // TEST 3: SUBSCRIPTION_DELETED (Cancelamento)
        console.log("⚫ Simulating EVENT: PAYMENT_DELETED");
        await sendWebhook('PAYMENT_DELETED', subId);
        await new Promise(r => setTimeout(r, 500));
        let check3 = await pool.query("SELECT payment_status FROM organizations WHERE id = $1", [orgId]);
        console.log(`   -> Status: ${check3.rows[0].payment_status}`);
        if (check3.rows[0].payment_status === 'canceled') console.log(`   ✅ SUCCESS: Account marked as canceled (Frozen).\n`);
        else console.log(`   ❌ FAILED: Account not canceled.\n`);

        // TEST 4: UNAUTHORIZED REQUEST
        console.log("🚨 Simulating UNAUTHORIZED Webhook Request (Missing Token)...");
        const resUnauth = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'PAYMENT_CONFIRMED', payment: { subscription: subId } })
        });
        if (resUnauth.status === 401) console.log(`   ✅ SUCCESS: Fake webhook blocked (HTTP 401).\n`);
        else console.log(`   ❌ FAILED: Fake webhook bypassed security [HTTP ${resUnauth.status}].\n`);

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        pool.end();
    }
}

run();
