import type { ConfigActividadPartial } from "@/types";

/**
 * Calcula el promedio de un array de notas, ignorando valores nulos.
 */
export const calcularPromedio = (notas: (number | null)[]): number | null => {
  const validas = notas.filter((n) => n !== null && !isNaN(n!)) as number[];
  return validas.length
    ? validas.reduce((a, b) => a + b, 0) / validas.length
    : null;
};

/**
 * Calcula el promedio final ponderado basado en configuración de actividad.
 * Incluye soporte para recuperación.
 */
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
  let base =
    (ac ?? 0) * (pctAC / 100) +
    (ai ?? 0) * (pctAI / 100) +
    (et ?? 0) * (pctEx / 100);
  if (recup !== null) base = Math.min(10, base + recup);
  return base;
};

/**
 * Parsea un JSON string de notas a un array con longitud fija.
 * Rellena con null si hay menos notas que el count especificado.
 */
export const parseNotas = (
  json: string | null,
  count: number
): (number | null)[] => {
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
