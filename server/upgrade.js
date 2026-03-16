import pg from 'pg';

const pool = new pg.Pool({
    connectionString: 'postgresql://postgres:A!S%40d3f4g5h6@localhost:5432/maintqr_db?schema=public'
});

async function upgrade() {
    try {
        const res = await pool.query("UPDATE organizations SET subscription_plan = 'professional' RETURNING id, name, subscription_plan");
        console.log('Upgraded organizations:', res.rows);
    } catch (err) {
        console.error('Error upgrading:', err);
    } finally {
        await pool.end();
    }
}

upgrade();
