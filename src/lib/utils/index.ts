import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ESTANDARES_PORCENTAJES, NOTA_MINIMA_APROBATORIA } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-SV", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-SV", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function calcularPromedio(notas: number[]): number | null {
  if (!notas || notas.length === 0) return null;
  const suma = notas.reduce((acc, nota) => acc + nota, 0);
  return Math.round((suma / notas.length) * 100) / 100;
}

export function calcularPromedioFinal(
  promedioAC: number | null,
  promedioAI: number | null,
  examen: number | null
): number | null {
  if (promedioAC === null || promedioAI === null || examen === null) {
    return null;
  }

  const porcentajeAC = ESTANDARES_PORCENTAJES.ACTIVIDADES_COTIDIANAS / 100;
  const porcentajeAI = ESTANDARES_PORCENTAJES.ACTIVIDADES_INTEGRADORAS / 100;
  const porcentajeExamen = ESTANDARES_PORCENTAJES.EXAMEN / 100;

  const promedio =
    (promedioAC * porcentajeAC) +
    (promedioAI * porcentajeAI) +
    (examen * porcentajeExamen);

  return Math.round(promedio * 100) / 100;
}

export function estaAprobado(promedio: number | null): boolean {
  if (promedio === null) return false;
  return Math.round(promedio) >= NOTA_MINIMA_APROBATORIA;
}

export function getColorPromedio(promedio: number | null): string {
  if (promedio === null) return "text-muted-foreground";
  if (Math.round(promedio) >= 9) return "text-primary";
  if (Math.round(promedio) >= 7) return "text-foreground/80";
  if (Math.round(promedio) >= 5) return "text-muted-foreground";
  return "text-destructive";
}

export function getColorAsistencia(estado: string): string {
  switch (estado) {
    case "presente":
      return "bg-status-success-muted text-status-success";
    case "ausente":
      return "bg-status-error-muted text-status-error";
    case "justificada":
      return "bg-muted text-muted-foreground";
    case "tarde":
      return "bg-status-warning-muted text-status-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function generarNumeroLista(estudiantes: { numero: number }[]): number {
  if (estudiantes.length === 0) return 1;
  const maxNumero = Math.max(...estudiantes.map(e => e.numero));
  return maxNumero + 1;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
