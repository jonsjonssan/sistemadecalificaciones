import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET() {
  try {
    const prisma = new PrismaClient();

    // Obtener todos los registros de asistencia
    const allRecords = await prisma.asistencia.findMany({
      orderBy: [
        { estudianteId: 'asc' },
        { fecha: 'asc' }
      ]
    });

    console.log("Total de registros en BD:", allRecords.length);

    // Agrupar por estudiante, fecha (solo día), grado y materia
    const grupos: Map<string, Array<any>> = new Map();

    allRecords.forEach(record => {
      const fechaDia = new Date(record.fecha);
      fechaDia.setHours(0, 0, 0, 0);
      const fechaKey = fechaDia.toISOString().split('T')[0];
      
      const materiaKey = record.materiaId || 'null';
      const grupoKey = `${record.estudianteId}|${fechaKey}|${record.gradoId}|${materiaKey}`;

      if (!grupos.has(grupoKey)) {
        grupos.set(grupoKey, []);
      }
      grupos.get(grupoKey)!.push(record);
    });

    // Encontrar duplicados
    const duplicados: Array<{
      grupoKey: string;
      count: number;
      records: Array<{
        id: string;
        fecha: Date;
        createdAt: Date;
        estado: string;
      }>;
    }> = [];

    grupos.forEach((records, key) => {
      if (records.length > 1) {
        duplicados.push({
          grupoKey: key,
          count: records.length,
          records: records.map(r => ({
            id: r.id,
            fecha: r.fecha,
            createdAt: r.createdAt,
            estado: r.estado
          }))
        });
      }
    });

    await prisma.$disconnect();

    return NextResponse.json({
      totalRegistros: allRecords.length,
      totalGruposUnicos: grupos.size,
      gruposConDuplicados: duplicados.length,
      duplicados: duplicados.slice(0, 20), // Mostrar solo los primeros 20 para no saturar
      mensaje: duplicados.length > 0 
        ? `Se encontraron ${duplicados.length} grupos con duplicados`
        : "No se encontraron duplicados en la base de datos"
    });
  } catch (error) {
    console.error("Error diagnosticando duplicados:", error);
    return NextResponse.json(
      {
        error: "Error del servidor",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
