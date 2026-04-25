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
  return promedio >= NOTA_MINIMA_APROBATORIA;
}

export function getColorPromedio(promedio: number | null): string {
  if (promedio === null) return "text-muted-foreground";
  if (promedio >= 9) return "text-green-600";
  if (promedio >= 7) return "text-blue-600";
  if (promedio >= 5) return "text-yellow-600";
  return "text-red-600";
}

export function getColorAsistencia(estado: string): string {
  switch (estado) {
    case "presente":
      return "bg-green-100 text-green-800";
    case "ausente":
      return "bg-red-100 text-red-800";
    case "justificada":
      return "bg-blue-100 text-blue-800";
    case "tarde":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
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
