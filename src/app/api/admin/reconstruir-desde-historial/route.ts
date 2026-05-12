import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-middleware";

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { gradoId, materiaId, trimestre, dryRun = true } = body;

    if (!gradoId) {
      return NextResponse.json({ error: "gradoId es requerido" }, { status: 400 });
    }

    // Obtener estudiantes del grado
    const estudiantes = await db.estudiante.findMany({
      where: { gradoId },
      select: { id: true },
    });
    const estudianteIds = estudiantes.map((e: any) => e.id);

    if (estudianteIds.length === 0) {
      return NextResponse.json({ error: "No se encontraron estudiantes en este grado" }, { status: 404 });
    }

    // Obtener calificaciones con su historial
    const calificaciones = await db.calificacion.findMany({
      where: {
        estudianteId: { in: estudianteIds },
        ...(materiaId ? { materiaId } : {}),
        ...(trimestre ? { trimestre: parseInt(String(trimestre)) } : {}),
      },
      include: {
        historialCambios: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const reconstrucciones: any[] = [];
    const cambiosRealizados: any[] = [];

    for (const cal of calificaciones) {
      // Agrupar historial por tipoCampo
      const historialPorCampo = new Map<string, typeof cal.historialCambios>();
      for (const h of cal.historialCambios) {
        if (!historialPorCampo.has(h.tipoCampo)) {
          historialPorCampo.set(h.tipoCampo, []);
        }
        historialPorCampo.get(h.tipoCampo)!.push(h);
      }

      const camposReconstruidos = new Set<string>();

      for (const [tipoCampo, historial] of historialPorCampo) {
        // Buscar el último valor no nulo en el historial
        // Primero buscamos un valorNuevo no nulo (cambio exitoso)
        let valorReconstruido: number | null = null;
        for (const h of historial) {
          if (h.valorNuevo !== null && h.valorNuevo !== undefined) {
            valorReconstruido = h.valorNuevo;
            break;
          }
        }
        // Si no hay valorNuevo no nulo, usamos el valorAnterior más reciente
        // (que sería el valor que existía antes de que se borrara)
        if (valorReconstruido === null) {
          for (const h of historial) {
            if (h.valorAnterior !== null && h.valorAnterior !== undefined) {
              valorReconstruido = h.valorAnterior;
              break;
            }
          }
        }

        if (valorReconstruido !== null) {
          reconstrucciones.push({
            calificacionId: cal.id,
            estudianteId: cal.estudianteId,
            materiaId: cal.materiaId,
            trimestre: cal.trimestre,
            tipoCampo,
            valor: valorReconstruido,
          });

          if (!dryRun) {
            camposReconstruidos.add(tipoCampo);

            if (tipoCampo.startsWith("cotidiana_") || tipoCampo.startsWith("integradora_")) {
              const [tipo, numStr] = tipoCampo.split("_");
              const numeroActividad = parseInt(numStr, 10);
              // Upsert notaActividad
              const existing = await db.notaActividad.findFirst({
                where: { calificacionId: cal.id, tipo, numeroActividad },
              });
              if (existing) {
                await db.notaActividad.update({
                  where: { id: existing.id },
                  data: { nota: valorReconstruido },
                });
              } else {
                await db.notaActividad.create({
                  data: {
                    calificacionId: cal.id,
                    tipo,
                    numeroActividad,
                    nota: valorReconstruido,
                  },
                });
              }
            } else if (tipoCampo === "examenTrimestral") {
              await db.calificacion.update({
                where: { id: cal.id },
                data: { examenTrimestral: valorReconstruido },
              });
            } else if (tipoCampo === "recuperacion") {
              await db.calificacion.update({
                where: { id: cal.id },
                data: { recuperacion: valorReconstruido },
              });
            }
          }
        }
      }

      // Si no es dryRun, recalcular promedios para esta calificación
      if (!dryRun && camposReconstruidos.size > 0) {
        const notas = await db.notaActividad.findMany({
          where: { calificacionId: cal.id },
        });

        const acNotas = notas
          .filter((n: any) => n.tipo === "cotidiana")
          .map((n: any) => n.nota);
        const aiNotas = notas
          .filter((n: any) => n.tipo === "integradora")
          .map((n: any) => n.nota);

        const promAC =
          acNotas.length > 0
            ? acNotas.reduce((a: number, b: number) => a + b, 0) / acNotas.length
            : null;
        const promAI =
          aiNotas.length > 0
            ? aiNotas.reduce((a: number, b: number) => a + b, 0) / aiNotas.length
            : null;

        const califData = await db.calificacion.findUnique({
          where: { id: cal.id },
          select: {
            examenTrimestral: true,
            recuperacion: true,
            materiaId: true,
            trimestre: true,
          },
        });

        // Obtener config
        const config = await db.configActividad.findFirst({
          where: {
            materiaId: califData?.materiaId,
            trimestre: califData?.trimestre,
          },
        });

        let promedioFinal: number | null = null;
        if (
          promAC !== null ||
          promAI !== null ||
          califData?.examenTrimestral !== null
        ) {
          const porcAC = config ? config.porcentajeAC / 100 : 0.35;
          const porcAI = config ? config.porcentajeAI / 100 : 0.35;
          const porcEx =
            config && config.tieneExamen
              ? config.porcentajeExamen / 100
              : 0.3;

          const suma =
            (promAC ?? 0) * porcAC +
            (promAI ?? 0) * porcAI +
            (califData?.examenTrimestral ?? 0) * porcEx;
          promedioFinal = isNaN(suma) ? null : suma;

          if (
            califData?.recuperacion !== null &&
            califData?.recuperacion !== undefined
          ) {
            promedioFinal = Math.min(
              10,
              (promedioFinal ?? 0) + califData.recuperacion
            );
          }
        }

        await db.calificacion.update({
          where: { id: cal.id },
          data: {
            calificacionAC: promAC,
            calificacionAI: promAI,
            promedioFinal,
          },
        });

        cambiosRealizados.push({
          calificacionId: cal.id,
          estudianteId: cal.estudianteId,
          materiaId: cal.materiaId,
          trimestre: cal.trimestre,
          promAC,
          promAI,
          promedioFinal,
          campos: Array.from(camposReconstruidos),
        });
      }
    }

    return NextResponse.json({
      dryRun,
      totalCalificaciones: calificaciones.length,
      totalReconstrucciones: reconstrucciones.length,
      detalles: reconstrucciones,
      cambiosRealizados: dryRun ? undefined : cambiosRealizados,
      mensaje: dryRun
        ? `MODO SIMULACIÓN: Se encontraron ${reconstrucciones.length} valores para reconstruir. Envía dryRun: false para aplicar cambios.`
        : `Se reconstruyeron ${reconstrucciones.length} valores y se recalcularon ${cambiosRealizados.length} promedios.`,
    });
  } catch (error: any) {
    console.error("[reconstruir-desde-historial] Error:", error);
    return NextResponse.json(
      { error: "Error al reconstruir", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
