const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_roWMuzpX7O1h@ep-little-glitter-an1nqoc1-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true', connectionTimeoutMillis: 10000 });
const timeout = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000);
(async () => {
  try {
    await client.connect();
    const monicaId = 'cmnaupgt5000p84dsenyrqa5i';
    // Check califs count per grade
    const res = await client.query(
      "SELECT g.numero as grado, count(c.id) as total_califs, count(CASE WHEN c.\"calificacionAC\" IS NOT NULL THEN 1 END) as con_datos FROM \"Calificacion\" c JOIN \"Estudiante\" e ON c.\"estudianteId\" = e.id JOIN \"Materia\" m ON c.\"materiaId\" = m.id JOIN \"Grado\" g ON e.\"gradoId\" = g.id JOIN \"DocenteMateria\" dm ON dm.\"materiaId\" = m.id WHERE dm.\"docenteId\" = '" + monicaId + "' GROUP BY g.numero ORDER BY g.numero"
    );
    console.log('CALIFICACIONES POR GRADO:');
    res.rows.forEach(r => console.log(r.grado + '° A: ' + r.total_califs + ' registros, ' + r.con_datos + ' con datos'));
  } catch(e) { console.log('ERROR:', e.message); }
  finally { clearTimeout(timeout); await client.end(); }
})().catch(e => console.error(e));
