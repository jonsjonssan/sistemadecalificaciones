/**
 * Script de limpieza de datos en Asistencia - VERSIÓN RÁPIDA
 * Elimina duplicados con una sola query SQL.
 *
 * node prisma/cleanup-asistencia.mjs
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: ["error", "warn"] });

async function main() {
  console.log("=== LIMPIEZA DE ASISTENCIA ===\n");

  const totalAntes = await db.asistencia.count();
  console.log(`1. Total registros antes: ${totalAntes}`);

  // --- 1. Eliminar registros con gradoId NULL ---
  const nullGrado = await db.asistencia.count({ where: { gradoId: null } });
  if (nullGrado > 0) {
    await db.asistencia.deleteMany({ where: { gradoId: null } });
    console.log(`   ✅ ${nullGrado} registros gradoId=NULL eliminados.`);
  } else {
    console.log("   ✅ No hay gradoId=NULL.");
  }

  // --- 2. Normalizar fechas a DATE puro ---
  const normalizadas = await db.$executeRawUnsafe(
    `UPDATE "Asistencia" SET "fecha" = "fecha"::date`
  );
  console.log(`   ✅ ${normalizadas} fechas normalizadas.`);

  // --- 3. Eliminar TODOS los duplicados en una sola query ---
  // Conserva el más reciente por createdAt DESC, elimina el resto
  const eliminados = await db.$executeRawUnsafe(`
    DELETE FROM "Asistencia"
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "estudianteId", "fecha", "gradoId"
                 ORDER BY "createdAt" DESC
               ) as rn
        FROM "Asistencia"
      ) ranked
      WHERE rn > 1
    )
  `);
  console.log(`   ✅ ${eliminados} registros duplicados eliminados.`);

  const totalDespues = await db.asistencia.count();
  console.log(`\n2. Total después: ${totalDespues}`);
  console.log(`   Eliminados en total: ${totalAntes - totalDespues}`);

  // --- Verificación ---
  const duplicadosPost = await db.$queryRawUnsafe(
    `SELECT COUNT(*)::int as cnt FROM (
       SELECT "estudianteId", "fecha", "gradoId"
       FROM "Asistencia"
       GROUP BY "estudianteId", "fecha", "gradoId"
       HAVING COUNT(*) > 1
     ) sub`
  );

  if (Number(duplicadosPost[0]?.cnt ?? 0) === 0) {
    console.log("\n✅ BASE LIMPIA. Sin duplicados. Listo para schema nuevo.");
  } else {
    console.log(`\n⚠️  Quedan ${Number(duplicadosPost[0]?.cnt)} grupos con duplicados.`);
  }
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1); })
  .finally(() => db.$disconnect());
