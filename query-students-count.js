const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_roWMuzpX7O1h@ep-little-glitter-an1nqoc1-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true', connectionTimeoutMillis: 10000 });
const timeout = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000);
(async () => {
  try {
    await client.connect();
    // Check students count per grade for Monica's grades
    const grades = [
      { num: 2, id: 'cmnaupc7e000084dsoxq2jlzi' },
      { num: 3, id: 'cmnaupcy7000184dsxh8ii11a' },
      { num: 4, id: 'cmnaupdju000284dssay22tb2' },
      { num: 5, id: 'cmnaupe0t000384dsacqrw33z' },
      { num: 6, id: 'cmnaupeb6000484dsvs4490n6' },
      { num: 7, id: 'cmnaupelj000584ds88thgn7v' },
      { num: 8, id: 'cmnaupevs000684ds2v5r5vol' },
      { num: 9, id: 'cmnaupf5z000784dsg2rgekf3' }
    ];
    for (const g of grades) {
      const res = await client.query("SELECT count(*) as total FROM \"Estudiante\" WHERE \"gradoId\" = '" + g.id + "' AND activo = true");
      console.log(g.num + '° A: ' + res.rows[0].total + ' estudiantes');
    }
  } catch(e) { console.log('ERROR:', e.message); }
  finally { clearTimeout(timeout); await client.end(); }
})().catch(e => console.error(e));
