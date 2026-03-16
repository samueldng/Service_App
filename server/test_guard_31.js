import pg from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        const orgRes = await pool.query("SELECT id FROM organizations LIMIT 1");
        if (orgRes.rows.length === 0) throw new Error("No orgs found");
        const orgId = orgRes.rows[0].id;

        const userRes = await pool.query("SELECT id, email, role FROM users WHERE org_id = $1 LIMIT 1", [orgId]);
        const user = userRes.rows[0];

        // Downgrade to starter
        await pool.query("UPDATE organizations SET subscription_plan = 'starter', max_equipments = 30 WHERE id = $1", [orgId]);
        console.log("✅ Downgraded organization to Starter (30 limit)");

        // Get or create client
        let clientRes = await pool.query("SELECT id FROM clients WHERE org_id = $1 LIMIT 1", [orgId]);
        if (clientRes.rows.length === 0) {
            clientRes = await pool.query("INSERT INTO clients (org_id, name, document, document_type, email, phone) VALUES ($1, 'Test Client Guard', '12345678901', 'CPF', 'a@a.com', '12345') RETURNING id", [orgId]);
        }
        const clientId = clientRes.rows[0].id;

        // Clear existing equipments to test properly
        await pool.query("DELETE FROM equipments WHERE client_id IN (SELECT id FROM clients WHERE org_id = $1)", [orgId]);
        console.log("✅ Cleared existing equipments");

        // Seed 30 equipments
        console.log("⏳ Seeding 30 equipments...");
        for (let i = 1; i <= 30; i++) {
            await pool.query("INSERT INTO equipments (client_id, name, brand, model) VALUES ($1, $2, $3, $4)", [clientId, `Guard Tester ${i}`, 'TestBrand', 'TM-200']);
        }
        console.log("✅ Successfully reached 30/30 equipments");

        // Generate JWT to test HTTP API
        const token = jwt.sign({ id: user.id, orgId: orgId, role: user.role, email: user.email }, process.env.JWT_SECRET);

        console.log("\n🧪 TEST: Attempting to insert the 31st equipment via HTTP API...");
        const res = await fetch("http://localhost:3333/api/equipments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                client_id: clientId,
                name: "The 31st Equipment (Should Fail)",
                brand: "BlockerBrand",
                model: "XX-99"
            })
        });

        const data = await res.json();
        console.log(`\nAPI Status Code: ${res.status}`);
        console.log(`API Response:`, data);

        if (res.status === 403 && data.error && data.error.includes("Limite do plano atingido")) {
            console.log("\n✅ SUCCESS: Virtual Guard blocked the 31st equipment perfectly!");
        } else {
            console.log("\n❌ FAILED: Virtual Guard did not behave as expected.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
