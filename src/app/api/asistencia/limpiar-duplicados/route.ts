import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST() {
  try {
    const prisma = new PrismaClient();

    // Encontrar todos los duplicados y eliminarlos, manteniendo solo el más reciente
    // Usamos raw SQL para identificar y eliminar duplicados
    const duplicadosEliminados = await prisma.$executeRaw`
      DELETE FROM "Asistencia"
      WHERE id IN (
        SELECT id FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (
              PARTITION BY "estudianteId", DATE("fecha"), "gradoId", COALESCE("materiaId", '')
              ORDER BY "createdAt" DESC
            ) as rn
          FROM "Asistencia"
        ) t
        WHERE rn > 1
      )
    `;

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      eliminados: duplicadosEliminados,
      mensaje: duplicadosEliminados > 0 
        ? `Se eliminaron ${duplicadosEliminados} registros duplicados`
        : "No se encontraron registros duplicados"
    });
  } catch (error) {
    console.error("Error limpiando duplicados:", error);
    return NextResponse.json(
      {
        error: "Error del servidor al limpiar duplicados",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
