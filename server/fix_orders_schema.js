import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
    console.log('Adding order_number to orders...');
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER`);
    console.log('Done.');

    console.log('Adding order_counter to organizations...');
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS order_counter INTEGER DEFAULT 0`);
    console.log('Done.');

    console.log('Adding extra org columns if missing...');
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cep TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_name TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pix_key TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_name TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_agency TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_account TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_account_type TEXT`);
    await pool.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_holder TEXT`);
    console.log('Done.');

    console.log('Upgrading ALL orgs to pro plan...');
    await pool.query(`UPDATE organizations SET subscription_plan = 'pro' WHERE subscription_plan = 'starter'`);
    console.log('Done.');

    // Verify
    const r = await pool.query(`SELECT id, name, subscription_plan, order_counter FROM organizations`);
    console.log('All orgs:', r.rows);

    pool.end();
}
fix().catch(e => { console.error(e); pool.end(); });
