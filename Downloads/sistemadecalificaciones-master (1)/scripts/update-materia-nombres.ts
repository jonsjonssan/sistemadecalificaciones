import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Actualizando nombres de materias en la BD...");

  const cambios = [
    // 2 y 3 grado: "Comunicación y Literatura" → "Comunicación"
    { grados: [2, 3], viejo: "Comunicación y Literatura", nuevo: "Comunicación" },
    // 7, 8 y 9 grado: "Comunicación y Literatura" → "Lengua y Literatura"
    { grados: [7, 8, 9], viejo: "Comunicación y Literatura", nuevo: "Lengua y Literatura" },
  ];

  for (const { grados, viejo, nuevo } of cambios) {
    for (const gradoNum of grados) {
      const grado = await db.grado.findFirst({ where: { numero: gradoNum } });
      if (!grado) continue;

      const materiaVieja = await db.materia.findFirst({
        where: { nombre: viejo, gradoId: grado.id },
      });

      if (!materiaVieja) {
        console.log(`Grado ${gradoNum}: No existe "${viejo}", saltando.`);
        continue;
      }

      let materiaNueva = await db.materia.findFirst({
        where: { nombre: nuevo, gradoId: grado.id },
      });

      if (!materiaNueva) {
        materiaNueva = await db.materia.create({
          data: { nombre: nuevo, gradoId: grado.id },
        });
        console.log(`Grado ${gradoNum}: Creada "${nuevo}"`);
      }

      const califsMigradas = await db.calificacion.updateMany({
        where: { materiaId: materiaVieja.id },
        data: { materiaId: materiaNueva.id },
      });
      console.log(`Grado ${gradoNum}: Migradas ${califsMigradas.count} calificaciones.`);

      const asignaciones = await db.docenteMateria.findMany({
        where: { materiaId: materiaVieja.id },
      });

      for (const asig of asignaciones) {
        await db.docenteMateria.upsert({
          where: {
            docenteId_materiaId: {
              docenteId: asig.docenteId,
              materiaId: materiaNueva.id,
            },
          },
          update: {},
          create: {
            docenteId: asig.docenteId,
            materiaId: materiaNueva.id,
          },
        });
      }
      console.log(`Grado ${gradoNum}: Migradas ${asignaciones.length} asignaciones.`);

      const configsViejas = await db.configActividad.findMany({
        where: { materiaId: materiaVieja.id },
      });

      for (const cfg of configsViejas) {
        const existe = await db.configActividad.findFirst({
          where: { materiaId: materiaNueva.id, trimestre: cfg.trimestre },
        });
        if (!existe) {
          await db.configActividad.create({
            data: {
              materiaId: materiaNueva.id,
              trimestre: cfg.trimestre,
              numActividadesCotidianas: cfg.numActividadesCotidianas,
              numActividadesIntegradoras: cfg.numActividadesIntegradoras,
              tieneExamen: cfg.tieneExamen,
              porcentajeAC: cfg.porcentajeAC,
              porcentajeAI: cfg.porcentajeAI,
              porcentajeExamen: cfg.porcentajeExamen,
            },
          });
        }
      }
      console.log(`Grado ${gradoNum}: Configuración migrada.`);

      await db.docenteMateria.deleteMany({ where: { materiaId: materiaVieja.id } });
      await db.configActividad.deleteMany({ where: { materiaId: materiaVieja.id } });
      await db.calificacion.deleteMany({ where: { materiaId: materiaVieja.id } });
      await db.materia.delete({ where: { id: materiaVieja.id } });
      console.log(`Grado ${gradoNum}: Eliminada "${viejo}".`);
    }
  }

  console.log("Actualización completada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
