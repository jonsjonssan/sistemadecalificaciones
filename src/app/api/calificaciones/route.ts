import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { z } from "zod";
import { isAdmin } from "@/utils/roleHelpers";

const calificacionSchema = z.object({
  estudianteId: z.string().min(1, "ID de estudiante requerido"),
  materiaId: z.string().min(1, "ID de materia requerido"),
  trimestre: z.number().int().min(1).max(3, "Trimestre inválido"),
  actividadesCotidianas: z.union([z.string(), z.array(z.number().min(0).max(10).nullable())]).optional(),
  actividadesIntegradoras: z.union([z.string(), z.array(z.number().min(0).max(10).nullable())]).optional(),
  examenTrimestral: z.number().min(0).max(10).nullable().optional(),
  recuperacion: z.number().min(0).max(10).nullable().optional(),
});

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

function canAccessMateria(session: any, materiaId: string): boolean {
  if (["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) return true;
  return session.asignaturasAsignadas?.some((m: any) => m.id === materiaId) ?? false;
}

/**
 * Transforma calificaciones para incluir notas individuales como arrays (compatibilidad con frontend)
 * Preserva las posiciones vacías (null) para que el frontend muestre campos vacíos correctamente
 */
function transformCalificacion(cal: any) {
  const notasCotidianasMap = new Map<number, number>();
  const notasIntegradorasMap = new Map<number, number>();
  let maxCotidiana = 0;
  let maxIntegradora = 0;

  // Primero pasamos: construir mapa y encontrar el máximo (limitado para evitar DoS)
  const MAX_ACTIVIDADES = 50;
  for (const nota of (cal.notasActividad || [])) {
    if (nota.tipo === "cotidiana") {
      const num = Math.min(nota.numeroActividad, MAX_ACTIVIDADES);
      notasCotidianasMap.set(num, nota.nota);
      if (num > maxCotidiana) maxCotidiana = num;
    } else if (nota.tipo === "integradora") {
      const num = Math.min(nota.numeroActividad, MAX_ACTIVIDADES);
      notasIntegradorasMap.set(num, nota.nota);
      if (num > maxIntegradora) maxIntegradora = num;
    }
  }

  // Segundo paso: reconstruir arrays preservando posiciones vacías (null)
  const notasCotidianas: (number | null)[] = [];
  for (let i = 1; i <= maxCotidiana; i++) {
    notasCotidianas.push(notasCotidianasMap.has(i) ? notasCotidianasMap.get(i)! : null);
  }

  const notasIntegradoras: (number | null)[] = [];
  for (let i = 1; i <= maxIntegradora; i++) {
    notasIntegradoras.push(notasIntegradorasMap.has(i) ? notasIntegradorasMap.get(i)! : null);
  }

  return {
    ...cal,
    actividadesCotidianas: JSON.stringify(notasCotidianas),
    actividadesIntegradoras: JSON.stringify(notasIntegradoras),
  };
}

// ==================== GET: Obtener calificaciones ====================

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({
        error: "Sesión no válida",
        code: "UNAUTHORIZED",
        message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente."
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");
    const trimestre = searchParams.get("trimestre");
    const estudianteId = searchParams.get("estudianteId");

    const materiasAsignadasIds = session.asignaturasAsignadas?.map((m: any) => m.id) || [];
    const gradosByMaterias = session.asignaturasAsignadas?.map((m: any) => m.gradoId) || [];
    const todosGradosIds = [...new Set([...gradosByMaterias])];

    // Para Boletas: si solo se pasa gradoId, retornar todas las calificaciones del grado
    if (gradoId && !materiaId && !trimestre && !estudianteId) {
      // Authorization check
      if (session.rol === "docente" || session.rol === "docente-orientador") {
        if (!todosGradosIds.includes(gradoId)) {
          return NextResponse.json({
            error: "Grado no asignado",
            code: "GRADO_FORBIDDEN",
            message: "No tienes permiso para ver las calificaciones de este grado."
          }, { status: 403 });
        }
      }

      const where: any = { estudiante: { gradoId } };
      if (session.rol === "docente" || session.rol === "docente-orientador") {
        where.materiaId = { in: materiasAsignadasIds };
      }

      const calificaciones = await db.calificacion.findMany({
        where,
        include: {
          estudiante: { select: { id: true, numero: true, nombre: true, gradoId: true } },
          materia: { select: { id: true, nombre: true } },
          notasActividad: true,
        },
        orderBy: { estudiante: { numero: "asc" } },
      });

      return NextResponse.json(calificaciones.map(transformCalificacion));
    }

    if (!materiaId || !trimestre) {
      return NextResponse.json({
        error: "Parámetros incompletos",
        code: "MISSING_PARAMS",
        message: "Selecciona una materia y un trimestre para ver las calificaciones."
      }, { status: 400 });
    }

    if (session.rol === "docente" || session.rol === "docente-orientador") {
      if (materiaId && !materiasAsignadasIds.includes(materiaId)) {
        return NextResponse.json({
          error: "Materia no asignada",
          code: "MATERIA_FORBIDDEN",
          message: "No tienes permiso para ver las calificaciones de esta materia."
        }, { status: 403 });
      }
      if (gradoId && !todosGradosIds.includes(gradoId)) {
        return NextResponse.json({
          error: "Grado no asignado",
          code: "GRADO_FORBIDDEN",
          message: "No tienes permiso para ver las calificaciones de este grado."
        }, { status: 403 });
      }
    }

    const trimestreNum = parseInt(trimestre, 10);
    if (isNaN(trimestreNum) || trimestreNum < 1 || trimestreNum > 3) {
      return NextResponse.json({
        error: "Trimestre inválido",
        code: "INVALID_TRIMESTRE",
        message: "El trimestre debe ser 1, 2 o 3."
      }, { status: 400 });
    }

    let calificaciones: any[] = [];
    if (materiaId && trimestre && gradoId) {
      calificaciones = await db.calificacion.findMany({
        where: {
          estudiante: { gradoId },
          materiaId,
          trimestre: trimestreNum,
        },
        include: {
          estudiante: { select: { id: true, numero: true, nombre: true, gradoId: true } },
          materia: { select: { id: true, nombre: true } },
          notasActividad: true, // Incluir notas normalizadas
        },
        orderBy: { estudiante: { numero: "asc" } },
      });
    } else if (estudianteId) {
      if (session.rol === "docente" || session.rol === "docente-orientador") {
        const estudiante = await db.estudiante.findUnique({ where: { id: estudianteId }, select: { gradoId: true } });
        if (!estudiante || !todosGradosIds.includes(estudiante.gradoId)) {
          return NextResponse.json({
            error: "Estudiante no asignado",
            code: "ESTUDIANTE_FORBIDDEN",
            message: "No tienes permiso para ver las calificaciones de este estudiante."
          }, { status: 403 });
        }
      }
      const where: any = { estudianteId };
      if (session.rol === "docente" || session.rol === "docente-orientador") {
        where.materiaId = { in: materiasAsignadasIds };
      }
      calificaciones = await db.calificacion.findMany({
        where,
        include: {
          estudiante: { select: { id: true, numero: true, nombre: true, gradoId: true } },
          materia: { select: { id: true, nombre: true } },
          notasActividad: true,
        },
        orderBy: { estudiante: { numero: "asc" } },
      });
    } else {
      return NextResponse.json({
        error: "Parámetros incompletos",
        code: "MISSING_PARAMS",
        message: "Se requiere gradoId o estudianteId junto con materiaId y trimestre."
      }, { status: 400 });
    }
    // Transformar para compatibilidad con frontend
    return NextResponse.json(calificaciones.map(transformCalificacion));
  } catch (error) {
    console.error("[calificaciones/GET] Error:", error);
    return NextResponse.json({
      error: "Error al cargar calificaciones",
      code: "CALIFICACIONES_LOAD_ERROR",
      message: "Hubo un problema al obtener las calificaciones. Por favor, intenta de nuevo."
    }, { status: 500 });
  }
}

// ==================== POST: Guardar calificación ====================

export async function POST(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();

    // Validar entrada con Zod
    const parsed = calificacionSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const {
      estudianteId,
      materiaId,
      trimestre,
      actividadesCotidianas,
      actividadesIntegradoras,
      examenTrimestral,
      recuperacion,
    } = parsed.data;

    if (!canAccessMateria(session, materiaId)) {
      return NextResponse.json({ error: "No tiene acceso a esta materia" }, { status: 403 });
    }

    // Validar que el estudiante pertenece al mismo grado que la materia (previene cross-grade contamination)
    const materiaGrado = await db.materia.findUnique({
      where: { id: materiaId },
      select: { gradoId: true, nombre: true },
    });
    const estudianteGrado = await db.estudiante.findUnique({
      where: { id: estudianteId },
      select: { gradoId: true, nombre: true },
    });
    // Comparar por numero/seccion para tolerar duplicados de grado en la BD
    const gradoMateria = materiaGrado ? await db.grado.findUnique({ where: { id: materiaGrado.gradoId }, select: { numero: true, seccion: true } }) : null;
    const gradoEstudiante = estudianteGrado ? await db.grado.findUnique({ where: { id: estudianteGrado.gradoId }, select: { numero: true, seccion: true } }) : null;
    const mismoGrado = gradoMateria && gradoEstudiante && gradoMateria.numero === gradoEstudiante.numero && gradoMateria.seccion === gradoEstudiante.seccion;
    if (materiaGrado && estudianteGrado && !mismoGrado) {
      return NextResponse.json({
        error: "Inconsistencia de grado",
        code: "GRADE_MISMATCH",
        message: `El estudiante "${estudianteGrado.nombre}" no pertenece al mismo grado que la materia "${materiaGrado.nombre}".`,
      }, { status: 400 });
    }

    // Parsear notas de actividades
    let acNotas: (number | null)[] = [];
    let aiNotas: (number | null)[] = [];

    if (actividadesCotidianas) {
      try {
        acNotas = typeof actividadesCotidianas === 'string'
          ? JSON.parse(actividadesCotidianas)
          : actividadesCotidianas;
        if (!Array.isArray(acNotas)) acNotas = [];
        acNotas = acNotas.map(n => (typeof n === 'number' && !isNaN(n) && n >= 0 && n <= 10) ? n : null);
      } catch { acNotas = []; }
    }

    if (actividadesIntegradoras) {
      try {
        aiNotas = typeof actividadesIntegradoras === 'string'
          ? JSON.parse(actividadesIntegradoras)
          : actividadesIntegradoras;
        if (!Array.isArray(aiNotas)) aiNotas = [];
        aiNotas = aiNotas.map(n => (typeof n === 'number' && !isNaN(n) && n >= 0 && n <= 10) ? n : null);
      } catch { aiNotas = []; }
    }

    // Calcular promedios
    const notasValidasAC = acNotas.filter((n): n is number => n !== null && n !== undefined);
    const calificacionAC = notasValidasAC.length > 0 ? notasValidasAC.reduce((a, b) => a + b, 0) / notasValidasAC.length : null;

    const notasValidasAI = aiNotas.filter((n): n is number => n !== null && n !== undefined);
    const calificacionAI = notasValidasAI.length > 0 ? notasValidasAI.reduce((a, b) => a + b, 0) / notasValidasAI.length : null;

    const config = await db.configActividad.findFirst({
      where: { materiaId, trimestre: parseInt(String(trimestre)) },
    });

    let promedioFinal: number | null = null;
    if (config) {
      const porcAC = config.porcentajeAC / 100;
      const porcAI = config.porcentajeAI / 100;
      const porcExam = config.tieneExamen ? config.porcentajeExamen / 100 : 0;

      const tieneNotas = calificacionAC !== null || calificacionAI !== null || examenTrimestral !== null;
      if (tieneNotas) {
        const suma = (calificacionAC ?? 0) * porcAC + (calificacionAI ?? 0) * porcAI + ((examenTrimestral ?? 0)) * porcExam;
        promedioFinal = isNaN(suma) ? null : suma;
        if (recuperacion !== null && recuperacion !== undefined) {
          promedioFinal = Math.min(10, (promedioFinal ?? 0) + recuperacion);
        }
      }
    } else {
      const tieneNotas = calificacionAC !== null || calificacionAI !== null || examenTrimestral !== null;
      if (tieneNotas) {
        const suma = (calificacionAC ?? 0) * 0.35 + (calificacionAI ?? 0) * 0.35 + ((examenTrimestral ?? 0)) * 0.30;
        promedioFinal = isNaN(suma) ? null : suma;
        if (recuperacion !== null && recuperacion !== undefined) {
          promedioFinal = Math.min(10, (promedioFinal ?? 0) + recuperacion);
        }
      }
    }

    const examenVal = (examenTrimestral !== undefined && examenTrimestral !== null && !isNaN(examenTrimestral)) ? examenTrimestral : null;
    const recupVal = (recuperacion !== undefined && recuperacion !== null && !isNaN(recuperacion)) ? recuperacion : null;
    const acFinal = (calificacionAC !== null && !isNaN(calificacionAC)) ? calificacionAC : null;
    const aiFinal = (calificacionAI !== null && !isNaN(calificacionAI)) ? calificacionAI : null;
    const promFinal = (promedioFinal !== null && !isNaN(promedioFinal)) ? promedioFinal : null;

    // Preparar datos de notas para crear
    const notasCreateData: { tipo: string; numeroActividad: number; nota: number }[] = [];
    for (let i = 0; i < acNotas.length; i++) {
      if (acNotas[i] !== null && acNotas[i] !== undefined) {
        notasCreateData.push({
          tipo: "cotidiana",
          numeroActividad: i + 1,
          nota: acNotas[i] as number,
        });
      }
    }
    for (let i = 0; i < aiNotas.length; i++) {
      if (aiNotas[i] !== null && aiNotas[i] !== undefined) {
        notasCreateData.push({
          tipo: "integradora",
          numeroActividad: i + 1,
          nota: aiNotas[i] as number,
        });
      }
    }

    // Ejecutar todo en una sola transacción interactiva para atomicidad
     
    const finalResult = await db.$transaction(async (tx: any) => {
      // Obtener calificación existente para comparar valores anteriores
      const existingCal = await tx.calificacion.findUnique({
        where: {
          estudianteId_materiaId_trimestre: {
            estudianteId,
            materiaId,
            trimestre: parseInt(String(trimestre)),
          },
        },
        include: {
          notasActividad: true,
        },
      });

      // Construir mapas de valores anteriores para comparación
      const oldNotasMap = new Map<string, number | null>();
      if (existingCal) {
        for (const nota of existingCal.notasActividad || []) {
          const key = `${nota.tipo}_${nota.numeroActividad}`;
          oldNotasMap.set(key, nota.nota);
        }
        if (existingCal.examenTrimestral !== null && existingCal.examenTrimestral !== undefined) {
          oldNotasMap.set("examenTrimestral", existingCal.examenTrimestral);
        }
        if (existingCal.recuperacion !== null && existingCal.recuperacion !== undefined) {
          oldNotasMap.set("recuperacion", existingCal.recuperacion);
        }
      }

      const result = await tx.calificacion.upsert({
        where: {
          estudianteId_materiaId_trimestre: {
            estudianteId,
            materiaId,
            trimestre: parseInt(String(trimestre)),
          },
        },
        update: {
          calificacionAC: acFinal,
          calificacionAI: aiFinal,
          examenTrimestral: examenVal,
          promedioFinal: promFinal,
          recuperacion: recupVal,
        },
        create: {
          estudianteId,
          materiaId,
          trimestre: parseInt(String(trimestre)),
          calificacionAC: acFinal,
          calificacionAI: aiFinal,
          examenTrimestral: examenVal,
          promedioFinal: promFinal,
          recuperacion: recupVal,
        },
      });

      await tx.notaActividad.deleteMany({
        where: { calificacionId: result.id },
      });

      if (notasCreateData.length > 0) {
        await tx.notaActividad.createMany({
          data: notasCreateData.map(n => ({
            calificacionId: result.id,
            tipo: n.tipo,
            numeroActividad: n.numeroActividad,
            nota: n.nota,
          })),
        });
      }

      // Registrar historial de cambios a nivel de celda (como Google Sheets)
      if (session && session.id) {
        try {
          const historialEntries: any[] = [];

          // Comparar actividades cotidianas
          for (let i = 0; i < acNotas.length; i++) {
            const key = `cotidiana_${i + 1}`;
            const oldVal = oldNotasMap.has(key) ? oldNotasMap.get(key) : null;
            const newVal = acNotas[i] !== null && acNotas[i] !== undefined ? acNotas[i] as number : null;
            
            if (oldVal !== newVal) {
              const descripcion = oldVal === null
                ? `AC${i + 1}: vacío → ${newVal}`
                : newVal === null
                  ? `AC${i + 1}: ${oldVal} → vacío`
                  : `AC${i + 1}: ${oldVal} → ${newVal}`;
              
              historialEntries.push({
                calificacionId: result.id,
                usuarioId: session.id,
                tipoCampo: key,
                valorAnterior: oldVal,
                valorNuevo: newVal,
                descripcion,
              });
            }
          }

          // Comparar actividades integradoras
          for (let i = 0; i < aiNotas.length; i++) {
            const key = `integradora_${i + 1}`;
            const oldVal = oldNotasMap.has(key) ? oldNotasMap.get(key) : null;
            const newVal = aiNotas[i] !== null && aiNotas[i] !== undefined ? aiNotas[i] as number : null;
            
            if (oldVal !== newVal) {
              const descripcion = oldVal === null
                ? `AI${i + 1}: vacío → ${newVal}`
                : newVal === null
                  ? `AI${i + 1}: ${oldVal} → vacío`
                  : `AI${i + 1}: ${oldVal} → ${newVal}`;
              
              historialEntries.push({
                calificacionId: result.id,
                usuarioId: session.id,
                tipoCampo: key,
                valorAnterior: oldVal,
                valorNuevo: newVal,
                descripcion,
              });
            }
          }

          // Comparar examen trimestral
          {
            const oldVal = oldNotasMap.has("examenTrimestral") ? oldNotasMap.get("examenTrimestral") : null;
            const newVal = examenVal;
            
            if (oldVal !== newVal) {
              const descripcion = oldVal === null
                ? `Examen: vacío → ${newVal}`
                : newVal === null
                  ? `Examen: ${oldVal} → vacío`
                  : `Examen: ${oldVal} → ${newVal}`;
              
              historialEntries.push({
                calificacionId: result.id,
                usuarioId: session.id,
                tipoCampo: "examenTrimestral",
                valorAnterior: oldVal,
                valorNuevo: newVal,
                descripcion,
              });
            }
          }

          // Comparar recuperación
          {
            const oldVal = oldNotasMap.has("recuperacion") ? oldNotasMap.get("recuperacion") : null;
            const newVal = recupVal;
            
            if (oldVal !== newVal) {
              const descripcion = oldVal === null
                ? `Recuperación: vacío → ${newVal}`
                : newVal === null
                  ? `Recuperación: ${oldVal} → vacío`
                  : `Recuperación: ${oldVal} → ${newVal}`;
              
              historialEntries.push({
                calificacionId: result.id,
                usuarioId: session.id,
                tipoCampo: "recuperacion",
                valorAnterior: oldVal,
                valorNuevo: newVal,
                descripcion,
              });
            }
          }

          // Insertar todos los cambios en el historial
          if (historialEntries.length > 0) {
            await tx.historialCalificacion.createMany({
              data: historialEntries,
            });

            // Mantener solo los ultimos N registros por calificacionId + tipoCampo (ventana deslizante configurable)
            let maxHist = 10;
            try {
              const configHist = await tx.$queryRaw<{ maxHistorialCelda: number | null }[]>`
                SELECT "maxHistorialCelda" FROM "ConfiguracionSistema" LIMIT 1
              `;
              maxHist = configHist[0]?.maxHistorialCelda ?? 10;
            } catch {
              maxHist = 10;
            }
            const tiposUnicos = [...new Set(historialEntries.map(h => h.tipoCampo))];
            for (const tipoCampo of tiposUnicos) {
              const todas = await tx.historialCalificacion.findMany({
                where: { calificacionId: result.id, tipoCampo },
                orderBy: { createdAt: "desc" },
                select: { id: true },
              });
              if (todas.length > maxHist) {
                const idsAEliminar = todas.slice(maxHist).map((h: any) => h.id);
                await tx.historialCalificacion.deleteMany({
                  where: { id: { in: idsAEliminar } },
                });
              }
            }
          }
        } catch (historialError) {
          console.error("[calificaciones] Historial error dentro de tx:", historialError);
        }
      }

      // Audit log dentro de la transacción (resumen general)
      if (session && session.id) {
        let gradoNombre: string | null = null;
        try {
          const est = await tx.estudiante.findUnique({
            where: { id: estudianteId },
            select: { nombre: true, gradoId: true },
          });
          if (est?.gradoId) {
            const gr = await tx.grado.findUnique({
              where: { id: est.gradoId },
              select: { numero: true, seccion: true },
            });
            gradoNombre = gr ? `${gr.numero}${gr.seccion}` : null;
          }

          const mat = await tx.materia.findUnique({
            where: { id: materiaId },
            select: { nombre: true },
          });

          await tx.auditLog.create({
            data: {
              usuarioId: session.id,
              accion: "UPDATE",
              entidad: "Calificacion",
              entidadId: result.id,
              detalles: JSON.stringify({
                estudiante: est?.nombre,
                materia: mat?.nombre,
                trimestre: parseInt(String(trimestre)),
                promedioFinal: promFinal,
                grado: gradoNombre,
              }),
            },
          });
        } catch (auditError) {
          console.error("[calificaciones] Audit error dentro de tx:", auditError);
        }
      }

      return tx.calificacion.findUnique({
        where: { id: result.id },
        include: {
          estudiante: { select: { id: true, numero: true, nombre: true, gradoId: true } },
          materia: { select: { id: true, nombre: true } },
          notasActividad: true,
        },
      });
    });

    return NextResponse.json(transformCalificacion(finalResult));
  } catch (error) {
    console.error("Error al guardar calificación:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al guardar calificación", details: errMsg }, { status: 500 });
  }
}

// ==================== DELETE: Eliminar calificación ====================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session || !isAdmin(session.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estudianteId = searchParams.get("estudianteId");
    const materiaId = searchParams.get("materiaId");
    const trimestre = searchParams.get("trimestre");
    const gradoId = searchParams.get("gradoId");

    const trimestreNum = trimestre ? parseInt(trimestre, 10) : null;
    if (trimestre && (trimestreNum === null || isNaN(trimestreNum) || trimestreNum < 1 || trimestreNum > 3)) {
      return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
    }

    if (estudianteId && materiaId && trimestreNum) {
      const cal = await db.calificacion.findFirst({
        where: { estudianteId, materiaId, trimestre: trimestreNum },
        include: {
          estudiante: { include: { grado: true } },
          materia: true,
          notasActividad: true,
        },
      });

      if (cal && session.id) {
        // Registrar historial de borrado para cada campo con valor antes de limpiar
        const historialEntries: any[] = [];
        const campos = [
          { key: "calificacionAC", label: "Prom. AC", valor: cal.calificacionAC },
          { key: "calificacionAI", label: "Prom. AI", valor: cal.calificacionAI },
          { key: "examenTrimestral", label: "Examen", valor: cal.examenTrimestral },
          { key: "promedioFinal", label: "Promedio Final", valor: cal.promedioFinal },
          { key: "recuperacion", label: "Recuperación", valor: cal.recuperacion },
        ];
        for (const campo of campos) {
          if (campo.valor !== null && campo.valor !== undefined) {
            historialEntries.push({
              calificacionId: cal.id,
              usuarioId: session.id,
              tipoCampo: campo.key,
              valorAnterior: campo.valor,
              valorNuevo: null,
              descripcion: `${campo.label}: ${campo.valor} → borrado`,
            });
          }
        }
        for (const nota of cal.notasActividad || []) {
          historialEntries.push({
            calificacionId: cal.id,
            usuarioId: session.id,
            tipoCampo: `${nota.tipo}_${nota.numeroActividad}`,
            valorAnterior: nota.nota,
            valorNuevo: null,
            descripcion: `${nota.tipo === "cotidiana" ? "AC" : "AI"}${nota.numeroActividad}: ${nota.nota} → borrado`,
          });
        }
        if (historialEntries.length > 0) {
          try {
            await db.historialCalificacion.createMany({ data: historialEntries });
          } catch (histError) {
            console.error("[calificaciones] Historial borrado error:", histError);
          }
        }

        // Borrar notas asociadas
        await db.notaActividad.deleteMany({
          where: { calificacionId: cal.id }
        });

        // Soft delete: limpiar todos los campos en vez de borrar el registro
        // Esto preserva el historial de cambios (onDelete: Cascade del historial
        // se dispara solo si se borra la calificación físicamente)
        await db.calificacion.updateMany({
          where: { id: cal.id },
          data: {
            calificacionAC: null,
            calificacionAI: null,
            examenTrimestral: null,
            promedioFinal: null,
            recuperacion: null,
          },
        });
      }

      try {
        await db.auditLog.create({
          data: {
            usuarioId: session.id,
            accion: "DELETE",
            entidad: "Calificacion",
            detalles: JSON.stringify({
              estudiante: cal?.estudiante?.nombre,
              materia: cal?.materia?.nombre,
              trimestre: trimestreNum,
              grado: cal?.estudiante?.grado ? `${cal.estudiante.grado.numero}${cal.estudiante.grado.seccion}` : null
            }),
          },
        });
      } catch (auditError) {
        console.error("[calificaciones] Audit error:", auditError);
      }

      return NextResponse.json({ deleted: 1 });
    }

    if (gradoId && materiaId && trimestreNum) {
      const grado = await db.grado.findUnique({ where: { id: gradoId }, select: { numero: true, seccion: true } });
      const materia = await db.materia.findUnique({ where: { id: materiaId }, select: { nombre: true } });

      // Obtener calificaciones del grado para soft delete
      const calificacionesGrado = await db.calificacion.findMany({
        where: {
          estudiante: { gradoId },
          materiaId,
          trimestre: trimestreNum
        },
        include: { notasActividad: true }
      });

      if (calificacionesGrado.length > 0 && session.id) {
        // Registrar historial de borrado para cada calificación
        const historialEntries: any[] = [];
        for (const cal of calificacionesGrado) {
          const campos = [
            { key: "calificacionAC", label: "Prom. AC", valor: cal.calificacionAC },
            { key: "calificacionAI", label: "Prom. AI", valor: cal.calificacionAI },
            { key: "examenTrimestral", label: "Examen", valor: cal.examenTrimestral },
            { key: "promedioFinal", label: "Promedio Final", valor: cal.promedioFinal },
            { key: "recuperacion", label: "Recuperación", valor: cal.recuperacion },
          ];
          for (const campo of campos) {
            if (campo.valor !== null && campo.valor !== undefined) {
              historialEntries.push({
                calificacionId: cal.id,
                usuarioId: session.id,
                tipoCampo: campo.key,
                valorAnterior: campo.valor,
                valorNuevo: null,
                descripcion: `${campo.label}: ${campo.valor} → borrado`,
              });
            }
          }
          for (const nota of cal.notasActividad || []) {
            historialEntries.push({
              calificacionId: cal.id,
              usuarioId: session.id,
              tipoCampo: `${nota.tipo}_${nota.numeroActividad}`,
              valorAnterior: nota.nota,
              valorNuevo: null,
              descripcion: `${nota.tipo === "cotidiana" ? "AC" : "AI"}${nota.numeroActividad}: ${nota.nota} → borrado`,
            });
          }
        }
        if (historialEntries.length > 0) {
          try {
            await db.historialCalificacion.createMany({ data: historialEntries });
          } catch (histError) {
            console.error("[calificaciones] Historial borrado error:", histError);
          }
        }

        // Borrar notas asociadas
        const califIds = calificacionesGrado.map(c => c.id);
        await db.notaActividad.deleteMany({
          where: { calificacionId: { in: califIds } }
        });

        // Soft delete: limpiar campos en vez de borrar físicamente
        await db.calificacion.updateMany({
          where: { id: { in: califIds } },
          data: {
            calificacionAC: null,
            calificacionAI: null,
            examenTrimestral: null,
            promedioFinal: null,
            recuperacion: null,
          },
        });
      }

      try {
        await db.auditLog.create({
          data: {
            usuarioId: session.id,
            accion: "DELETE",
            entidad: "Calificacion",
            detalles: JSON.stringify({
              materia: materia?.nombre,
              trimestre: trimestreNum,
              cantidad: calificacionesGrado.length,
              grado: grado ? `${grado.numero}${grado.seccion}` : null
            }),
          },
        });
      } catch (auditError) {
        console.error("[calificaciones] Audit error:", auditError);
      }

      return NextResponse.json({ borradas: calificacionesGrado.length });
    }
    return NextResponse.json({ error: "Parámetros insuficientes" }, { status: 400 });
  } catch (error) {
    console.error("Error al borrar calificaciones:", error);
    return NextResponse.json({ error: "Error al borrar" }, { status: 500 });
  }
}
