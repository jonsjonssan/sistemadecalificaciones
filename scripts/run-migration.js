const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_roWMuzpX7O1h@ep-little-glitter-an1nqoc1-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true';
const client = new Client({ connectionString, connectionTimeoutMillis: 30000 });

(async () => {
  try {
    console.log('Conectando a la BD...');
    await client.connect();
    console.log('Conectado. Ejecutando migración multi-tenencia...');

    const sqlPath = path.join(__dirname, 'migrate-multitenancy.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Migración aplicada correctamente.');

    const esc = await client.query('SELECT id, nombre, codigo FROM "Escuela"');
    console.log('Escuelas:', JSON.stringify(esc.rows, null, 2));

    const u = await client.query('SELECT count(*) as n FROM "Usuario" WHERE "escuelaId" IS NULL');
    console.log('Usuarios sin escuelaId:', u.rows[0].n);

    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Usuario' AND column_name = 'escuelaId'");
    console.log('Usuario.escuelaId existe:', cols.rows.length > 0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
