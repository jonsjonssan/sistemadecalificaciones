import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🧹 Limpiando y corrigiendo materias...");

  const grados = await db.grado.findMany();

  // Materias correctas por ciclo
  const materiasPorCiclo: Record<number, string[]> = {
    2: ["Comunicación", "Números y formas", "Ciencia y Tecnología", "Ciudadanía y Valores", "Inglés", "Desarrollo Corporal", "Artes"],
    3: ["Comunicación", "Números y formas", "Ciencia y Tecnología", "Ciudadanía y Valores", "Inglés", "Desarrollo Corporal", "Artes"],
    4: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciencia y Tecnología", "Ciudadanía y Valores", "Inglés", "Desarrollo Corporal", "Artes"],
    5: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciencia y Tecnología", "Ciudadanía y Valores", "Inglés", "Desarrollo Corporal", "Artes"],
    6: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciencia y Tecnología", "Ciudadanía y Valores", "Inglés", "Desarrollo Corporal", "Artes"],
    7: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Inglés", "Educación Física"],
    8: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Inglés", "Educación Física"],
    9: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Inglés", "Educación Física"],
  };

  // 1. Eliminar TODO lo que depende de materias
  console.log("Eliminando datos dependientes...");
  await db.calificacion.deleteMany();
  await db.configActividad.deleteMany();
  await db.docenteMateria.deleteMany();
  await db.asistencia.deleteMany();
  console.log("✓ Datos dependientes eliminados");

  console.log("Eliminando todas las materias existentes...");
  await db.materia.deleteMany();
  console.log("✓ Materias eliminadas");

  // 2. Recrear materias correctas
  const materiaMap: Record<string, any> = {}; // nombre+grado -> materia

  for (const grado of grados) {
    const materias = materiasPorCiclo[grado.numero];
    if (!materias) continue;

    for (const nombre of materias) {
      const materia = await db.materia.create({
        data: { nombre, gradoId: grado.id },
      });
      materiaMap[`${nombre}-${grado.numero}`] = materia;
    }
  }

  console.log("✓ Materias recreadas correctamente");

  // 3. Verificar
  const totalMaterias = await db.materia.count();
  console.log(`Total materias: ${totalMaterias} (esperado: ${Object.values(materiasPorCiclo).flat().length})`);

  // Mostrar resumen por grado
  for (const grado of grados) {
    const mats = await db.materia.findMany({ where: { gradoId: grado.id } });
    console.log(`Grado ${grado.numero}: ${mats.length} materias - ${mats.map(m => m.nombre).join(", ")}`);
  }

  console.log("\n✅ ¡Limpieza completada!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
