// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // 1. Get all calificaciones with their configs and notaActividad records
  const califs = await db.calificacion.findMany({
    include: {
      materia: { include: { grado: true } },
      notasActividad: true,
      estudiante: { select: { id: true, numero: true, nombre: true } },
    },
    orderBy: [{ materia: { nombre: 'asc' } }, { estudiante: { numero: 'asc' } }]
  });

  console.log('=== VERIFICACIÓN DE PROMEDIOS ===\n');
  let discrepancias = 0;
  // Group config by materiaId + trimestre
  const configs = await db.configActividad.findMany();
  const configMap = new Map();
  for (const cfg of configs) {
    configMap.set(cfg.materiaId + '-' + cfg.trimestre, cfg);
  }

  for (const c of califs) {
    const cfg = configMap.get(c.materiaId + '-' + c.trimestre);
    if (!cfg) continue; // no config to compare

    // Recalculate promedioFinal from saved data
    const acNotas = c.notasActividad.filter(n => n.tipo === 'cotidiana').map(n => n.nota);
    const aiNotas = c.notasActividad.filter(n => n.tipo === 'integradora').map(n => n.nota);
    
    const acAvg = acNotas.length > 0 ? acNotas.reduce((a, b) => a + b, 0) / acNotas.length : null;
    const aiAvg = aiNotas.length > 0 ? aiNotas.reduce((a, b) => a + b, 0) / aiNotas.length : null;
    const exam = c.examenTrimestral;

    // Recalculate using same formula as API
    const porcAC = cfg.porcentajeAC / 100;
    const porcAI = cfg.porcentajeAI / 100;
    const porcExam = cfg.tieneExamen ? cfg.porcentajeExamen / 100 : 0;
    const recup = c.recuperacion;

    const hasNotas = acAvg !== null || aiAvg !== null || exam !== null;
    if (!hasNotas) continue; // skip empty records

    let recalcProm = null;
    if (cfg && hasNotas) {
      const suma = (acAvg ?? 0) * porcAC + (aiAvg ?? 0) * porcAI + ((exam ?? 0)) * porcExam;
      recalcProm = isNaN(suma) ? null : suma;
      if (recup !== null) {
        recalcProm = Math.min(10, (recalcProm ?? 0) + recup);
      }
    }

    // Compare recalced prom with stored prom
    const storedProm = c.promedioFinal;
    if (storedProm !== null && recalcProm !== null) {
      const diff = Math.abs(storedProm - recalcProm);
      if (diff > 0.01) {
        discrepancias++;
        const g = c.materia.grado;
        console.log(`DISCREPANCIA #${discrepancias}:`);
        console.log(`  ${c.materia.nombre} | ${g.numero}° "${g.seccion}" | #${c.estudiante.numero} ${c.estudiante.nombre} | T${c.trimestre}`);
        console.log(`  AC: ${JSON.stringify(acNotas)} (prom=${acAvg?.toFixed(2) ?? '-'}) | AI: ${JSON.stringify(aiNotas)} (prom=${aiAvg?.toFixed(2) ?? '-'}) | Ex: ${exam} | Rec: ${recup}`);
        console.log(`  Config: AC=${cfg.porcentajeAC}% AI=${cfg.porcentajeAI}% Ex=${cfg.porcentajeExamen}% tieneEx=${cfg.tieneExamen}`);
        console.log(`  Almacenado: ${storedProm.toFixed(4)} | Recalculado: ${recalcProm.toFixed(4)} | Diferencia: ${diff.toFixed(4)}`);
        console.log('---');
      }
    } else if ((storedProm === null) !== (recalcProm === null)) {
      // One is null and the other isn't
      discrepancias++;
      const g = c.materia.grado;
      console.log(`DISCREPANCIA (null mismatch) #${discrepancias}:`);
      console.log(`  ${c.materia.nombre} | ${g.numero}° "${g.seccion}" | #${c.estudiante.numero} ${c.estudiante.nombre} | T${c.trimestre}`);
      console.log(`  Almacenado: ${storedProm} | Recalculado: ${recalcProm}`);
      console.log(`  AC: ${JSON.stringify(acNotas)} AI: ${JSON.stringify(aiNotas)} Ex: ${exam} Rec: ${recup}`);
      console.log('---');
    }
  }

  if (discrepancias === 0) {
    console.log('✅ Todas las calificaciones tienen promedios correctamente calculados.');
  } else {
    console.log(`\n⚠️ Se encontraron ${discrepancias} discrepancias.`);
  }

  // 2. Check student-level averages (for boleta/dashboard)
  console.log('\n=== VERIFICACIÓN DE PROMEDIOS POR ESTUDIANTE ===');
  const studentGroups = {};
  for (const c of califs) {
    const key = c.estudianteId;
    if (!studentGroups[key]) {
      studentGroups[key] = {
        nombre: c.estudiante.nombre,
        numero: c.estudiante.numero,
        materia: c.materia.nombre,
        grado: `${c.materia.grado.numero}° "${c.materia.grado.seccion}"`,
        trimestre: c.trimestre,
        storedProms: [],
        recalcProms: [],
      };
    }
    const s = studentGroups[key];
    const cfg = configMap.get(c.materiaId + '-' + c.trimestre);
    if (!cfg) continue;
    
    // Recalculate promedioFinal from saved data
    const acNotas = c.notasActividad.filter(n => n.tipo === 'cotidiana').map(n => n.nota);
    const aiNotas = c.notasActividad.filter(n => n.tipo === 'integradora').map(n => n.nota);
    const acAvg = acNotas.length > 0 ? acNotas.reduce((a, b) => a + b, 0) / acNotas.length : null;
    const aiAvg = aiNotas.length > 0 ? aiNotas.reduce((a, b) => a + b, 0) / aiNotas.length : null;
    const exam = c.examenTrimestral;
    const recup = c.recuperacion;
    
    const porcAC = cfg.porcentajeAC / 100;
    const porcAI = cfg.porcentajeAI / 100;
    const porcExam = cfg.tieneExamen ? cfg.porcentajeExamen / 100 : 0;
    
    if (acAvg !== null || aiAvg !== null || exam !== null) {
      const suma = (acAvg ?? 0) * porcAC + (aiAvg ?? 0) * porcAI + ((exam ?? 0)) * porcExam;
      let prom = isNaN(suma) ? null : suma;
      if (recup !== null) prom = Math.min(10, (prom ?? 0) + recup);
      if (prom !== null) {
        if (c.promedioFinal !== null) s.storedProms.push(c.promedioFinal);
        s.recalcProms.push(prom);
      }
    }
  }

  for (const [estId, s] of Object.entries(studentGroups)) {
    if (s.storedProms.length === 0) continue;
    const storedAvg = s.storedProms.reduce((a, b) => a + b, 0) / s.storedProms.length;
    const recalcAvg = s.recalcProms.reduce((a, b) => a + b, 0) / s.recalcProms.length;
    const diff = Math.abs(storedAvg - recalcAvg);
    if (diff > 0.01) {
      console.log(`⚠️ ${s.nombre.padEnd(25)} | ${s.grado} | T${s.trimestre}`);
      console.log(`   Prom almacenado = ${storedAvg.toFixed(2)} | Prom recalculado = ${recalcAvg.toFixed(2)} | dif=${diff.toFixed(4)}`);
    }
  }

  // 3. Print all students with their subject-level stored promedioFinal and notaActividad averages
  console.log('\n=== TODOS LOS ESTUDIANTES POR MATERIA ===');
  const order = ['Artes', 'Comunicación', 'Ciencia y Tecnología', 'Ciudadanía y Valores', 'Desarrollo Corporal', 'Educación en la Fe', 'Inglés', 'Números y formas', 'Comunicación y Literatura', 'Matemática y Datos', 'Aritmética y Finanzas', 'Lengua y Literatura', 'Educación Física'];
  califs.sort((a, b) => {
    const aIdx = order.indexOf(a.materia.nombre);
    const bIdx = order.indexOf(b.materia.nombre);
    return (aIdx !== -1 ? aIdx : 99) - (bIdx !== -1 ? bIdx : 99) || a.estudiante.numero - b.estudiante.numero;
  });
  
  for (const c of califs) {
    if (c.promedioFinal === null && c.calificacionAC === null && c.examenTrimestral === null) continue;
    const g = c.materia.grado;
    console.log(`${g.numero}° ${g.seccion} | ${c.materia.nombre.padEnd(22)} | #${String(c.estudiante.numero).padStart(2)} ${c.estudiante.nombre.padEnd(25)} | T${c.trimestre} | AC:${c.calificacionAC?.toFixed(2)?.padStart(5) ?? '    -'} AI:${c.calificacionAI?.toFixed(2)?.padStart(5) ?? '    -'} Ex:${c.examenTrimestral?.toFixed(2)?.padStart(5) ?? '    -'} Prom:${c.promedioFinal?.toFixed(2)?.padStart(5) ?? '    -'}`);
  }

  await db.$disconnect();
}

main().catch(e => { console.error(e); db.$disconnect(); });
