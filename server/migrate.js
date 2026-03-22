import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function ensureMigrationsTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `);
}

async function getAppliedMigrations(client) {
    const result = await client.query('SELECT filename FROM migrations ORDER BY filename');
    return new Set(result.rows.map(r => r.filename));
}

async function runMigrations() {
    const client = await pool.connect();

    try {
        // 1. Ensure tracking table exists
        await ensureMigrationsTable(client);

        // 2. Get already-applied migrations
        const applied = await getAppliedMigrations(client);

        // 3. Read all .sql files from migrations/ folder, sorted alphabetically
        const migrationsDir = path.join(process.cwd(), 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('No migration files found.');
            return;
        }

        console.log(`Found ${files.length} migration file(s). ${applied.size} already applied.\n`);

        let newCount = 0;

        for (const file of files) {
            if (applied.has(file)) {
                console.log(`⏭️  SKIP  ${file} (already applied)`);
                continue;
            }

            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`▶️  RUN   ${file} ...`);

            // Run migration + record it in a transaction
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`✅  OK    ${file}`);
                newCount++;
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`❌  FAIL  ${file}:`, err.message);
                throw err; // Stop on first failure
            }
        }

        console.log(`\nDone! ${newCount} new migration(s) applied.`);
    } catch (err) {
        console.error('\nMigration process failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

runMigrations();
