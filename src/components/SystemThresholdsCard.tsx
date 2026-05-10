"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertTriangle, Minus, Check } from "lucide-react";

interface SystemThresholdsCardProps {
  darkMode: boolean;
  umbrales: {
    umbralRecuperacion: number;
    umbralCondicionado: number;
    umbralAprobado: number;
    maxHistorialCelda: number;
  };
  setUmbrales: React.Dispatch<React.SetStateAction<{
    umbralRecuperacion: number;
    umbralCondicionado: number;
    umbralAprobado: number;
    maxHistorialCelda: number;
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

  return (
    <Card className={`shadow-sm ${darkMode ? "bg-[#1e293b] border-slate-700" : ""}`}>
      <CardHeader className={`py-3 px-4 ${darkMode ? "border-slate-700" : ""}`}>
        <CardTitle className="text-sm sm:text-base">Umbrales del Sistema</CardTitle>
        <CardDescription className={`text-xs ${darkMode ? "text-slate-400" : ""}`}>
          Establezca los intervalos de calificaciones y el límite de historial
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* ===== BARRA VISUAL DE INTERVALOS (previsualizacion) ===== */}
        <div className="space-y-2">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            Intervalos Activos
          </p>
          <div className="flex rounded-xl overflow-hidden border h-12 text-[11px] font-bold">
            {/* Rojo - Reprobado */}
            <div
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${darkMode ? "bg-red-900/50 text-red-200 border-r border-red-800/50" : "bg-red-100 text-red-800 border-r border-red-200"}`}
              title={`0 ≤ x < ${uc.toFixed(2)} Reprobado`}
            >
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Reprobado</span>
              </div>
              <span className="opacity-80 font-mono text-[10px]">0 ≤ x &lt; {uc.toFixed(2)}</span>
            </div>
            {/* Ámbar - Condicionado */}
            <div
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${darkMode ? "bg-amber-900/50 text-amber-200 border-r border-amber-800/50" : "bg-amber-100 text-amber-800 border-r border-amber-200"}`}
              title={`${uc.toFixed(2)} ≤ x < ${ua.toFixed(2)} Condicionado`}
            >
              <div className="flex items-center gap-1">
                <Minus className="h-3 w-3" />
                <span>Condicionado</span>
              </div>
              <span className="opacity-80 font-mono text-[10px]">{uc.toFixed(2)} ≤ x &lt; {ua.toFixed(2)}</span>
            </div>
            {/* Verde - Aprobado */}
            <div
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${darkMode ? "bg-emerald-900/50 text-emerald-200" : "bg-emerald-100 text-emerald-800"}`}
              title={`x ≥ ${ua.toFixed(2)} Aprobado`}
            >
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span>Aprobado</span>
              </div>
              <span className="opacity-80 font-mono text-[10px]">x ≥ {ua.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ===== TRES TARJETAS EDITABLES ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Reprobado */}
          <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? "bg-red-950/20 border-red-900/40" : "bg-red-50/70 border-red-200"}`}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? "text-red-300" : "text-red-800"}`}>Reprobado</span>
            </div>
            <div className="space-y-1">
              <p className={`text-[10px] ${darkMode ? "text-red-400/70" : "text-red-700/70"}`}>
                Nota máxima del rango reprobado
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-mono ${darkMode ? "text-slate-500" : "text-slate-500"}`}>0 ≤ x &lt;</span>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  value={uc}
                  onChange={(e) => setUmbrales((prev) => ({ ...prev, umbralCondicionado: parseFloat(e.target.value) || 0 }))}
                  className={`h-9 text-sm text-center font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"}`}
                />
              </div>
            </div>
          </div>

          {/* Condicionado */}
          <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? "bg-amber-950/20 border-amber-900/40" : "bg-amber-50/70 border-amber-200"}`}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? "text-amber-300" : "text-amber-800"}`}>Condicionado</span>
            </div>
            <div className="space-y-1">
              <p className={`text-[10px] ${darkMode ? "text-amber-400/70" : "text-amber-700/70"}`}>
                Nota máxima del rango condicionado
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-mono ${darkMode ? "text-slate-500" : "text-slate-500"}`}>{uc.toFixed(2)} ≤ x &lt;</span>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  value={ua}
                  onChange={(e) => setUmbrales((prev) => ({ ...prev, umbralAprobado: parseFloat(e.target.value) || 0 }))}
                  className={`h-9 text-sm text-center font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"}`}
                />
              </div>
            </div>
          </div>

          {/* Aprobado */}
          <div className={`rounded-xl border p-4 space-y-3 ${darkMode ? "bg-emerald-950/20 border-emerald-900/40" : "bg-emerald-50/70 border-emerald-200"}`}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? "text-emerald-300" : "text-emerald-800"}`}>Aprobado</span>
            </div>
            <div className="space-y-1">
              <p className={`text-[10px] ${darkMode ? "text-emerald-400/70" : "text-emerald-700/70"}`}>
                Nota mínima para aprobado
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-mono ${darkMode ? "text-slate-500" : "text-slate-500"}`}>x ≥</span>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  value={ua}
                  onChange={(e) => setUmbrales((prev) => ({ ...prev, umbralAprobado: parseFloat(e.target.value) || 0 }))}
                  className={`h-9 text-sm text-center font-bold ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"}`}
                />
              </div>
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
