import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export async function query<T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<pg.QueryResult<T>> {
    return pool.query<T>(text, params);
}

export default pool;
