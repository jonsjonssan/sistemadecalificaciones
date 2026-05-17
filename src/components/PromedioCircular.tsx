"use client";

import { memo } from "react";

interface PromedioCircularProps {
  valor: number | null;
  darkMode: boolean;
}

export const PromedioCircular = memo(function PromedioCircular({ valor, darkMode }: PromedioCircularProps) {
  const radius = 54;
  const stroke = 8;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = valor != null ? circumference - (valor / 10) * circumference : circumference;
  const tealColor = darkMode ? "oklch(0.65 0.12 155)" : "oklch(0.44 0.13 155)";
  const redColor = darkMode ? "oklch(0.58 0.22 28)" : "oklch(0.52 0.20 28)";
  const color = valor != null && Math.round(valor) >= 5 ? tealColor : redColor;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={radius * 2} height={radius * 2} className="-rotate-90">
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={darkMode ? "oklch(0.20 0 0)" : "oklch(0.90 0 0)"}
            strokeWidth={stroke}
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={valor != null ? color : "transparent"}
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {valor != null ? valor.toFixed(2) : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground">de 10</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className={`text-xs font-medium ${valor != null && Math.round(valor) >= 5 ? 'text-emerald-500' : valor != null ? 'text-red-500' : ''}`}>
          {valor != null && Math.round(valor) >= 5 ? '✓ Aprobado' : valor != null ? '⚠ En riesgo' : 'Sin datos'}
        </span>
      </div>
    </div>
  );
});
