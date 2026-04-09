import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function POST() {
  try {
    const prisma = new PrismaClient();

    // Obtener todos los registros de asistencia
    const allRecords = await prisma.asistencia.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log("Total de registros encontrados:", allRecords.length);

    // Agrupar por estudiante, fecha (solo día), grado y materia
    const grupos: Map<string, Array<any>> = new Map();

    allRecords.forEach(record => {
      // Crear clave única por día (ignorando hora)
      const fechaDia = new Date(record.fecha);
      fechaDia.setHours(0, 0, 0, 0);
      const fechaKey = fechaDia.toISOString().split('T')[0]; // YYYY-MM-DD

      const materiaKey = record.materiaId || 'null';
      const grupoKey = `${record.estudianteId}|${fechaKey}|${record.gradoId}|${materiaKey}`;

      if (!grupos.has(grupoKey)) {
        grupos.set(grupoKey, []);
      }
      grupos.get(grupoKey)!.push(record);
    });

    console.log("Total de grupos únicos:", grupos.size);

    // Encontrar duplicados y eliminarlos
    let eliminados = 0;
    const idsAEliminar: string[] = [];

    grupos.forEach((records, key) => {
      if (records.length > 1) {
        console.log(`Grupo duplicado encontrado: ${key} (${records.length} registros)`);
        // Mantener el primero (más reciente por createdAt DESC), eliminar el resto
        const paraEliminar = records.slice(1);
        paraEliminar.forEach(r => idsAEliminar.push(r.id));
        eliminados += paraEliminar.length;
      }
    });

    console.log("Total de duplicados a eliminar:", eliminados);

    if (idsAEliminar.length > 0) {
      // Eliminar en lotes para evitar errores
      const resultado = await prisma.asistencia.deleteMany({
        where: {
          id: {
            in: idsAEliminar
          }
        }
      });
      eliminados = resultado.count;
    }

    const totalFinal = await prisma.asistencia.count();

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      eliminados,
      mensaje: eliminados > 0
        ? `Se eliminaron ${eliminados} registros duplicados. Total ahora: ${totalFinal}`
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
