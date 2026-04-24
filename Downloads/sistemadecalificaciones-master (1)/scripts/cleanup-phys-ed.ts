import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Iniciando limpieza de materias...");
  
  const materiasABorrar = await db.materia.findMany({
    where: {
      nombre: "Desarrollo Corporal y Educación Física"
    },
    include: {
      grado: true
    }
  });

  console.log(`Encontradas ${materiasABorrar.length} materias para procesar.`);

  for (const materiaOld of materiasABorrar) {
    const gradoNum = materiaOld.grado.numero;
    const targetNombre = gradoNum >= 7 ? "Educación Física y Deportes" : "Desarrollo Corporal";

    console.log(`Procesando Grado ${gradoNum}: ${materiaOld.nombre} -> ${targetNombre}`);

    // 1. Asegurar materia destino
    let materiaNew = await db.materia.findFirst({
      where: {
        nombre: targetNombre,
        gradoId: materiaOld.gradoId
      }
    });

    if (!materiaNew) {
      materiaNew = await db.materia.create({
        data: {
          nombre: targetNombre,
          gradoId: materiaOld.gradoId
        }
      });
      console.log(`Creada materia destino: ${targetNombre} para grado ${gradoNum}`);
    }

    // 2. Migrar Calificaciones
    const califsMigrated = await db.calificacion.updateMany({
      where: { materiaId: materiaOld.id },
      data: { materiaId: materiaNew.id }
    });
    console.log(`Migradas ${califsMigrated.count} calificaciones.`);

    // 3. Migrar Asignaciones de Docentes
    const asignaciones = await db.docenteMateria.findMany({
      where: { materiaId: materiaOld.id }
    });

    for (const asig of asignaciones) {
      await db.docenteMateria.upsert({
        where: {
          docenteId_materiaId: {
            docenteId: asig.docenteId,
            materiaId: materiaNew.id
          }
        },
        update: {},
        create: {
          docenteId: asig.docenteId,
          materiaId: materiaNew.id
        }
      });
    }
    console.log(`Migradas ${asignaciones.length} asignaciones de docentes.`);

    // 4. Migrar Configuración de Actividades
    const configsOld = await db.configActividad.findMany({
      where: { materiaId: materiaOld.id }
    });

    for (const cfg of configsOld) {
      const exist = await db.configActividad.findFirst({
        where: { materiaId: materiaNew.id, trimestre: cfg.trimestre }
      });
      if (!exist) {
        await db.configActividad.create({
          data: {
            materiaId: materiaNew.id,
            trimestre: cfg.trimestre,
            numActividadesCotidianas: cfg.numActividadesCotidianas,
            numActividadesIntegradoras: cfg.numActividadesIntegradoras,
            tieneExamen: cfg.tieneExamen,
            porcentajeAC: cfg.porcentajeAC,
            porcentajeAI: cfg.porcentajeAI,
            porcentajeExamen: cfg.porcentajeExamen
          }
        });
      }
    }

    // 5. Borrar materia vieja
    await db.docenteMateria.deleteMany({ where: { materiaId: materiaOld.id } });
    await db.configActividad.deleteMany({ where: { materiaId: materiaOld.id } });
    await db.calificacion.deleteMany({ where: { materiaId: materiaOld.id } });
    
    await db.materia.delete({
      where: { id: materiaOld.id }
    });
    console.log(`Materia antigua eliminada.`);
  }

  console.log("Limpieza completada con éxito.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
