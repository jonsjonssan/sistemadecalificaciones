"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
// import { Eye, EyeOff } from "lucide-react";

interface SystemThresholdsCardProps {
  darkMode: boolean;
  umbrales: {
    umbralRecuperacion: number;
    umbralCondicionado: number;
    umbralAprobado: number;
    maxHistorialCelda: number;
    usarIntervaloReprobado: boolean;
    usarIntervaloCondicionado: boolean;
    usarIntervaloAprobado: boolean;
  };
  setUmbrales: React.Dispatch<React.SetStateAction<{
    umbralRecuperacion: number;
    umbralCondicionado: number;
    umbralAprobado: number;
    maxHistorialCelda: number;
    usarIntervaloReprobado: boolean;
    usarIntervaloCondicionado: boolean;
    usarIntervaloAprobado: boolean;
  }>>;
  onSave: () => void;
  onReset: () => void;
  loading: boolean;
}

export function SystemThresholdsCard({
  darkMode,
  umbrales,
  setUmbrales,
  onSave,
  onReset,
  loading,
}: SystemThresholdsCardProps) {
  const uc = umbrales.umbralCondicionado;
  const ua = umbrales.umbralAprobado;

  // Proporciones visuales basadas en escala 0–10
  const redWidth = Math.max(0, Math.min(100, (uc / 10) * 100));
  const yellowWidth = Math.max(0, Math.min(100, ((ua - uc) / 10) * 100));
  const greenWidth = Math.max(0, Math.min(100, ((10 - ua) / 10) * 100));

  const textMuted = darkMode ? "text-slate-500" : "text-slate-400";
  const inputBase = `text-center border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-b-2 transition-colors ${darkMode ? "bg-transparent border-slate-600 text-white focus-visible:border-slate-400" : "bg-transparent border-slate-300 text-slate-900 focus-visible:border-slate-500"}`;

  return (
    <Card className={`shadow-sm ${darkMode ? "bg-[#1e293b] border-slate-700" : ""}`}>
      <CardHeader className={`py-3 px-4 ${darkMode ? "border-slate-700" : ""}`}>
        <CardTitle className="text-sm sm:text-base">Umbrales del Sistema</CardTitle>
        <CardDescription className={`text-xs ${darkMode ? "text-slate-400" : ""}`}>
          Establezca los intervalos de calificaciones y el límite de historial
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        {/* ===== BARRA VISUAL ===== */}
        <div className="space-y-1.5">
          {/* Etiquetas */}
          <div className="flex">
            <div className="flex-1 flex items-center gap-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>REPROBADO</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>CONDICIONADO</span>
            </div>
            <div className="flex-1 flex items-center justify-end gap-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>APROBADO</span>
            </div>
          </div>

          {/* Barra coloreada proporcional */}
          <div className="flex h-1.5 rounded-full overflow-hidden">
            <div style={{ width: `${redWidth}%` }} className={umbrales.usarIntervaloReprobado ? "bg-[#f43f5e]" : "bg-slate-300 dark:bg-slate-700"} />
            <div style={{ width: `${yellowWidth}%` }} className={umbrales.usarIntervaloCondicionado ? "bg-[#f59e0b]" : "bg-slate-300 dark:bg-slate-700"} />
            <div style={{ width: `${greenWidth}%` }} className={umbrales.usarIntervaloAprobado ? "bg-[#10b981]" : "bg-slate-300 dark:bg-slate-700"} />
          </div>

          {/* Expresiones matemáticas */}
          <div className="flex text-xs font-mono">
            <div className="flex-1 text-left">
              {umbrales.usarIntervaloReprobado ? (
                <span className="text-[#f43f5e]">0 ≤ x &lt; {uc.toFixed(2)}</span>
              ) : (
                <span className={textMuted}>—</span>
              )}
            </div>
            <div className="flex-1 text-center">
              {umbrales.usarIntervaloCondicionado ? (
                <span className="text-[#f59e0b]">{uc.toFixed(2)} ≤ x &lt; {ua.toFixed(2)}</span>
              ) : (
                <span className={textMuted}>—</span>
              )}
            </div>
            <div className="flex-1 text-right">
              {umbrales.usarIntervaloAprobado ? (
                <span className="text-[#10b981]">x ≥ {ua.toFixed(2)}</span>
              ) : (
                <span className={textMuted}>—</span>
              )}
            </div>
          </div>
        </div>

        {/* ===== ENTRADAS ===== */}
        <div className="grid grid-cols-3 gap-4">
          {/* FIN REPROBADO */}
          <div className={`text-center space-y-2 ${!umbrales.usarIntervaloReprobado ? "opacity-40" : ""}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>FIN REPROBADO</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>&lt;</span>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={10}
                value={uc}
                onChange={(e) => setUmbrales((prev) => ({ ...prev, umbralCondicionado: parseFloat(e.target.value) || 0 }))}
                disabled={!umbrales.usarIntervaloReprobado}
                className={`w-16 text-lg font-medium ${inputBase}`}
              />
            </div>
            <div className="flex justify-center">
              <div className={`w-2 h-2 rounded-full ${umbrales.usarIntervaloReprobado ? "bg-[#f43f5e]" : "bg-slate-300 dark:bg-slate-600"}`} />
            </div>
          </div>

          {/* RANGO CONDICIONADO */}
          <div className={`text-center space-y-2 ${!umbrales.usarIntervaloCondicionado ? "opacity-40" : ""}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>RANGO CONDICIONADO</div>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-sm font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{uc.toFixed(2)}</span>
              <span className={`text-sm ${darkMode ? "text-slate-600" : "text-slate-300"}`}>—</span>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={10}
                value={ua}
                onChange={(e) => setUmbrales((prev) => ({ ...prev, umbralAprobado: parseFloat(e.target.value) || 0 }))}
                disabled={!umbrales.usarIntervaloCondicionado}
                className={`w-16 text-lg font-medium ${inputBase}`}
              />
            </div>
            <div className="flex justify-center">
              <div className={`w-2 h-2 rounded-full ${umbrales.usarIntervaloCondicionado ? "bg-[#f59e0b]" : "bg-slate-300 dark:bg-slate-600"}`} />
            </div>
          </div>

          {/* INICIO APROBADO */}
          <div className={`text-center space-y-2 ${!umbrales.usarIntervaloAprobado ? "opacity-40" : ""}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>INICIO APROBADO</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>≥</span>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={10}
                value={ua}
                onChange={(e) => setUmbrales((prev) => ({ ...prev, umbralAprobado: parseFloat(e.target.value) || 0 }))}
                disabled={!umbrales.usarIntervaloAprobado}
                className={`w-16 text-lg font-medium ${inputBase}`}
              />
            </div>
            <div className="flex justify-center">
              <div className={`w-2 h-2 rounded-full ${umbrales.usarIntervaloAprobado ? "bg-[#10b981]" : "bg-slate-300 dark:bg-slate-600"}`} />
            </div>
          </div>
        </div>

        {/* ===== HISTORIAL ===== */}
        <div className={`rounded-xl border p-3 ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                Límite Historial por Celda
              </Label>
              <p className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-500"}`}>
                Máximo de registros de cambios guardados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step={1}
                min={1}
                max={50}
                value={umbrales.maxHistorialCelda}
                onChange={(e) => setUmbrales((prev) => ({ ...prev, maxHistorialCelda: parseInt(e.target.value) || 1 }))}
                className={`h-8 w-20 text-sm text-center font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"}`}
              />
              <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-500"}`}>registros</span>
            </div>
          </div>
        </div>

        {/* ===== ACCIONES ===== */}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={onSave} disabled={loading} className="bg-teal-600 hover:bg-teal-700">
            {loading ? "Guardando..." : "Guardar Umbrales"}
          </Button>
          <Button size="sm" variant="outline" onClick={onReset}>
            Restablecer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
