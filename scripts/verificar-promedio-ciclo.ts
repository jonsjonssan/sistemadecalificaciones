import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 CÁLCULO REAL DEL PROMEDIO DEL CICLO (Tercer Ciclo)\n');
  console.log('=' .repeat(60));

  // La fórmula real del Dashboard es:
  // Promedio Ciclo = Σ((AC + AI + Examen) / 3) / N_grados
  
  const grados = [7, 8, 9];
  let sumaPromedios = 0;
  let gradosConDatos = 0;

  for (const numGrado of grados) {
    const grado = await prisma.grado.findFirst({ where: { numero: numGrado, seccion: 'A' } });
    if (!grado) continue;

    console.log(`\n📚 ${numGrado}° "A"`);
    console.log('-'.repeat(40));

    // Obtener todas las calificaciones del grado (trimestre 1)
    const calificaciones = await prisma.calificacion.findMany({
      where: {
        estudiante: { gradoId: grado.id },
        trimestre: 1
      }
    });

    // Calcular promedios de cada tipo (como lo hace la API)
    let sumAC = 0, countAC = 0;
    let sumAI = 0, countAI = 0;
    let sumEx = 0, countEx = 0;
    let sumFinal = 0, countFinal = 0;

    calificaciones.forEach(c => {
      if (c.calificacionAC !== null) { sumAC += Number(c.calificacionAC); countAC++; }
      if (c.calificacionAI !== null) { sumAI += Number(c.calificacionAI); countAI++; }
      if (c.examenTrimestral !== null) { sumEx += Number(c.examenTrimestral); countEx++; }
      if (c.promedioFinal !== null) { sumFinal += Number(c.promedioFinal); countFinal++; }
    });

    const promAC = countAC > 0 ? sumAC / countAC : 0;
    const promAI = countAI > 0 ? sumAI / countAI : 0;
    const promEx = countEx > 0 ? sumEx / countEx : 0;
    const promFinal = countFinal > 0 ? sumFinal / countFinal : 0;

    console.log(`  Calificaciones: ${calificaciones.length}`);
    console.log(`  Promedio AC (Cotidianas): ${promAC > 0 ? promAC.toFixed(2) : 'Sin datos'}`);
    console.log(`  Promedio AI (Integradoras): ${promAI > 0 ? promAI.toFixed(2) : 'Sin datos'}`);
    console.log(`  Promedio Examen: ${promEx > 0 ? promEx.toFixed(2) : 'Sin datos'}`);
    console.log(`  Promedio Final real: ${promFinal > 0 ? promFinal.toFixed(2) : 'Sin datos'}`);

    // Fórmula del Dashboard: (AC + AI + Examen) / 3
    const promGrado = (promAC + promAI + promEx) / 3;
    console.log(`  📊 Promedio grado (fórmula dashboard): (${promAC.toFixed(2)} + ${promAI.toFixed(2)} + ${promEx.toFixed(2)}) / 3 = ${promGrado.toFixed(2)}`);

    if (promGrado > 0) {
      sumaPromedios += promGrado;
      gradosConDatos++;
    }
  }

  // Promedio del ciclo
  const promCiclo = sumaPromedios / gradosConDatos;
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 CÁLCULO DEL PROMEDIO DEL CICLO\n');
  console.log(`  Grados con datos: ${gradosConDatos}`);
  console.log(`  Suma de promedios: ${sumaPromedios.toFixed(2)}`);
  console.log(`  Promedio Ciclo = ${sumaPromedios.toFixed(2)} / ${gradosConDatos} = ${promCiclo.toFixed(2)}`);
  console.log(`  Redondeado: ${Math.round(promCiclo * 100) / 100}`);
  console.log('\n✅ Este es el valor que debería aparecer en el Dashboard\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
