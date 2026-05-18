export interface CicloAsignaturas {
  nombre: string;
  grados: number[];
  color: string;
  colorBg: string;
  colorBorder: string;
  iconColor: string;
  ringColor: string;
}

export const CICLOS: CicloAsignaturas[] = [
  {
    nombre: "Primer Ciclo",
    grados: [2, 3],
    color: "text-emerald-600 dark:text-emerald-400",
    colorBg: "bg-emerald-50 dark:bg-emerald-900/20",
    colorBorder: "border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    ringColor: "oklch(0.56 0.15 155)",
  },
  {
    nombre: "Segundo Ciclo",
    grados: [4, 5, 6],
    color: "text-amber-600 dark:text-amber-400",
    colorBg: "bg-amber-50 dark:bg-amber-900/20",
    colorBorder: "border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-500 dark:text-amber-400",
    ringColor: "oklch(0.65 0.12 85)",
  },
  {
    nombre: "Tercer Ciclo",
    grados: [7, 8, 9],
    color: "text-primary dark:text-primary",
    colorBg: "bg-primary/5 dark:bg-primary/10",
    colorBorder: "border-primary/20 dark:border-primary/30",
    iconColor: "text-primary dark:text-primary",
    ringColor: "oklch(0.28 0.055 160)",
  },
];

export function getCicloDark(ciclo: CicloAsignaturas) {
  const map: Record<string, { bg: string; border: string; icon: string }> = {
    "Primer Ciclo": { bg: "bg-emerald-900/20", border: "border-emerald-800", icon: "text-emerald-400" },
    "Segundo Ciclo": { bg: "bg-amber-900/20", border: "border-amber-800", icon: "text-amber-400" },
    "Tercer Ciclo": { bg: "bg-primary/10", border: "border-primary/30", icon: "text-primary" },
  };
  return map[ciclo.nombre] || { bg: "bg-slate-800", border: "border-slate-700", icon: "text-slate-400" };
}
