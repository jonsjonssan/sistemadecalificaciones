import { db } from "@/lib/db";

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

async function getUmbrales(): Promise<Umbrales> {
  const config = await db.configuracionSistema.findFirst();
  return {
    umbralAprobado: config?.umbralAprobado ?? 6.5,
    umbralCondicionado: config?.umbralCondicionado ?? 4.5,
    umbralRecuperacion: config?.umbralRecuperacion ?? 5.0,
  };
}

async function getCalificacionesEstudiante(estudianteId: string) {
  return db.calificacion.findMany({
    where: { estudianteId },
    include: {
      materia: { select: { id: true, nombre: true, gradoId: true } },
    },
    orderBy: [{ materiaId: "asc" }, { trimestre: "asc" }],
  });
}

async function getAsistenciaEstudiante(estudianteId: string, año: number) {
  const inicioAño = new Date(año, 0, 1);
  const finAño = new Date(año, 11, 31);

  const registros = await db.asistencia.findMany({
    where: {
      estudianteId,
      fecha: { gte: inicioAño, lte: finAño },
    },
  });

  if (registros.length === 0) return null;

  const presentes = registros.filter((r) => r.estado === "presente").length;
  const tardanzas = registros.filter((r) => r.estado === "tarde").length;
  const ausentes = registros.filter((r) => r.estado === "ausente").length;
  const justificadas = registros.filter((r) => r.estado === "justificada").length;

  const total = registros.length;
  const asistenciaPct = ((presentes + tardanzas * 0.5) / total) * 100;

  return {
    porcentaje: Math.round(asistenciaPct * 100) / 100,
    presentes,
    ausentes,
    tardanzas,
    justificadas,
    total,
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

function generarRecomendacion(tipo: string, factores: string[], gradoNumero: number): string {
  const recomendaciones: Record<string, string> = {
    riesgo_alto: `Estudiante en riesgo crítico de reprobación. Se recomienda: (1) Citación inmediata a padres/tutores, (2) Plan de refuerzo académico personalizado, (3) Seguimiento semanal de avances, (4) Evaluación psicopedagógica si persiste el bajo rendimiento.`,
    riesgo_medio: `Estudiante con tendencia negativa. Se recomienda: (1) Comunicación con padres para informar situación, (2) Refuerzo en materias débiles, (3) Monitoreo quincenal de calificaciones, (4) Estrategias de motivación y acompañamiento.`,
    bajo_rendimiento: `Estudiante por debajo del umbral aprobado. Se recomienda: (1) Identificar causas del bajo rendimiento (académicas, personales, familiares), (2) Ofrecer actividades de recuperación, (3) Tutoría entre pares o apoyo docente adicional.`,
    asistencia_critica: `Asistencia por debajo del 70%. El ausentismo impacta directamente el rendimiento. Se recomienda: (1) Contactar a la familia para conocer causas, (2) Establecer compromiso de asistencia, (3) Considerar factores externos (salud, transporte, situación familiar), (4) Reportar a orientación escolar si es necesario.`,
  };

  return recomendaciones[tipo] || "Se recomienda seguimiento y evaluación del caso.";
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

  const calificaciones = await getCalificacionesEstudiante(estudianteId);
  const asistencia = await getAsistenciaEstudiante(estudianteId, año);

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

  for (const [materiaId, data] of materiasMap) {
    const promMateria = data.promedios.reduce((a, b) => a + b, 0) / data.promedios.length;
    if (promMateria < umbrales.umbralAprobado) {
      materiasDebiles.push({ materiaId, nombre: data.nombre, promedio: Math.round(promMateria * 100) / 100 });
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

  if (tendencia < -0.5) {
    puntajeRiesgo += 0.2;
    factores.push(`Tendencia negativa sostenida (${tendencia.toFixed(2)} por trimestre)`);
  } else if (tendencia < -0.2) {
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

  if (asistencia && asistencia.porcentaje < 70) {
    puntajeRiesgo += 0.3;
    factores.push(`Asistencia crítica (${asistencia.porcentaje.toFixed(1)}%)`);
  } else if (asistencia && asistencia.porcentaje < 80) {
    puntajeRiesgo += 0.15;
    factores.push(`Asistencia baja (${asistencia.porcentaje.toFixed(1)}%)`);
  }

  puntajeRiesgo = Math.min(1, puntajeRiesgo);

  let tipo: EstudianteRiesgo["tipo"];
  if (puntajeRiesgo >= 0.6) {
    tipo = "riesgo_alto";
  } else if (puntajeRiesgo >= 0.4) {
    tipo = "riesgo_medio";
  } else if (asistencia && asistencia.porcentaje < 70) {
    tipo = "asistencia_critica";
  } else {
    tipo = "bajo_rendimiento";
  }

  if (puntajeRiesgo < 0.3 && (!asistencia || asistencia.porcentaje >= 80)) {
    return null;
  }

  const recomendacion = generarRecomendacion(tipo, factores, estudiante.grado.numero);

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
  gradoId?: string
): Promise<ResultadoAnalisis> {
  const umbrales = await getUmbrales();

  const estudiantes = await db.estudiante.findMany({
    where: {
      activo: true,
      ...(gradoId ? { gradoId } : {}),
    },
    include: { grado: { select: { id: true, numero: true, seccion: true } } },
  });

  estudiantes.sort((a, b) => {
    if (a.grado.numero !== b.grado.numero) return a.grado.numero - b.grado.numero;
    return a.numero - b.numero;
  });

  const resultados: EstudianteRiesgo[] = [];

  for (const est of estudiantes) {
    const analisis = await analizarEstudiante(est.id, año, umbrales);
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
