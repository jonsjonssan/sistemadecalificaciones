import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trimestre = parseInt(searchParams.get("trimestre") || "1");
    
    // Obtener todos los grados
    const grados = await prisma.grado.findMany({
      include: {
        estudiantes: true,
        materias: true
      }
    });

    const statsPorGrado = await Promise.all(grados.map(async (grado) => {
      // Obtener todas las calificaciones del grado y trimestre
      const calificaciones = await prisma.calificacion.findMany({
        where: {
          trimestre,
          estudiante: {
            gradoId: grado.id
          }
        },
        include: {
          estudiante: true
        }
      });

      // Calcular promedios por categoría
      // Nota: En la DB las calificaciones se guardan como JSON string para las actividades individuales, 
      // pero también tenemos los campos consolidados calificacionAC, calificacionAI y examenTrimestral.
      
      let sumAC = 0, countAC = 0;
      let sumAI = 0, countAI = 0;
      let sumEx = 0, countEx = 0;

      // Mapa para promedios de estudiantes
      const studentAverages: Record<string, { id: string, nombre: string, numero: number, suma: number, cuenta: number }> = {};

      calificaciones.forEach(c => {
        if (c.calificacionAC !== null) { sumAC += c.calificacionAC; countAC++; }
        if (c.calificacionAI !== null) { sumAI += c.calificacionAI; countAI++; }
        if (c.examenTrimestral !== null) { sumEx += c.examenTrimestral; countEx++; }

        if (!studentAverages[c.estudianteId]) {
          studentAverages[c.estudianteId] = { 
            id: c.estudianteId, 
            nombre: c.estudiante.nombre, 
            numero: c.estudiante.numero,
            suma: 0, 
            cuenta: 0 
          };
        }
        
        if (c.promedioFinal !== null) {
          studentAverages[c.estudianteId].suma += c.promedioFinal;
          studentAverages[c.estudianteId].cuenta++;
        }
      });

      const ranking = Object.values(studentAverages)
        .filter(s => s.cuenta > 0)
        .map(s => ({
          id: s.id,
          nombre: s.nombre,
          numero: s.numero,
          promedio: s.suma / s.cuenta
        }))
        .sort((a, b) => b.promedio - a.promedio);

      return {
        gradoId: grado.id,
        nombre: `${grado.numero}° "${grado.seccion}"`,
        numero: grado.numero,
        seccion: grado.seccion,
        promedios: {
          cotidiana: countAC > 0 ? sumAC / countAC : 0,
          integradora: countAI > 0 ? sumAI / countAI : 0,
          examen: countEx > 0 ? sumEx / countEx : 0
        },
        topEstudiantes: ranking.slice(0, 3),
        alertas: ranking.slice(-3).reverse() // Los 3 más bajos
      };
    }));

    return NextResponse.json(statsPorGrado);
  } catch (error) {
    console.error("Error en dashboard stats:", error);
    return NextResponse.json({ error: "Error al calcular estadísticas" }, { status: 500 });
  }
}
