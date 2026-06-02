const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/^DATABASE_URL="?(.+?)"?\s*$/m);
const DATABASE_URL = match[1];

const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 15000 });

(async () => {
  try {
    await client.connect();
    console.log('Connected.\n');

    // Find Mejía Hernández, Luis Antonio
    const studentRes = await client.query(
      `SELECT id, nombre, numero, "gradoId" FROM "Estudiante"
       WHERE nombre ILIKE '%Mejía Hernández%' OR nombre ILIKE '%Mejia Hernandez%'
       ORDER BY nombre`
    );
    console.log(`Found ${studentRes.rows.length} match(es):`);
    studentRes.rows.forEach(r => console.log(`  ${r.id} | No: ${r.numero} | ${r.nombre} | GradoId: ${r.gradoId}`));

    const student = studentRes.rows[0];
    if (!student) {
      console.log('\nSTUDENT NOT FOUND.');
      await client.end();
      return;
    }

    console.log(`\n=== ESTUDIANTE: ${student.nombre} (No. ${student.numero}) ===`);

    // Grado
    const g = (await client.query(`SELECT numero, seccion FROM "Grado" WHERE id = $1`, [student.gradoId])).rows[0];
    console.log(`Grado: ${g.numero}° ${g.seccion}\n`);

    // All calificaciones
    const califs = (await client.query(
      `SELECT
         c.id, c."materiaId", m.nombre as materia_nombre,
         c.trimestre, c."calificacionAC", c."calificacionAI",
         c."examenTrimestral", c."promedioFinal", c.recuperacion
       FROM "Calificacion" c
       JOIN "Materia" m ON c."materiaId" = m.id
       WHERE c."estudianteId" = $1
       ORDER BY m.nombre, c.trimestre`,
      [student.id]
    )).rows;

    console.log(`TOTAL CALIFICACIONES: ${califs.length} records\n`);

    // Group by materia
    const byMat = {};
    califs.forEach(r => {
      if (!byMat[r.materia_nombre]) byMat[r.materia_nombre] = [];
      byMat[r.materia_nombre].push(r);
    });

    for (const [mat, recs] of Object.entries(byMat)) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`  MATERIA: ${mat}`);
      console.log(`${'='.repeat(70)}`);
      recs.forEach(r => {
        console.log(
          `  Trimestre ${r.trimestre}:`
        );
        console.log(`    Actividades Cotidianas (AC)  : ${r.calificacionAC ?? 'NULL'}`);
        console.log(`    Actividades Integradoras (AI): ${r.calificacionAI ?? 'NULL'}`);
        console.log(`    Examen Trimestral           : ${r.examenTrimestral ?? 'NULL'}`);
        console.log(`    Recuperación                : ${r.recuperacion ?? 'NULL'}`);
        console.log(`    Promedio Final              : ${r.promedioFinal ?? 'NULL'}`);
        console.log(`    Calificacion ID             : ${r.id}`);
      });
    }

    // Export to JSON
    fs.writeFileSync('query-luis-mejia.json', JSON.stringify({ estudiante: student, grado: g, calificaciones: califs }, null, 2));
    console.log(`\n${'='.repeat(70)}`);
    console.log(`\nJSON export saved to query-luis-mejia.json`);

  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.stack) console.error(e.stack);
  } finally {
    await client.end();
  }
})().catch(e => console.error(e));
