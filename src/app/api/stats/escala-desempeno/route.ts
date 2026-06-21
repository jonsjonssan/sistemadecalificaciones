import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { isAdmin } from "@/utils/roleHelpers";
import { clasificarEscala } from "@/utils/gradeCalculations";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const trimestreParam = searchParams.get("trimestre") || "1";
    const allTrimestres = trimestreParam === "all";
    const trimestre = parseInt(trimestreParam, 10);
    const gradoId = searchParams.get("gradoId");

    if (!allTrimestres && (isNaN(trimestre) || trimestre < 1 || trimestre > 3)) {
      return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
    }

    const isAdminRole = isAdmin(session.rol);
    const escuelaId = (session as any).escuelaId || '';
    const gradosAsignados: string[] = session.asignaturasAsignadas?.map((m: any) => m.gradoId as string) || [];
    const gradosUnicos = [...new Set(gradosAsignados)];

    // Obtener umbrales del sistema (filtrados por escuela)
    const configRows = escuelaId
      ? await db.configuracionSistema.findMany({ where: { escuelaId }, take: 1 })
      : await db.configuracionSistema.findMany({ take: 1 });
    const cfg = configRows[0];
    const umbrales = {
      condicionado: cfg?.umbralCondicionado ?? 4.5,
      aprobado: cfg?.umbralAprobado ?? 6.5,
    };

    let gradosFiltrados;
    if (gradoId) {
      if (!isAdminRole && !gradosUnicos.includes(gradoId)) {
        return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
      }
      gradosFiltrados = await db.grado.findMany({
        where: { id: gradoId, ...(escuelaId ? { escuelaId } : {}) },
        orderBy: [{ numero: "asc" }, { seccion: "asc" }],
        select: { id: true, numero: true, seccion: true },
      });
    } else {
      if (!isAdminRole) {
        if (gradosUnicos.length === 0) {
          return NextResponse.json([]);
        }
        gradosFiltrados = await db.grado.findMany({
          where: { id: { in: gradosUnicos }, ...(escuelaId ? { escuelaId } : {}) },
          orderBy: [{ numero: "asc" }, { seccion: "asc" }],
          select: { id: true, numero: true, seccion: true },
        });
      } else {
        gradosFiltrados = await db.grado.findMany({
          where: escuelaId ? { escuelaId } : undefined,
          orderBy: [{ numero: "asc" }, { seccion: "asc" }],
          select: { id: true, numero: true, seccion: true },
        });
      }
    }

    const gradoIds = gradosFiltrados.map((g) => g.id);

    // Obtener estudiantes de todos los grados filtrados de una vez
    const estudiantes = await db.estudiante.findMany({
      where: { gradoId: { in: gradoIds }, activo: true },
      select: { id: true, nombre: true, numero: true, gradoId: true },
      orderBy: { numero: "asc" },
    });

    // Obtener materias de todos los grados filtrados de una vez
    const materias = await db.materia.findMany({
      where: { gradoId: { in: gradoIds } },
      select: { id: true, nombre: true, gradoId: true },
      orderBy: { nombre: "asc" },
    });

    // Obtener calificaciones de una sola query
    const estudianteIds = estudiantes.map((e) => e.id);
    const materiaIds = materias.map((m) => m.id);

    const calificaciones = await db.calificacion.findMany({
      where: {
        estudianteId: { in: estudianteIds },
        materiaId: { in: materiaIds },
        ...(allTrimestres ? { trimestre: { in: [1, 2, 3] } } : { trimestre }),
      },
      select: {
        estudianteId: true,
        materiaId: true,
        trimestre: true,
        promedioFinal: true,
      },
    });

    // Agrupar calificaciones en memoria
    const califMap = new Map<string, Map<string, number[]>>();
    for (const cal of calificaciones) {
      if (cal.promedioFinal === null) continue;
      const estMap = califMap.get(cal.estudianteId) || new Map<string, number[]>();
      const arr = estMap.get(cal.materiaId) || [];
      arr.push(cal.promedioFinal);
      estMap.set(cal.materiaId, arr);
      califMap.set(cal.estudianteId, estMap);
    }

    const resultado = gradosFiltrados.map((grado) => {
      const estsGrado = estudiantes.filter((e) => e.gradoId === grado.id);
      const matsGrado = materias.filter((m) => m.gradoId === grado.id);

      const gradoStats = { reprobado: 0, condicionado: 0, aprobado: 0, total: 0, sinNotas: 0 };
      const materiasStats = matsGrado.map((materia) => ({
        materiaId: materia.id,
        materiaNombre: materia.nombre,
        reprobado: 0,
        condicionado: 0,
        aprobado: 0,
        total: 0,
        sinNotas: 0,
      }));

      for (const estudiante of estsGrado) {
        const estMap = califMap.get(estudiante.id);
        let promediosMateria: number[] = [];

        for (let i = 0; i < matsGrado.length; i++) {
          const materia = matsGrado[i];
          const stats = materiasStats[i];

          let promedioFinal: number | null = null;
          const arr = estMap?.get(materia.id);
          if (arr && arr.length > 0) {
            promedioFinal = arr.reduce((a, b) => a + b, 0) / arr.length;
          }

          stats.total++;
          if (promedioFinal !== null) {
            const estado = clasificarEscala(promedioFinal, umbrales);
            if (estado === "REPROBADO") stats.reprobado++;
            else if (estado === "CONDICIONADO") stats.condicionado++;
            else stats.aprobado++;
            promediosMateria.push(promedioFinal);
          } else {
            stats.sinNotas++;
          }
        }

        gradoStats.total++;
        if (promediosMateria.length > 0) {
          const promedioGeneral = promediosMateria.reduce((a, b) => a + b, 0) / promediosMateria.length;
          const estado = clasificarEscala(promedioGeneral, umbrales);
          if (estado === "REPROBADO") gradoStats.reprobado++;
          else if (estado === "CONDICIONADO") gradoStats.condicionado++;
          else gradoStats.aprobado++;
        } else {
          gradoStats.sinNotas++;
        }
      }

      return {
        gradoId: grado.id,
        gradoNombre: `${grado.numero}° "${grado.seccion}"`,
        grado,
        escala: gradoStats,
        materias: materiasStats,
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("[stats/escala-desempeno] Error:", error);
    return NextResponse.json({ error: "Error al calcular estadísticas de escala de desempeño" }, { status: 500 });
  }
}
