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
    color: "text-primary",
    colorBg: "bg-primary/5 dark:bg-primary/10",
    colorBorder: "border-primary/20 dark:border-primary/25",
    iconColor: "text-primary",
    ringColor: "oklch(0.45 0.09 155)",
  },
  {
    nombre: "Segundo Ciclo",
    grados: [4, 5, 6],
    color: "text-secondary-foreground",
    colorBg: "bg-secondary dark:bg-secondary",
    colorBorder: "border-border dark:border-border",
    iconColor: "text-muted-foreground",
    ringColor: "oklch(0.55 0.07 155)",
  },
  {
    nombre: "Tercer Ciclo",
    grados: [7, 8, 9],
    color: "text-foreground/70",
    colorBg: "bg-muted dark:bg-muted",
    colorBorder: "border-border dark:border-border",
    iconColor: "text-muted-foreground",
    ringColor: "oklch(0.35 0.07 155)",
  },
];

export function getCicloDark(ciclo: CicloAsignaturas) {
  const map: Record<string, { bg: string; border: string; icon: string }> = {
    "Primer Ciclo": { bg: "bg-primary/10", border: "border-primary/25", icon: "text-primary" },
    "Segundo Ciclo": { bg: "bg-secondary", border: "border-border", icon: "text-muted-foreground" },
    "Tercer Ciclo": { bg: "bg-muted", border: "border-border", icon: "text-muted-foreground" },
  };
  return map[ciclo.nombre] || { bg: "bg-muted", border: "border-border", icon: "text-muted-foreground" };
}
