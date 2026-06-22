import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { validarPorcentajes } from "@/lib/calculations";
import type { SessionUsuario } from "@/lib/types/session";
import {
  DEFAULT_NUM_ACTIVIDADES_COTIDIANAS,
  DEFAULT_NUM_ACTIVIDADES_INTEGRADORAS,
  DEFAULT_NUM_EXAMENES,
  PORCENTAJE_DEFAULT_AC,
  PORCENTAJE_DEFAULT_AI,
  PORCENTAJE_DEFAULT_EXAMEN,
  MAX_EXAMENES,
} from "@/lib/constants";

async function getUsuarioSession(): Promise<SessionUsuario | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return null;
    return verifySession(session.value);
  } catch (error) {
    console.error("[config-actividades] Error parsing session:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const escuelaId = session.escuelaId;
    if (!escuelaId) {
      return NextResponse.json({ error: "Sesión sin escuela asignada" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const materiaId = searchParams.get("materiaId");
    const gradoId = searchParams.get("gradoId");
    const trimestre = searchParams.get("trimestre");

    if (session.rol === "docente" || session.rol === "docente-orientador") {
      const materiasAsignadasIds = session.asignaturasAsignadas?.map((m) => m.id) || [];
      const gradosByMaterias = session.asignaturasAsignadas?.map((m) => m.gradoId) || [];
      const gradosByTutor = session.gradosAsignados?.map((g) => g.id) || [];
      const todosGradosIds = [...new Set([...gradosByMaterias, ...gradosByTutor])];

      if (materiaId && !materiasAsignadasIds.includes(materiaId)) {
        return NextResponse.json({ error: "No autorizado para esta materia" }, { status: 403 });
      }
      if (gradoId && todosGradosIds.length > 0 && !todosGradosIds.includes(gradoId)) {
        return NextResponse.json({ error: "No autorizado para este grado" }, { status: 403 });
      }
    }

    if (materiaId && trimestre) {
      const trimestreNum = parseInt(trimestre);
      if (isNaN(trimestreNum)) {
        return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
      }

      const materia = await db.materia.findUnique({
        where: { id: materiaId }
      });

      if (!materia) {
        return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
      }

      let config = await db.configActividad.findUnique({
        where: {
          materiaId_trimestre: {
            materiaId,
            trimestre: trimestreNum
          }
        }
      });

      if (!config) {
        config = await db.configActividad.create({
          data: {
            materiaId,
            trimestre: trimestreNum,
            numActividadesCotidianas: DEFAULT_NUM_ACTIVIDADES_COTIDIANAS,
            numActividadesIntegradoras: DEFAULT_NUM_ACTIVIDADES_INTEGRADORAS,
            tieneExamen: true,
            numExamenes: DEFAULT_NUM_EXAMENES,
            porcentajeAC: PORCENTAJE_DEFAULT_AC,
            porcentajeAI: PORCENTAJE_DEFAULT_AI,
            porcentajeExamen: PORCENTAJE_DEFAULT_EXAMEN,
            escuelaId,
          }
        });
      }

      return NextResponse.json({
        id: config.id,
        materiaId: config.materiaId,
        trimestre: config.trimestre,
        numActividadesCotidianas: config.numActividadesCotidianas,
        numActividadesIntegradoras: config.numActividadesIntegradoras,
        tieneExamen: config.tieneExamen,
        numExamenes: config.numExamenes,
        porcentajeAC: config.porcentajeAC,
        porcentajeAI: config.porcentajeAI,
        porcentajeExamen: config.porcentajeExamen,
      });
    }

    if (gradoId && trimestre) {
      const trimestreNum = parseInt(trimestre);
      if (isNaN(trimestreNum)) {
        return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
      }

      const grado = await db.grado.findUnique({
        where: { id: gradoId }
      });

      if (!grado) {
        return NextResponse.json({ error: "Grado no encontrado" }, { status: 404 });
      }

      const materias = await db.materia.findMany({
        where: { gradoId }
      });

      const result: any[] = [];
      for (const materia of materias) {
        try {
          let config = await db.configActividad.findUnique({
            where: {
              materiaId_trimestre: {
                materiaId: materia.id,
                trimestre: trimestreNum
              }
            }
          });

          if (!config) {
            config = await db.configActividad.create({
              data: {
                materiaId: materia.id,
                trimestre: trimestreNum,
                numActividadesCotidianas: DEFAULT_NUM_ACTIVIDADES_COTIDIANAS,
                numActividadesIntegradoras: DEFAULT_NUM_ACTIVIDADES_INTEGRADORAS,
                tieneExamen: true,
                numExamenes: DEFAULT_NUM_EXAMENES,
                porcentajeAC: PORCENTAJE_DEFAULT_AC,
                porcentajeAI: PORCENTAJE_DEFAULT_AI,
                porcentajeExamen: PORCENTAJE_DEFAULT_EXAMEN,
                escuelaId,
              }
            });
          }

          result.push({
            id: config.id,
            materiaId: config.materiaId,
            trimestre: config.trimestre,
            numActividadesCotidianas: config.numActividadesCotidianas,
            numActividadesIntegradoras: config.numActividadesIntegradoras,
            tieneExamen: config.tieneExamen,
            numExamenes: config.numExamenes,
            porcentajeAC: config.porcentajeAC,
            porcentajeAI: config.porcentajeAI,
            porcentajeExamen: config.porcentajeExamen,
            materiaNombre: materia.nombre
          });
        } catch (err) {
          console.error(`[config-actividades] Error con materia ${materia.id}:`, err);
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(null);
  } catch (error) {
    console.error("[config-actividades] GET Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al obtener configuración", details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const escuelaId = session.escuelaId;
    if (!escuelaId) {
      return NextResponse.json({ error: "Sesión sin escuela asignada" }, { status: 400 });
    }

    const data = await request.json();

    const { materiaId, gradoId, aplicarATodasLasMateriasDelGrado, trimestre: trimestreValue, numActividadesCotidianas, numActividadesIntegradoras, tieneExamen, numExamenes, porcentajeAC, porcentajeAI, porcentajeExamen } = data;

    if (session.rol === "docente") {
      const materiasAsignadasIds = session.asignaturasAsignadas?.map((m) => m.id) || [];
      const gradosByMaterias = session.asignaturasAsignadas?.map((m) => m.gradoId) || [];
      const gradosByTutor = session.gradosAsignados?.map((g) => g.id) || [];
      const todosGradosIds = [...new Set([...gradosByMaterias, ...gradosByTutor])];

      if (materiaId && !materiasAsignadasIds.includes(materiaId)) {
        return NextResponse.json({ error: "No autorizado para esta materia" }, { status: 403 });
      }
      if (gradoId && todosGradosIds.length > 0 && !todosGradosIds.includes(gradoId)) {
        return NextResponse.json({ error: "No autorizado para este grado" }, { status: 403 });
      }
      if (aplicarATodasLasMateriasDelGrado) {
        return NextResponse.json({ error: "No autorizado para aplicar a todas las materias" }, { status: 403 });
      }
    }

    const trimestreNum = trimestreValue !== undefined && trimestreValue !== null ? parseInt(String(trimestreValue)) : NaN;
    if (trimestreNum === undefined || trimestreNum === null || isNaN(trimestreNum) || trimestreNum < 1 || trimestreNum > 3) {
      return NextResponse.json({ error: "Trimestre es requerido y debe ser válido (1-3)" }, { status: 400 });
    }

    const numAC = numActividadesCotidianas !== undefined && numActividadesCotidianas !== null ? Math.max(0, parseInt(String(numActividadesCotidianas)) || DEFAULT_NUM_ACTIVIDADES_COTIDIANAS) : DEFAULT_NUM_ACTIVIDADES_COTIDIANAS;
    const numAI = numActividadesIntegradoras !== undefined && numActividadesIntegradoras !== null ? Math.max(0, parseInt(String(numActividadesIntegradoras)) || DEFAULT_NUM_ACTIVIDADES_INTEGRADORAS) : DEFAULT_NUM_ACTIVIDADES_INTEGRADORAS;
    const numEx = numExamenes !== undefined && numExamenes !== null ? Math.max(1, Math.min(MAX_EXAMENES, parseInt(String(numExamenes)) || DEFAULT_NUM_EXAMENES)) : DEFAULT_NUM_EXAMENES;
    const tieneEx = tieneExamen === true || tieneExamen === "true" || tieneExamen === 1;
    const porcAC = porcentajeAC !== undefined && porcentajeAC !== null ? parseFloat(String(porcentajeAC)) || PORCENTAJE_DEFAULT_AC : PORCENTAJE_DEFAULT_AC;
    const porcAI = porcentajeAI !== undefined && porcentajeAI !== null ? parseFloat(String(porcentajeAI)) || PORCENTAJE_DEFAULT_AI : PORCENTAJE_DEFAULT_AI;
    const porcEx = porcentajeExamen !== undefined && porcentajeExamen !== null ? parseFloat(String(porcentajeExamen)) || PORCENTAJE_DEFAULT_EXAMEN : PORCENTAJE_DEFAULT_EXAMEN;

    const validacion = validarPorcentajes(porcAC, porcAI, porcEx, tieneEx);
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }

    if (aplicarATodasLasMateriasDelGrado && gradoId) {
      const materias = await db.materia.findMany({
        where: { gradoId }
      });

      if (materias.length === 0) {
        return NextResponse.json({ error: "No hay materias para este grado" }, { status: 404 });
      }

      let count = 0;
      for (const materia of materias) {
        try {
          await db.configActividad.upsert({
            where: {
              materiaId_trimestre: {
                materiaId: materia.id,
                trimestre: trimestreNum
              }
            },
            update: {
              numActividadesCotidianas: numAC,
              numActividadesIntegradoras: numAI,
              tieneExamen: tieneEx,
              numExamenes: numEx,
              porcentajeAC: porcAC,
              porcentajeAI: porcAI,
              porcentajeExamen: porcEx
            },
            create: {
              materiaId: materia.id,
              trimestre: trimestreNum,
              numActividadesCotidianas: numAC,
              numActividadesIntegradoras: numAI,
              tieneExamen: tieneEx,
              numExamenes: numEx,
              porcentajeAC: porcAC,
              porcentajeAI: porcAI,
              porcentajeExamen: porcEx,
              escuelaId,
            }
          });
          count++;
        } catch (err) {
          console.error("[config-actividades] Error con materia:", materia.id, err);
        }
      }
      return NextResponse.json({ success: true, count });
    }

    if (!materiaId) return NextResponse.json({ error: "materiaId es requerido" }, { status: 400 });

    const config = await db.configActividad.upsert({
      where: {
        materiaId_trimestre: {
          materiaId,
          trimestre: trimestreNum
        }
      },
      update: {
        numActividadesCotidianas: numAC,
        numActividadesIntegradoras: numAI,
        tieneExamen: tieneEx,
        numExamenes: numEx,
        porcentajeAC: porcAC,
        porcentajeAI: porcAI,
        porcentajeExamen: porcEx
      },
      create: {
        materiaId,
        trimestre: trimestreNum,
        numActividadesCotidianas: numAC,
        numActividadesIntegradoras: numAI,
        tieneExamen: tieneEx,
        numExamenes: numEx,
        porcentajeAC: porcAC,
        porcentajeAI: porcAI,
        porcentajeExamen: porcEx,
        escuelaId,
      }
    });

    // Audit log
    try {
      await createAuditLog({
        usuarioId: session.id,
        accion: "CONFIG_CHANGE",
        entidad: "ConfigActividad",
        entidadId: config.id,
        detalles: JSON.stringify({
          materiaId,
          trimestre: trimestreNum,
          numAC,
          numAI,
          numEx,
          tieneExamen: tieneEx,
          porcAC,
          porcAI,
          porcEx,
          aplicarATodas: aplicarATodasLasMateriasDelGrado
        }),
      });
    } catch (auditError) {
      console.error("[config-actividades] Audit error:", auditError);
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("[config-actividades] POST Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al guardar configuración", details: errorMessage }, { status: 500 });
  }
}
