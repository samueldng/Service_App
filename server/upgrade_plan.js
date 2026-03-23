import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function upgrade() {
    try {
        const email = 'qa.test.maintqr@gmail.com';
        const userRes = await pool.query('SELECT org_id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found.');
            return;
        }
        const orgId = userRes.rows[0].org_id;
        console.log(`Upgrading org ${orgId} to pro...`);
        
        await pool.query('UPDATE organizations SET subscription_plan = $1 WHERE id = $2', ['pro', orgId]);
        console.log('Successfully upgraded organization to PRO plan.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

upgrade();
