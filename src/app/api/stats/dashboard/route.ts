import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trimestre = parseInt(searchParams.get("trimestre") || "1");
    
    const grados = await sql`
      SELECT g.*, 
        (SELECT COUNT(*) FROM "Estudiante" e WHERE e."gradoId" = g.id) as estudiantes_count,
        (SELECT COUNT(*) FROM "Materia" m WHERE m."gradoId" = g.id) as materias_count
      FROM "Grado" g
      ORDER BY g.numero, g.seccion
    `;

    const statsPorGrado = await Promise.all(grados.map(async (grado: any) => {
      const calificaciones = await sql`
        SELECT c.*, e.nombre as estudiante_nombre, e.numero as estudiante_numero
        FROM "Calificacion" c
        JOIN "Estudiante" e ON c."estudianteId" = e.id
        WHERE c.trimestre = ${trimestre} AND e."gradoId" = ${grado.id}
      `;

      let sumAC = 0, countAC = 0;
      let sumAI = 0, countAI = 0;
      let sumEx = 0, countEx = 0;

      const studentAverages: Record<string, { id: string, nombre: string, numero: number, suma: number, cuenta: number }> = {};

      calificaciones.forEach((c: any) => {
        if (c.calificacionAC !== null) { sumAC += Number(c.calificacionAC); countAC++; }
        if (c.calificacionAI !== null) { sumAI += Number(c.calificacionAI); countAI++; }
        if (c.examenTrimestral !== null) { sumEx += Number(c.examenTrimestral); countEx++; }

        if (!studentAverages[c.estudianteId]) {
          studentAverages[c.estudianteId] = { 
            id: c.estudianteId, 
            nombre: c.estudiante_nombre, 
            numero: c.estudiante_numero,
            suma: 0, 
            cuenta: 0 
          };
        }
        
        if (c.promedioFinal !== null) {
          studentAverages[c.estudianteId].suma += Number(c.promedioFinal);
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
        .sort((a: any, b: any) => b.promedio - a.promedio);

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
        alertas: ranking.slice(-3).reverse()
      };
    }));

    return NextResponse.json(statsPorGrado);
  } catch (error) {
    console.error("Error en dashboard stats:", error);
    return NextResponse.json({ error: "Error al calcular estadísticas" }, { status: 500 });
  }
}
