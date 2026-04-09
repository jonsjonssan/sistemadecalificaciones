import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST() {
  try {
    const prisma = new PrismaClient();

    // Encontrar duplicados: misma fecha, estudiante, grado y materia
    const duplicados = await prisma.$queryRaw`
      WITH RankedAsistencia AS (
        SELECT 
          id,
          estudianteId,
          fecha,
          gradoId,
          materiaId,
          ROW_NUMBER() OVER (
            PARTITION BY estudianteId, fecha, gradoId, COALESCE(materiaId, '')
            ORDER BY createdAt DESC
          ) as rn
        FROM "Asistencia"
      )
      SELECT id FROM RankedAsistencia WHERE rn > 1
    `;

    // Convertir resultado a array de IDs
    const idsAEliminar = (duplicados as Array<{ id: string }>).map(d => d.id);

    if (idsAEliminar.length === 0) {
      await prisma.$disconnect();
      return NextResponse.json({
        success: true,
        eliminados: 0,
        mensaje: "No se encontraron registros duplicados"
      });
    }

    // Eliminar duplicados
    const resultado = await prisma.asistencia.deleteMany({
      where: {
        id: {
          in: idsAEliminar
        }
      }
    });

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      eliminados: resultado.count,
      mensaje: `Se eliminaron ${resultado.count} registros duplicados`
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
