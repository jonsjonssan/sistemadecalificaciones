import { Calificacion, ConfigActividadPartial } from "@/types";

export type EstadoCompletitud = 'completo' | 'parcial' | 'vacio';

export const getEstadoCompletitud = (
  calificacion: Calificacion | undefined,
  config: ConfigActividadPartial | null
): EstadoCompletitud => {
  if (!calificacion || !config) return 'vacio';

  const acNotas = parseNotas(calificacion.actividadesCotidianas ?? null, config.numActividadesCotidianas);
  const aiNotas = parseNotas(calificacion.actividadesIntegradoras ?? null, config.numActividadesIntegradoras);

  const totalFields = config.numActividadesCotidianas + config.numActividadesIntegradoras + (config.tieneExamen ? 1 : 0);
  const filledFields =
    acNotas.filter(n => n !== null).length +
    aiNotas.filter(n => n !== null).length +
    (config.tieneExamen && calificacion.examenTrimestral !== null ? 1 : 0);

  if (filledFields === 0) return 'vacio';
  if (filledFields >= totalFields) return 'completo';
  return 'parcial';
};

export const contarEstados = (
  estudiantes: Array<{ id: string }>,
  calificaciones: Calificacion[],
  materiaId: string,
  trimestre: number,
  config: ConfigActividadPartial | null
): { completo: number; parcial: number; vacio: number; total: number } => {
  const result = { completo: 0, parcial: 0, vacio: 0, total: estudiantes.length };
  for (const est of estudiantes) {
    const calif = calificaciones.find(c => c.estudianteId === est.id && c.materiaId === materiaId && c.trimestre === trimestre);
    result[getEstadoCompletitud(calif, config)]++;
  }
  return result;
};

export const calcularPromedio = (notas: (number | null)[]): number | null => {
  const validas = notas.filter((n) => n !== null && !isNaN(n!)) as number[];
  return validas.length ? validas.reduce((a, b) => a + b, 0) / validas.length : null;
};

export const calcularPromedioFinal = (
  ac: number | null,
  ai: number | null,
  et: number | null,
  cfg: ConfigActividadPartial,
  recup: number | null = null
): number | null => {
  if (ac === null && ai === null && et === null) return null;
  const pctAC = cfg.porcentajeAC ?? 35;
  const pctAI = cfg.porcentajeAI ?? 35;
  const pctEx = cfg.porcentajeExamen ?? 30;
  let base = ((ac ?? 0) * pctAC) / 100 + ((ai ?? 0) * pctAI) / 100 + ((et ?? 0) * pctEx) / 100;
  if (recup !== null) base = Math.min(10, Math.max(base, recup));
  return base;
};

export const parseNotas = (json: string | null, count: number): (number | null)[] => {
  if (!json) return Array(count).fill(null);
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr)
      ? [
          ...arr.map((n: number) => (!isNaN(n) ? n : null)),
          ...Array(Math.max(0, count - arr.length)).fill(null),
        ].slice(0, count)
      : Array(count).fill(null);
  } catch {
    return Array(count).fill(null);
  }
};
