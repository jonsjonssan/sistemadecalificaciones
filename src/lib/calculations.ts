import {
  NOTA_MAXIMA,
  PORCENTAJE_DEFAULT_AC,
  PORCENTAJE_DEFAULT_AI,
  PORCENTAJE_DEFAULT_EXAMEN,
  TOLERANCIA_PORCENTAJE,
  UMBRAL_APROBADO_DEFAULT,
  UMBRAL_CONDICIONADO_DEFAULT,
} from "@/lib/constants";
import type { ConfigActividadPartial } from "@/types";

export type EstadoEscala = "REPROBADO" | "CONDICIONADO" | "APROBADO";

export interface UmbralesEscala {
  condicionado: number;
  aprobado: number;
}

export interface PesosConfig {
  porcentajeAC: number;
  porcentajeAI: number;
  porcentajeExamen: number;
  tieneExamen: boolean;
}

export const DEFAULT_PESOS: PesosConfig = {
  porcentajeAC: PORCENTAJE_DEFAULT_AC,
  porcentajeAI: PORCENTAJE_DEFAULT_AI,
  porcentajeExamen: PORCENTAJE_DEFAULT_EXAMEN,
  tieneExamen: true,
};

export function pesosFromConfig(cfg: Partial<PesosConfig> | null | undefined): PesosConfig {
  if (!cfg) return DEFAULT_PESOS;
  return {
    porcentajeAC: cfg.porcentajeAC ?? PORCENTAJE_DEFAULT_AC,
    porcentajeAI: cfg.porcentajeAI ?? PORCENTAJE_DEFAULT_AI,
    porcentajeExamen: cfg.porcentajeExamen ?? PORCENTAJE_DEFAULT_EXAMEN,
    tieneExamen: cfg.tieneExamen ?? true,
  };
}

export function calcularPromedio(notas: (number | null)[]): number | null {
  const validas = notas.filter((n): n is number => n !== null && !isNaN(n));
  return validas.length > 0 ? validas.reduce((a, b) => a + b, 0) / validas.length : null;
}

export function calcularPromedioFinal(
  ac: number | null,
  ai: number | null,
  examen: number | null,
  pesos: PesosConfig,
  recuperacion: number | null = null
): number | null {
  if (ac === null && ai === null && examen === null) return null;
  const pAC = pesos.porcentajeAC / 100;
  const pAI = pesos.porcentajeAI / 100;
  const pEx = pesos.tieneExamen ? pesos.porcentajeExamen / 100 : 0;
  const base = (ac ?? 0) * pAC + (ai ?? 0) * pAI + (examen ?? 0) * pEx;
  if (recuperacion !== null && recuperacion !== undefined) {
    return Math.min(NOTA_MAXIMA, base + recuperacion);
  }
  return base;
}

export function calcularPromedioFinalFromConfig(
  ac: number | null,
  ai: number | null,
  examen: number | null,
  cfg: ConfigActividadPartial | null | undefined,
  recuperacion: number | null = null
): number | null {
  const pesos = cfg ? pesosFromConfig(cfg) : DEFAULT_PESOS;
  return calcularPromedioFinal(ac, ai, examen, pesos, recuperacion);
}

export function calcularPromedioAnualMateria(
  promediosTrimestrales: (number | null)[],
  recuperacionAnual: number | null = null
): number | null {
  const validos = promediosTrimestrales.filter((p): p is number => p !== null);
  if (validos.length === 0) return null;
  const promedio = validos.reduce((a, b) => a + b, 0) / validos.length;
  if (recuperacionAnual !== null && recuperacionAnual !== undefined) {
    return Math.min(NOTA_MAXIMA, promedio + recuperacionAnual);
  }
  return promedio;
}

export function calcularPromedioGeneral(promedios: (number | null)[]): number | null {
  const validos = promedios.filter((p): p is number => p !== null);
  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

export function clasificarEscala(
  promedio: number,
  umbrales: UmbralesEscala = {
    condicionado: UMBRAL_CONDICIONADO_DEFAULT,
    aprobado: UMBRAL_APROBADO_DEFAULT,
  }
): EstadoEscala {
  if (promedio < umbrales.condicionado) return "REPROBADO";
  if (promedio < umbrales.aprobado) return "CONDICIONADO";
  return "APROBADO";
}

export function estaAprobado(
  promedio: number | null,
  umbral: number = UMBRAL_APROBADO_DEFAULT
): boolean {
  if (promedio === null) return false;
  return Math.round(promedio) >= umbral;
}

export interface ResultadoValidacionPorcentajes {
  valido: boolean;
  total: number;
  error?: string;
}

export function validarPorcentajes(
  porcAC: number,
  porcAI: number,
  porcExamen: number,
  tieneExamen: boolean
): ResultadoValidacionPorcentajes {
  const total = porcAC + porcAI + (tieneExamen ? porcExamen : 0);
  const desviacion = Math.abs(total - 100);
  if (desviacion > TOLERANCIA_PORCENTAJE) {
    const examenStr = tieneExamen ? `${porcExamen}%` : "0% (sin examen)";
    return {
      valido: false,
      total,
      error: `Los porcentajes deben sumar 100%. Actual: AC=${porcAC}% + AI=${porcAI}% + Examen=${examenStr} = ${total}%`,
    };
  }
  return { valido: true, total };
}

export function redondear2Decimales(valor: number): number {
  return Math.round(valor * 100) / 100;
}
