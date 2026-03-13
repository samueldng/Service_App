import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function setupLocalDb() {
    try {
        console.log('Creating mock auth schema for Supabase compatibility...');
        await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY);
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$ SELECT uuid_generate_v4(); $$ LANGUAGE sql STABLE;
    `);

        console.log('Reading full Supabase schema...');
        const schemaPath = path.join(process.cwd(), '../supabase_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing base schema...');
        await pool.query(schemaSql);

        console.log('Reading VPS migration script...');
        const migrationPath = path.join(process.cwd(), 'migrations', '001_add_auth_columns.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration script...');
        await pool.query(migrationSql);

        console.log('Local Database Setup Successful!');
    } catch (err) {
        console.error('Database setup failed:', err);
    } finally {
        pool.end();
    }
}

setupLocalDb();
