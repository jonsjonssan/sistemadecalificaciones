import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { isAdmin } from "@/utils/roleHelpers";
import { ejecutarAnalisisCompleto } from "@/lib/agent/rules";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const session = verifySession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const escuelaId = (session as any).escuelaId || '';

    const soloDirectiva = ["admin", "admin-directora", "admin-codirectora"].includes(session.rol);
    if (!soloDirectiva) {
      return NextResponse.json({ error: "Solo directivos pueden ejecutar el agente monitor" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const gradoId = body.gradoId as string | undefined;
    const año = body.año ? parseInt(body.año) : new Date().getFullYear();
    const guardarAlertas = body.guardarAlertas !== false;

    const inicioTiempo = Date.now();

    const resultado = await ejecutarAnalisisCompleto(año, gradoId);

    let ejecucionId: string | null = null;

    if (guardarAlertas && resultado.estudiantesEnRiesgo.length > 0) {
      const ejecucion = await db.agentLog.create({
        data: {
          tipo: gradoId ? "ejecucion_manual" : "ejecucion_mensual",
          iniciadoPor: session.id,
          gradosAnalizados: gradoId ? 1 : new Set(resultado.estudiantesEnRiesgo.map((e) => e.gradoId)).size,
          estudiantesAnalizados: resultado.resumen.totalAnalizados,
          alertasGeneradas: resultado.estudiantesEnRiesgo.length,
          alertasAltoRiesgo: resultado.resumen.riesgoAlto,
          alertasMedioRiesgo: resultado.resumen.riesgoMedio,
          duracionMs: Date.now() - inicioTiempo,
          resumen: `Análisis completado: ${resultado.resumen.riesgoAlto} riesgo alto, ${resultado.resumen.riesgoMedio} riesgo medio, ${resultado.resumen.bajoRendimiento} bajo rendimiento, ${resultado.resumen.asistenciaCritica} asistencia crítica`,
          escuelaId,
        },
      });
      ejecucionId = ejecucion.id;

      for (const riesgo of resultado.estudiantesEnRiesgo) {
        await db.agentAlert.create({
          data: {
            tipo: riesgo.tipo,
            estudianteId: riesgo.estudianteId,
            gradoId: riesgo.gradoId,
            materiaId: riesgo.materiasDebiles.length > 0 ? riesgo.materiasDebiles[0].materiaId : null,
            trimestre: 3,
            puntajeRiesgo: riesgo.puntajeRiesgo,
            factores: JSON.stringify(riesgo.factores),
            recomendacion: riesgo.recomendacion,
            ejecucionId: ejecucion.id,
            escuelaId,
          },
        });
      }
    }

    const duracion = Date.now() - inicioTiempo;

    return NextResponse.json({
      exito: true,
      ejecucionId,
      duracionMs: duracion,
      resumen: resultado.resumen,
      estudiantesEnRiesgo: resultado.estudiantesEnRiesgo,
      mensaje: `Análisis completado en ${duracion}ms. ${resultado.estudiantesEnRiesgo.length} estudiantes en riesgo detectados.`,
    });
  } catch (error) {
    console.error("[agent/monitor] Error:", error);
    return NextResponse.json({ error: "Error al ejecutar el agente monitor" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const session = verifySession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gradoId = searchParams.get("gradoId");
    const soloNoLeidas = searchParams.get("leidas") === "no";
    const limit = parseInt(searchParams.get("limit") || "50");

    const alertas = await db.agentAlert.findMany({
      where: {
        ...(gradoId ? { gradoId } : {}),
        ...(soloNoLeidas ? { leido: false } : {}),
        resuelto: false,
      },
      include: {
        estudiante: { select: { id: true, nombre: true, numero: true } },
        grado: { select: { id: true, numero: true, seccion: true } },
        materia: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const alertasFormateadas = alertas.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      puntajeRiesgo: a.puntajeRiesgo,
      estudiante: a.estudiante,
      grado: a.grado,
      materia: a.materia,
      factores: JSON.parse(a.factores),
      recomendacion: a.recomendacion,
      leido: a.leido,
      createdAt: a.createdAt,
    }));

    const conteoPorTipo = await db.agentAlert.groupBy({
      by: ["tipo"],
      where: { resuelto: false, leido: false },
      _count: { tipo: true },
    });

    return NextResponse.json({
      alertas: alertasFormateadas,
      conteo: Object.fromEntries(conteoPorTipo.map((c) => [c.tipo, c._count.tipo])),
      totalNoLeidas: alertas.filter((a) => !a.leido).length,
    });
  } catch (error) {
    console.error("[agent/monitor] Error:", error);
    return NextResponse.json({ error: "Error al obtener alertas" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const session = verifySession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const soloDirectiva = ["admin", "admin-directora", "admin-codirectora"].includes(session.rol);
    if (!soloDirectiva) {
      return NextResponse.json({ error: "Solo directivos pueden borrar alertas del agente" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const borrarTodo = body.todo === true;
    const borrarLeidas = body.leidas === true;
    const borrarAlertas = body.alertas !== false;
    const borrarLogs = body.logs === true;

    let alertasBorradas = 0;
    let logsBorrados = 0;

    if (borrarAlertas) {
      const where: any = {};
      if (!borrarTodo) {
        where.leido = true;
        if (!borrarLeidas) where.resuelto = true;
      }
      const resultado = await db.agentAlert.deleteMany({ where });
      alertasBorradas = resultado.count;
    }

    if (borrarLogs) {
      const resultado = await db.agentLog.deleteMany({});
      logsBorrados = resultado.count;
    }

    return NextResponse.json({
      exito: true,
      alertasBorradas,
      logsBorrados,
      mensaje: `Eliminadas ${alertasBorradas} alertas y ${logsBorrados} logs del agente monitor.`,
    });
  } catch (error) {
    console.error("[agent/monitor DELETE] Error:", error);
    return NextResponse.json({ error: "Error al borrar datos del agente" }, { status: 500 });
  }
}
