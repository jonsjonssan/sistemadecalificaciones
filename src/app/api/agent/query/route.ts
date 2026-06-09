import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

interface ConsultaResultado {
  pregunta: string;
  respuesta: string;
  datos?: any;
  tipo: "estadistica" | "lista" | "alerta" | "info";
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .trim();
}

function extraerNumero(texto: string): number | null {
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

async function buscarGradoPorNumero(numero: number) {
  return db.grado.findFirst({
    where: { numero },
    select: { id: true, numero: true, seccion: true },
  });
}

async function contarEstudiantesEnRiesgo(gradoId?: string): Promise<{ total: number; alto: number; medio: number }> {
  const where: any = { resuelto: false };
  if (gradoId) where.gradoId = gradoId;

  const alertas = await db.agentAlert.findMany({ where });
  const alto = alertas.filter((a) => a.tipo === "riesgo_alto").length;
  const medio = alertas.filter((a) => a.tipo === "riesgo_medio").length;

  return { total: alertas.length, alto, medio };
}

async function obtenerPromedioGrado(gradoId: string, trimestre?: number): Promise<number | null> {
  const where: any = { estudiante: { gradoId } };
  if (trimestre) where.trimestre = trimestre;

  const calificaciones = await db.calificacion.findMany({
    where,
    select: { promedioFinal: true },
  });

  const validas = calificaciones.filter((c) => c.promedioFinal !== null);
  if (validas.length === 0) return null;

  const suma = validas.reduce((acc, c) => acc + (c.promedioFinal as number), 0);
  return Math.round((suma / validas.length) * 100) / 100;
}

async function obtenerEstudiantesBajoRendimiento(gradoId: string, limite: number = 10) {
  const calificaciones = await db.calificacion.findMany({
    where: { estudiante: { gradoId } },
    include: {
      estudiante: { select: { id: true, nombre: true, numero: true } },
      materia: { select: { nombre: true } },
    },
  });

  const promediosPorEstudiante = new Map<string, { nombre: string; numero: number; suma: number; cuenta: number }>();

  for (const cal of calificaciones) {
    if (cal.promedioFinal === null) continue;
    const estId = cal.estudianteId;
    if (!promediosPorEstudiante.has(estId)) {
      promediosPorEstudiante.set(estId, {
        nombre: cal.estudiante.nombre,
        numero: cal.estudiante.numero,
        suma: 0,
        cuenta: 0,
      });
    }
    const data = promediosPorEstudiante.get(estId)!;
    data.suma += cal.promedioFinal;
    data.cuenta++;
  }

  const estudiantes = Array.from(promediosPorEstudiante.entries())
    .map(([id, data]) => ({
      id,
      nombre: data.nombre,
      numero: data.numero,
      promedio: Math.round((data.suma / data.cuenta) * 100) / 100,
    }))
    .filter((e) => e.promedio < 6.5)
    .sort((a, b) => a.promedio - b.promedio)
    .slice(0, limite);

  return estudiantes;
}

async function obtenerAsistenciaGrado(gradoId: string): Promise<{ porcentaje: number; total: number } | null> {
  const asistencias = await db.asistencia.findMany({
    where: { gradoId },
    select: { estado: true },
  });

  if (asistencias.length === 0) return null;

  const presentes = asistencias.filter((a) => a.estado === "presente" || a.estado === "tarde").length;
  const porcentaje = Math.round((presentes / asistencias.length) * 10000) / 100;

  return { porcentaje, total: asistencias.length };
}

function generarRespuestaConsulta(
  pregunta: string,
  datos: any,
  tipo: ConsultaResultado["tipo"]
): string {
  const texto = normalizarTexto(pregunta);

  if (tipo === "estadistica") {
    if (texto.includes("riesgo") || texto.includes("alerta")) {
      return `Se detectaron ${datos.total} estudiantes en riesgo: ${datos.alto} en riesgo alto y ${datos.medio} en riesgo medio. Se recomienda revisar las alertas en el Dashboard.`;
    }
    if (texto.includes("promedio")) {
      return datos.promedio !== null
        ? `El promedio del grado es ${datos.promedio.toFixed(2)} sobre 10.`
        : "No hay calificaciones registradas para calcular el promedio.";
    }
    if (texto.includes("asistencia")) {
      return datos.asistencia
        ? `La asistencia del grado es ${datos.asistencia.porcentaje.toFixed(1)}% (${datos.asistencia.total} registros).`
        : "No hay registros de asistencia para este grado.";
    }
  }

  if (tipo === "lista") {
    if (texto.includes("bajo rendimiento") || texto.includes("reprobando")) {
      if (datos.estudiantes.length === 0) {
        return "No hay estudiantes con bajo rendimiento en este grado. ¡Excelente!";
      }
      const lista = datos.estudiantes
        .map((e: any, i: number) => `${i + 1}. ${e.nombre} (promedio: ${e.promedio.toFixed(1)})`)
        .join("\n");
      return `Estudiantes con bajo rendimiento:\n${lista}`;
    }
  }

  if (tipo === "info") {
    return datos.mensaje || "Información no disponible.";
  }

  return "No pude entender la consulta. Intenta preguntar sobre: riesgos, promedios, asistencia o estudiantes con bajo rendimiento.";
}

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

    const body = await req.json();
    const pregunta = body.pregunta as string;
    const gradoId = body.gradoId as string | undefined;

    if (!pregunta || pregunta.trim().length < 5) {
      return NextResponse.json({ error: "La pregunta debe tener al menos 5 caracteres" }, { status: 400 });
    }

    const texto = normalizarTexto(pregunta);
    let resultado: ConsultaResultado;

    if (texto.includes("riesgo") || texto.includes("alerta")) {
      const datos = await contarEstudiantesEnRiesgo(gradoId);
      resultado = {
        pregunta,
        respuesta: generarRespuestaConsulta(pregunta, datos, "estadistica"),
        datos,
        tipo: "estadistica",
      };
    } else if (texto.includes("promedio")) {
      if (!gradoId) {
        resultado = {
          pregunta,
          respuesta: "Para consultar el promedio, necesito que selecciones un grado primero.",
          tipo: "info",
          datos: { mensaje: "Grado requerido" },
        };
      } else {
        const trimestre = texto.includes("trimestre") ? extraerNumero(texto) || undefined : undefined;
        const promedio = await obtenerPromedioGrado(gradoId, trimestre);
        resultado = {
          pregunta,
          respuesta: generarRespuestaConsulta(pregunta, { promedio }, "estadistica"),
          datos: { promedio },
          tipo: "estadistica",
        };
      }
    } else if (texto.includes("asistencia")) {
      if (!gradoId) {
        resultado = {
          pregunta,
          respuesta: "Para consultar la asistencia, necesito que selecciones un grado primero.",
          tipo: "info",
          datos: { mensaje: "Grado requerido" },
        };
      } else {
        const asistencia = await obtenerAsistenciaGrado(gradoId);
        resultado = {
          pregunta,
          respuesta: generarRespuestaConsulta(pregunta, { asistencia }, "estadistica"),
          datos: { asistencia },
          tipo: "estadistica",
        };
      }
    } else if (texto.includes("bajo rendimiento") || texto.includes("reprobando") || texto.includes("mal")) {
      if (!gradoId) {
        resultado = {
          pregunta,
          respuesta: "Para consultar estudiantes con bajo rendimiento, necesito que selecciones un grado primero.",
          tipo: "info",
          datos: { mensaje: "Grado requerido" },
        };
      } else {
        const estudiantes = await obtenerEstudiantesBajoRendimiento(gradoId);
        resultado = {
          pregunta,
          respuesta: generarRespuestaConsulta(pregunta, { estudiantes }, "lista"),
          datos: { estudiantes },
          tipo: "lista",
        };
      }
    } else if (texto.includes("ayuda") || texto.includes("puedes")) {
      resultado = {
        pregunta,
        respuesta: "Puedo ayudarte con:\n• ¿Cuántos estudiantes están en riesgo?\n• ¿Cuál es el promedio del grado?\n• ¿Cómo está la asistencia?\n• ¿Qué estudiantes tienen bajo rendimiento?\n\nSelecciona un grado y haz tu pregunta.",
        tipo: "info",
        datos: { mensaje: "Ayuda" },
      };
    } else {
      resultado = {
        pregunta,
        respuesta: "No entendí tu consulta. Puedo ayudarte con información sobre riesgos, promedios, asistencia o estudiantes con bajo rendimiento. ¿En qué puedo ayudarte?",
        tipo: "info",
        datos: { mensaje: "Consulta no reconocida" },
      };
    }

    await db.agentLog.create({
      data: {
        tipo: "consulta",
        iniciadoPor: session.id,
        resumen: `Consulta: "${pregunta}" → ${resultado.tipo}`,
      },
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("[agent/query] Error:", error);
    return NextResponse.json({ error: "Error al procesar la consulta" }, { status: 500 });
  }
}
