import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST() {
  try {
    const prisma = new PrismaClient();

    // Primero, verificar cuántos registros hay en total
    const totalAntes = await prisma.asistencia.count();
    console.log("Total de registros antes de limpiar:", totalAntes);

    // Encontrar duplicados usando una estrategia diferente
    // Agrupar por estudiante, fecha (troncada a día), grado y materia
    const duplicados = await prisma.$queryRaw`
      SELECT 
        "estudianteId",
        DATE("fecha") as fecha_dia,
        "gradoId",
        COALESCE("materiaId", '') as materia,
        COUNT(*) as total_registros,
        ARRAY_AGG("id" ORDER BY "createdAt" DESC) as ids
      FROM "Asistencia"
      GROUP BY "estudianteId", DATE("fecha"), "gradoId", COALESCE("materiaId", '')
      HAVING COUNT(*) > 1
    `;

    console.log("Grupos duplicados encontrados:", duplicados);

    // Para cada grupo duplicado, eliminar todos excepto el más reciente
    let eliminados = 0;

    for (const grupo of duplicados as Array<{
      estudianteId: string;
      fecha_dia: Date;
      gradoId: string;
      materia: string;
      total_registros: number;
      ids: string[];
    }>) {
      // Mantener el primero (más reciente por createdAt DESC)
      const idsAEliminar = grupo.ids.slice(1);

      if (idsAEliminar.length > 0) {
        const resultado = await prisma.asistencia.deleteMany({
          where: {
            id: {
              in: idsAEliminar
            }
          }
        });
        eliminados += resultado.count;
      }
    }

    const totalDespues = await prisma.asistencia.count();
    console.log("Total de registros después de limpiar:", totalDespues);
    console.log("Registros eliminados:", eliminados);

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      eliminados,
      mensaje: eliminados > 0
        ? `Se eliminaron ${eliminados} registros duplicados (de ${totalAntes} a ${totalDespues})`
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
