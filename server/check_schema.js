import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    const ordCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'`);
    console.log('orders columns:', ordCols.rows.map(r => r.column_name).join(', '));

    const orgCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'organizations'`);
    console.log('organizations columns:', orgCols.rows.map(r => r.column_name).join(', '));

    const orgData = await pool.query(`SELECT subscription_plan, payment_status, trial_ends_at FROM organizations LIMIT 1`);
    console.log('org data:', orgData.rows[0]);

    pool.end();
}
check().catch(e => { console.error(e); pool.end(); });
