import { db } from "@/lib/db";
import {
  AGENTE_TENDENCIA_FUERTE,
  AGENTE_TENDENCIA_LEVE,
  AGENTE_UMBRAL_DESCARTAR,
  AGENTE_UMBRAL_RIESGO_ALTO,
  AGENTE_UMBRAL_RIESGO_MEDIO,
  ASISTENCIA_BAJA_PCT,
  ASISTENCIA_CRITICA_PCT,
  ASISTENCIA_PESO_TARDANZA,
  UMBRAL_APROBADO_DEFAULT,
  UMBRAL_CONDICIONADO_DEFAULT,
  UMBRAL_RECUPERACION_DEFAULT,
} from "@/lib/constants";

export interface EstudianteRiesgo {
  estudianteId: string;
  nombre: string;
  gradoId: string;
  gradoNumero: number;
  gradoSeccion: string;
  puntajeRiesgo: number;
  tipo: "riesgo_alto" | "riesgo_medio" | "bajo_rendimiento" | "asistencia_critica";
  factores: string[];
  recomendacion: string;
  promedios: { t1: number | null; t2: number | null; t3: number | null };
  asistencia: number | null;
  materiasDebiles: { materiaId: string; nombre: string; promedio: number }[];
}

export interface ResultadoAnalisis {
  estudiantesEnRiesgo: EstudianteRiesgo[];
  resumen: {
    totalAnalizados: number;
    riesgoAlto: number;
    riesgoMedio: number;
    bajoRendimiento: number;
    asistenciaCritica: number;
  };
}

interface Umbrales {
  umbralAprobado: number;
  umbralCondicionado: number;
  umbralRecuperacion: number;
}

async function getUmbrales(escuelaId?: string): Promise<Umbrales> {
  const config = await db.configuracionSistema.findFirst({ where: escuelaId ? { escuelaId } : undefined });
  return {
    umbralAprobado: config?.umbralAprobado ?? UMBRAL_APROBADO_DEFAULT,
    umbralCondicionado: config?.umbralCondicionado ?? UMBRAL_CONDICIONADO_DEFAULT,
    umbralRecuperacion: config?.umbralRecuperacion ?? UMBRAL_RECUPERACION_DEFAULT,
  };
}

function calcularTendencia(promedios: (number | null)[]): number {
  const validos = promedios.filter((p): p is number => p !== null);
  if (validos.length < 2) return 0;

  let sumaDiferencias = 0;
  for (let i = 1; i < validos.length; i++) {
    sumaDiferencias += validos[i] - validos[i - 1];
  }
  return sumaDiferencias / (validos.length - 1);
}

function generarRecomendacion(tipo: string): string {
  const recomendaciones: Record<string, string> = {
    riesgo_alto: `Estudiante en riesgo crítico de reprobación. Se recomienda: (1) Citación inmediata a padres/tutores, (2) Plan de refuerzo académico personalizado, (3) Seguimiento semanal de avances, (4) Evaluación psicopedagógica si persiste el bajo rendimiento.`,
    riesgo_medio: `Estudiante con tendencia negativa. Se recomienda: (1) Comunicación con padres para informar situación, (2) Refuerzo en materias débiles, (3) Monitoreo quincenal de calificaciones, (4) Estrategias de motivación y acompañamiento.`,
    bajo_rendimiento: `Estudiante por debajo del umbral aprobado. Se recomienda: (1) Identificar causas del bajo rendimiento (académicas, personales, familiares), (2) Ofrecer actividades de recuperación, (3) Tutoría entre pares o apoyo docente adicional.`,
    asistencia_critica: `Asistencia por debajo del ${ASISTENCIA_CRITICA_PCT}%. El ausentismo impacta directamente el rendimiento. Se recomienda: (1) Contactar a la familia para conocer causas, (2) Establecer compromiso de asistencia, (3) Considerar factores externos (salud, transporte, situación familiar), (4) Reportar a orientación escolar si es necesario.`,
  };

  return recomendaciones[tipo] || "Se recomienda seguimiento y evaluación del caso.";
}

interface AnalisisData {
  estudiante: {
    id: string;
    nombre: string;
    gradoId: string;
    grado: { id: string; numero: number; seccion: string };
  };
  calificaciones: Array<{
    promedioFinal: number | null;
    trimestre: number;
    materiaId: string;
    materia: { id: string; nombre: string; gradoId: string };
  }>;
  asistencia: {
    porcentaje: number;
    presentes: number;
    ausentes: number;
    tardanzas: number;
    justificadas: number;
    total: number;
  } | null;
}

function procesarEstudiante(data: AnalisisData, umbrales: Umbrales): EstudianteRiesgo | null {
  const { estudiante, calificaciones, asistencia } = data;

  if (calificaciones.length === 0) return null;

  const promediosPorTrimestre: Record<number, number[]> = { 1: [], 2: [], 3: [] };
  const materiasMap = new Map<string, { nombre: string; promedios: number[] }>();

  for (const cal of calificaciones) {
    if (cal.promedioFinal !== null) {
      promediosPorTrimestre[cal.trimestre].push(cal.promedioFinal);

      if (!materiasMap.has(cal.materiaId)) {
        materiasMap.set(cal.materiaId, { nombre: cal.materia.nombre, promedios: [] });
      }
      materiasMap.get(cal.materiaId)!.promedios.push(cal.promedioFinal);
    }
  }

  const promT1 = promediosPorTrimestre[1].length > 0
    ? promediosPorTrimestre[1].reduce((a, b) => a + b, 0) / promediosPorTrimestre[1].length
    : null;
  const promT2 = promediosPorTrimestre[2].length > 0
    ? promediosPorTrimestre[2].reduce((a, b) => a + b, 0) / promediosPorTrimestre[2].length
    : null;
  const promT3 = promediosPorTrimestre[3].length > 0
    ? promediosPorTrimestre[3].reduce((a, b) => a + b, 0) / promediosPorTrimestre[3].length
    : null;

  const todosPromedios = [promT1, promT2, promT3].filter((p): p is number => p !== null);
  if (todosPromedios.length === 0) return null;

  const promedioGeneral = todosPromedios.reduce((a, b) => a + b, 0) / todosPromedios.length;
  const tendencia = calcularTendencia([promT1, promT2, promT3]);

  const materiasDebiles: { materiaId: string; nombre: string; promedio: number }[] = [];
  let materiasCondicionadas = 0;
  let materiasReprobadas = 0;

  for (const [materiaId, materiaData] of materiasMap) {
    const promMateria = materiaData.promedios.reduce((a, b) => a + b, 0) / materiaData.promedios.length;
    if (promMateria < umbrales.umbralAprobado) {
      materiasDebiles.push({ materiaId, nombre: materiaData.nombre, promedio: Math.round(promMateria * 100) / 100 });
      if (promMateria < umbrales.umbralCondicionado) {
        materiasReprobadas++;
      } else {
        materiasCondicionadas++;
      }
    }
  }

  const factores: string[] = [];
  let puntajeRiesgo = 0;

  if (promedioGeneral < umbrales.umbralCondicionado) {
    puntajeRiesgo += 0.4;
    factores.push(`Promedio general muy bajo (${promedioGeneral.toFixed(1)})`);
  } else if (promedioGeneral < umbrales.umbralAprobado) {
    puntajeRiesgo += 0.25;
    factores.push(`Promedio general por debajo de aprobado (${promedioGeneral.toFixed(1)})`);
  }

  if (tendencia < AGENTE_TENDENCIA_FUERTE) {
    puntajeRiesgo += 0.2;
    factores.push(`Tendencia negativa sostenida (${tendencia.toFixed(2)} por trimestre)`);
  } else if (tendencia < AGENTE_TENDENCIA_LEVE) {
    puntajeRiesgo += 0.1;
    factores.push(`Tendencia ligeramente negativa (${tendencia.toFixed(2)} por trimestre)`);
  }

  if (materiasReprobadas > 0) {
    puntajeRiesgo += 0.2 * materiasReprobadas;
    factores.push(`${materiasReprobadas} materia(s) reprobada(s)`);
  }

  if (materiasCondicionadas > 0) {
    puntajeRiesgo += 0.1 * materiasCondicionadas;
    factores.push(`${materiasCondicionadas} materia(s) condicionada(s)`);
  }

  if (asistencia && asistencia.porcentaje < ASISTENCIA_CRITICA_PCT) {
    puntajeRiesgo += 0.3;
    factores.push(`Asistencia crítica (${asistencia.porcentaje.toFixed(1)}%)`);
  } else if (asistencia && asistencia.porcentaje < ASISTENCIA_BAJA_PCT) {
    puntajeRiesgo += 0.15;
    factores.push(`Asistencia baja (${asistencia.porcentaje.toFixed(1)}%)`);
  }

  puntajeRiesgo = Math.min(1, puntajeRiesgo);

  let tipo: EstudianteRiesgo["tipo"];
  if (puntajeRiesgo >= AGENTE_UMBRAL_RIESGO_ALTO) {
    tipo = "riesgo_alto";
  } else if (puntajeRiesgo >= AGENTE_UMBRAL_RIESGO_MEDIO) {
    tipo = "riesgo_medio";
  } else if (asistencia && asistencia.porcentaje < ASISTENCIA_CRITICA_PCT) {
    tipo = "asistencia_critica";
  } else {
    tipo = "bajo_rendimiento";
  }

  if (puntajeRiesgo < AGENTE_UMBRAL_DESCARTAR && (!asistencia || asistencia.porcentaje >= ASISTENCIA_BAJA_PCT)) {
    return null;
  }

  const recomendacion = generarRecomendacion(tipo);

  return {
    estudianteId: estudiante.id,
    nombre: estudiante.nombre,
    gradoId: estudiante.gradoId,
    gradoNumero: estudiante.grado.numero,
    gradoSeccion: estudiante.grado.seccion,
    puntajeRiesgo: Math.round(puntajeRiesgo * 100) / 100,
    tipo,
    factores,
    recomendacion,
    promedios: {
      t1: promT1 !== null ? Math.round(promT1 * 100) / 100 : null,
      t2: promT2 !== null ? Math.round(promT2 * 100) / 100 : null,
      t3: promT3 !== null ? Math.round(promT3 * 100) / 100 : null,
    },
    asistencia: asistencia?.porcentaje ?? null,
    materiasDebiles: materiasDebiles.sort((a, b) => a.promedio - b.promedio),
  };
}

export async function ejecutarAnalisisCompleto(
  año: number,
  gradoId?: string,
  escuelaId?: string
): Promise<ResultadoAnalisis> {
  const umbrales = await getUmbrales(escuelaId);

  const estudiantes = await db.estudiante.findMany({
    where: {
      activo: true,
      ...(escuelaId ? { escuelaId } : {}),
      ...(gradoId ? { gradoId } : {}),
    },
    include: { grado: { select: { id: true, numero: true, seccion: true } } },
  });

  estudiantes.sort((a, b) => {
    if (a.grado.numero !== b.grado.numero) return a.grado.numero - b.grado.numero;
    return a.numero - b.numero;
  });

  if (estudiantes.length === 0) {
    return {
      estudiantesEnRiesgo: [],
      resumen: { totalAnalizados: 0, riesgoAlto: 0, riesgoMedio: 0, bajoRendimiento: 0, asistenciaCritica: 0 },
    };
  }

  const estudianteIds = estudiantes.map((e) => e.id);

  const [todasCalificaciones, todasAsistencias] = await Promise.all([
    db.calificacion.findMany({
      where: { estudianteId: { in: estudianteIds } },
      include: { materia: { select: { id: true, nombre: true, gradoId: true } } },
      orderBy: [{ materiaId: "asc" }, { trimestre: "asc" }],
    }),
    db.asistencia.findMany({
      where: {
        estudianteId: { in: estudianteIds },
        fecha: { gte: new Date(año, 0, 1), lte: new Date(año, 11, 31) },
      },
    }),
  ]);

  const calificacionesPorEstudiante = new Map<string, typeof todasCalificaciones>();
  for (const cal of todasCalificaciones) {
    if (!calificacionesPorEstudiante.has(cal.estudianteId)) {
      calificacionesPorEstudiante.set(cal.estudianteId, []);
    }
    calificacionesPorEstudiante.get(cal.estudianteId)!.push(cal);
  }

  const asistenciasPorEstudiante = new Map<string, typeof todasAsistencias>();
  for (const asis of todasAsistencias) {
    if (!asistenciasPorEstudiante.has(asis.estudianteId)) {
      asistenciasPorEstudiante.set(asis.estudianteId, []);
    }
    asistenciasPorEstudiante.get(asis.estudianteId)!.push(asis);
  }

  function calcularAsistencia(estId: string): AnalisisData["asistencia"] {
    const registros = asistenciasPorEstudiante.get(estId) || [];
    if (registros.length === 0) return null;
    const presentes = registros.filter((r) => r.estado === "presente").length;
    const tardanzas = registros.filter((r) => r.estado === "tarde").length;
    const ausentes = registros.filter((r) => r.estado === "ausente").length;
    const justificadas = registros.filter((r) => r.estado === "justificada").length;
    const total = registros.length;
    const asistenciaPct = ((presentes + tardanzas * ASISTENCIA_PESO_TARDANZA) / total) * 100;
    return {
      porcentaje: Math.round(asistenciaPct * 100) / 100,
      presentes,
      ausentes,
      tardanzas,
      justificadas,
      total,
    };
  }

  const resultados: EstudianteRiesgo[] = [];

  for (const est of estudiantes) {
    const data: AnalisisData = {
      estudiante: {
        id: est.id,
        nombre: est.nombre,
        gradoId: est.gradoId,
        grado: est.grado,
      },
      calificaciones: calificacionesPorEstudiante.get(est.id) || [],
      asistencia: calcularAsistencia(est.id),
    };
    const analisis = procesarEstudiante(data, umbrales);
    if (analisis) {
      resultados.push(analisis);
    }
  }

  resultados.sort((a, b) => b.puntajeRiesgo - a.puntajeRiesgo);

  return {
    estudiantesEnRiesgo: resultados,
    resumen: {
      totalAnalizados: estudiantes.length,
      riesgoAlto: resultados.filter((r) => r.tipo === "riesgo_alto").length,
      riesgoMedio: resultados.filter((r) => r.tipo === "riesgo_medio").length,
      bajoRendimiento: resultados.filter((r) => r.tipo === "bajo_rendimiento").length,
      asistenciaCritica: resultados.filter((r) => r.tipo === "asistencia_critica").length,
    },
  };
}

export async function analizarEstudiante(
  estudianteId: string,
  año: number,
  umbrales: Umbrales
): Promise<EstudianteRiesgo | null> {
  const estudiante = await db.estudiante.findUnique({
    where: { id: estudianteId },
    include: { grado: { select: { id: true, numero: true, seccion: true } } },
  });

  if (!estudiante || !estudiante.activo) return null;

  const calificaciones = await db.calificacion.findMany({
    where: { estudianteId },
    include: { materia: { select: { id: true, nombre: true, gradoId: true } } },
    orderBy: [{ materiaId: "asc" }, { trimestre: "asc" }],
  });

  const registros = await db.asistencia.findMany({
    where: { estudianteId, fecha: { gte: new Date(año, 0, 1), lte: new Date(año, 11, 31) } },
  });

  let asistencia: AnalisisData["asistencia"] = null;
  if (registros.length > 0) {
    const presentes = registros.filter((r) => r.estado === "presente").length;
    const tardanzas = registros.filter((r) => r.estado === "tarde").length;
    const ausentes = registros.filter((r) => r.estado === "ausente").length;
    const justificadas = registros.filter((r) => r.estado === "justificada").length;
    const total = registros.length;
    const asistenciaPct = ((presentes + tardanzas * ASISTENCIA_PESO_TARDANZA) / total) * 100;
    asistencia = {
      porcentaje: Math.round(asistenciaPct * 100) / 100,
      presentes,
      ausentes,
      tardanzas,
      justificadas,
      total,
    };
  }

  return procesarEstudiante(
    {
      estudiante: {
        id: estudiante.id,
        nombre: estudiante.nombre,
        gradoId: estudiante.gradoId,
        grado: estudiante.grado,
      },
      calificaciones,
      asistencia,
    },
    umbrales
  );
}
