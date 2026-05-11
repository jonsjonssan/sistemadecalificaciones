const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_roWMuzpX7O1h@ep-little-glitter-an1nqoc1-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true', connectionTimeoutMillis: 10000 });
const timeout = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 30000);
(async () => {
  try {
    await client.connect();
    const monicaId = 'cmnaupgt5000p84dsenyrqa5i';
    
    // Get all calificaciones for Monica's subjects across all trimesters
    const califsRes = await client.query(
      "SELECT c.id, c.\"estudianteId\", c.\"materiaId\", c.trimestre, c.\"calificacionAC\", c.\"calificacionAI\", c.\"examenTrimestral\", c.\"promedioFinal\", c.recuperacion, e.nombre as estudiante_nombre, e.numero as estudiante_numero, m.nombre as materia_nombre, g.numero as grado_numero, g.seccion as grado_seccion, g.id as grado_id FROM \"Calificacion\" c JOIN \"Estudiante\" e ON c.\"estudianteId\" = e.id JOIN \"Materia\" m ON c.\"materiaId\" = m.id JOIN \"Grado\" g ON e.\"gradoId\" = g.id JOIN \"DocenteMateria\" dm ON dm.\"materiaId\" = m.id WHERE dm.\"docenteId\" = '" + monicaId + "' ORDER BY g.numero, e.numero, m.nombre, c.trimestre"
    );
    console.log('CALIFICACIONES DE MONICA:');
    console.log('Total registros:', califsRes.rows.length);
    
    // Group by grade
    const byGrade = {};
    califsRes.rows.forEach(r => {
      const key = r.grado_numero + '° ' + r.grado_seccion;
      if (!byGrade[key]) byGrade[key] = { grado: r.grado_numero, seccion: r.grado_seccion, materia: r.materia_nombre, estudiantes: {} };
      const estKey = r.estudiante_numero + '-' + r.estudiante_nombre;
      if (!byGrade[key].estudiantes[estKey]) byGrade[key].estudiantes[estKey] = { numero: r.estudiante_numero, nombre: r.estudiante_nombre, califs: {} };
      byGrade[key].estudiantes[estKey].califs['T' + r.trimestre] = { AC: r.calificacionAC, AI: r.calificacionAI, Examen: r.examenTrimestral, Final: r.promedioFinal, Recuperacion: r.recuperacion };
    });
    
    fs.writeFileSync('./query-monica-califs.json', JSON.stringify(byGrade, null, 2));
    console.log('DONE - saved to query-monica-califs.json');
  } catch(e) {
    console.log('ERROR:', e.message);
  } finally {
    clearTimeout(timeout);
    await client.end();
  }
})().catch(e => console.error(e));
