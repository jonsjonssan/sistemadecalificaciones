const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_roWMuzpX7O1h@ep-little-glitter-an1nqoc1-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true', connectionTimeoutMillis: 10000 });
const timeout = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000);
(async () => {
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected!');
    const res = await client.query("SELECT id, nombre, rol, email FROM \"Usuario\" WHERE rol IN ('docente', 'docente-orientador') ORDER BY nombre");
    console.log('Found', res.rows.length, 'teachers');
    fs.writeFileSync('./query-teachers-result.json', JSON.stringify(res.rows, null, 2));
    console.log('DONE');
  } catch(e) {
    console.log('ERROR:', e.message);
    fs.writeFileSync('./query-teachers-error.txt', e.message);
  } finally {
    clearTimeout(timeout);
    await client.end();
  }
})().catch(e => console.error(e));
