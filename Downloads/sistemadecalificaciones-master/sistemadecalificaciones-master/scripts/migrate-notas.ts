import { PrismaClient } from "@prisma/client";

/**
 * Script de migración: Convierte notas JSON en strings a tabla NotaActividad normalizada
 * 
 * Antes: actividadesCotidianas = "[10, 9, 8, 7]" (string JSON)
 * Después: 4 registros en NotaActividad con tipo="cotidiana", numeroActividad=1,2,3,4
 * 
 * Este script ya no es necesario si la BD está vacía, pero se mantiene para referencia
 * en caso de que se necesite migrar datos existentes en el futuro.
 */

const db = new PrismaClient();

async function main() {
  console.log("🔄 Migrando calificaciones a estructura normalizada...");

  // Obtener todas las calificaciones con notas JSON
  const calificaciones = await db.calificacion.findMany({
    where: {
      OR: [
        { actividadesCotidianas: { not: null } },
        { actividadesIntegradoras: { not: null } },
      ],
    },
  });

  if (calificaciones.length === 0) {
    console.log("✅ No hay calificaciones con datos JSON para migrar");
    return;
  }

  console.log(`Encontradas ${calificaciones.length} calificaciones con datos JSON`);

  let totalNotasCreadas = 0;

  for (const cal of calificaciones) {
    // Migrar actividades cotidianas
    if (cal.actividadesCotidianas) {
      try {
        const notas: number[] = JSON.parse(cal.actividadesCotidianas);
        for (let i = 0; i < notas.length; i++) {
          if (notas[i] !== null && notas[i] !== undefined) {
            await db.notaActividad.create({
              data: {
                calificacionId: cal.id,
                tipo: "cotidiana",
                numeroActividad: i + 1,
                nota: notas[i],
              },
            });
            totalNotasCreadas++;
          }
        }
      } catch (e) {
        console.error(`Error parsing actividadesCotidianas for ${cal.id}:`, e);
      }
    }

    // Migrar actividades integradoras
    if (cal.actividadesIntegradoras) {
      try {
        const notas: number[] = JSON.parse(cal.actividadesIntegradoras);
        for (let i = 0; i < notas.length; i++) {
          if (notas[i] !== null && notas[i] !== undefined) {
            await db.notaActividad.create({
              data: {
                calificacionId: cal.id,
                tipo: "integradora",
                numeroActividad: i + 1,
                nota: notas[i],
              },
            });
            totalNotasCreadas++;
          }
        }
      } catch (e) {
        console.error(`Error parsing actividadesIntegradoras for ${cal.id}:`, e);
      }
    }
  }

  console.log(`✅ Migración completada: ${totalNotasCreadas} notas creadas en NotaActividad`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
