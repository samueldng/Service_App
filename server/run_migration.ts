import fs from 'fs';
import { query } from './src/config/db.js';

async function runMigration() {
    const fileArg = process.argv[2];
    if (!fileArg) {
        console.error('Nenhum arquivo de migração especificado.');
        process.exit(1);
    }

    try {
        const sql = fs.readFileSync(fileArg, 'utf8');
        await query(sql);
        console.log(`Migração ${fileArg} executada com sucesso!`);
    } catch (error) {
        console.error('Erro executando migração:', error);
    } finally {
        process.exit(0);
    }
}

runMigration();
