import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Iniciando corrección de asignaturas para grados 2° a 5°...");

  // Definición de las 8 asignaturas oficiales
  const asignaturasOficiales = [
    "Comunicación y Literatura",
    "Aritmética y Finanzas",
    "Ciudadanía y Valores",
    "Ciencia y Tecnología",
    "Desarrollo Corporal",
    "Artes",
    "Educación en la Fe",
    "Inglés"
  ];

  // Mapeo de nombres antiguos a nuevos para evitar duplicados
  const renameMap: Record<string, string> = {
    "Comunicación": "Comunicación y Literatura",
    "Números y Formas": "Aritmética y Finanzas"
  };

  const grados = await db.grado.findMany({
    where: { numero: { gte: 2, lte: 5 } }
  });

  console.log(`Encontrados ${grados.length} grados para corregir.`);

  for (const grado of grados) {
    console.log(`Corrigiendo Grado: ${grado.numero}° "${grado.seccion}"...`);

    // 1. Renombrar existentes si match con el map
    for (const [antiguo, nuevo] of Object.entries(renameMap)) {
      await db.materia.updateMany({
        where: { gradoId: grado.id, nombre: antiguo },
        data: { nombre: nuevo }
      });
    }

    // 2. Asegurar que las 8 asignaturas existan
    for (const nombre of asignaturasOficiales) {
      let subject = await db.materia.findFirst({
        where: { gradoId: grado.id, nombre }
      });

      if (!subject) {
        subject = await db.materia.create({
          data: { nombre, gradoId: grado.id }
        });
        console.log(`  + Creada asignatura: ${nombre}`);
      } else {
        console.log(`  . Ya existe asignatura: ${nombre}`);
      }

      // 3. Asegurar configuración de actividades (3 trimestres)
      for (let trimestre = 1; trimestre <= 3; trimestre++) {
        await db.configActividad.upsert({
          where: { 
            materiaId_trimestre: { 
              materiaId: subject.id, 
              trimestre 
            } 
          },
          update: {},
          create: {
            materiaId: subject.id,
            trimestre,
            numActividadesCotidianas: 4,
            numActividadesIntegradoras: 1,
            tieneExamen: true,
            porcentajeAC: 35.0,
            porcentajeAI: 35.0,
            porcentajeExamen: 30.0,
          }
        });
      }
    }
  }

  // También corregir grados 6-9 si es necesario (renombrar solo)
  console.log("Corrigiendo nombres en grados superiores (6°-9°)...");
  for (const [antiguo, nuevo] of Object.entries(renameMap)) {
    await db.materia.updateMany({
      where: { 
        nombre: antiguo,
        grado: { numero: { gte: 6 } }
      },
      data: { nombre: nuevo }
    });
  }

  console.log("¡Corrección de asignaturas completada!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
