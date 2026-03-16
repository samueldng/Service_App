import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    const result = await pool.query('SELECT name, subscription_plan, max_equipments, payment_status, trial_ends_at FROM organizations ORDER BY created_at DESC LIMIT 1');
    console.log(JSON.stringify(result.rows, null, 2));
    await pool.end();
}
check();
