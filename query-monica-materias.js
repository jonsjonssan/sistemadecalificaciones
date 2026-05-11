const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_roWMuzpX7O1h@ep-little-glitter-an1nqoc1-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true', connectionTimeoutMillis: 10000 });
const timeout = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000);
(async () => {
  try {
    await client.connect();
    const monicaId = 'cmnaupgt5000p84dsenyrqa5i';
    const materiasRes = await client.query("SELECT dm.id, dm.\"docenteId\", dm.\"materiaId\", m.nombre as materia_nombre, m.\"gradoId\", g.numero as grado_numero, g.seccion as grado_seccion FROM \"DocenteMateria\" dm JOIN \"Materia\" m ON dm.\"materiaId\" = m.id JOIN \"Grado\" g ON m.\"gradoId\" = g.id WHERE dm.\"docenteId\" = '" + monicaId + "' ORDER BY g.numero, m.nombre");
    console.log('MATERIAS DE MONICA:');
    console.log(JSON.stringify(materiasRes.rows, null, 2));
    const gradosRes = await client.query("SELECT id, numero, seccion, año FROM \"Grado\" WHERE numero BETWEEN 2 AND 9 ORDER BY numero, seccion");
    console.log('\nGRADOS 2-9:');
    console.log(JSON.stringify(gradosRes.rows, null, 2));
    fs.writeFileSync('./query-monica-materias.json', JSON.stringify({ materias: materiasRes.rows, grados: gradosRes.rows }, null, 2));
    console.log('\nDONE');
  } catch(e) {
    console.log('ERROR:', e.message);
  } finally {
    clearTimeout(timeout);
    await client.end();
  }
})().catch(e => console.error(e));
