"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

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
  return (
    <Card className={`shadow-sm ${darkMode ? "bg-[#1e293b] border-slate-700" : ""}`}>
      <CardHeader className={`py-3 px-4 ${darkMode ? "border-slate-700" : ""}`}>
        <CardTitle className="text-sm sm:text-base">Umbrales del Sistema</CardTitle>
        <CardDescription className={`text-xs ${darkMode ? "text-slate-400" : ""}`}>
          Configure los intervalos de calificación y el historial por celda
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Visual bar de intervalos */}
        <div className="space-y-2">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            Intervalos Activos
          </p>
          <div className="flex rounded-xl overflow-hidden border h-10 text-xs font-bold">
            <div
              className={`flex-1 flex items-center justify-center gap-1 ${darkMode ? "bg-red-900/50 text-red-200 border-r border-red-800" : "bg-red-100 text-red-800 border-r border-red-200"}`}
            >
              <span>0</span>
              <span>&le;</span>
              <span>{umbrales.umbralCondicionado.toFixed(2)}</span>
              <span className="ml-1 opacity-80">Reprobado</span>
            </div>
            <div
              className={`flex-1 flex items-center justify-center gap-1 ${darkMode ? "bg-amber-900/50 text-amber-200 border-r border-amber-800" : "bg-amber-100 text-amber-800 border-r border-amber-200"}`}
            >
              <span>{umbrales.umbralCondicionado.toFixed(2)}</span>
              <span>&lt;</span>
              <span>{umbrales.umbralAprobado.toFixed(2)}</span>
              <span className="ml-1 opacity-80">Condicionado</span>
            </div>
            <div
              className={`flex-1 flex items-center justify-center gap-1 ${darkMode ? "bg-emerald-900/50 text-emerald-200" : "bg-emerald-100 text-emerald-800"}`}
            >
              <span>&ge;</span>
              <span>{umbrales.umbralAprobado.toFixed(2)}</span>
              <span className="ml-1 opacity-80">Aprobado</span>
            </div>
          </div>
        </div>

        {/* Inputs con etiquetas de color */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Reprobado */}
          <div className={`p-3 rounded-xl border ${darkMode ? "bg-red-900/10 border-red-800/40" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <Label className={`text-xs font-bold ${darkMode ? "text-red-300" : "text-red-800"}`}>Reprobado</Label>
            </div>
            <p className={`text-[10px] mb-1.5 ${darkMode ? "text-red-400/70" : "text-red-700/70"}`}>
              Límite superior del rango reprobado
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>0 &le;</span>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={umbrales.umbralCondicionado}
                onChange={(e) =>
                  setUmbrales((prev) => ({ ...prev, umbralCondicionado: parseFloat(e.target.value) || 0 }))
                }
                className={`h-8 text-sm text-center font-bold ${darkMode ? "bg-slate-900 border-slate-600 text-white" : ""}`}
              />
            </div>
          </div>

          {/* Condicionado */}
          <div className={`p-3 rounded-xl border ${darkMode ? "bg-amber-900/10 border-amber-800/40" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <Label className={`text-xs font-bold ${darkMode ? "text-amber-300" : "text-amber-800"}`}>Condicionado</Label>
            </div>
            <p className={`text-[10px] mb-1.5 ${darkMode ? "text-amber-400/70" : "text-amber-700/70"}`}>
              Límite superior del rango condicionado
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {umbrales.umbralCondicionado.toFixed(2)} &lt;
              </span>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={umbrales.umbralAprobado}
                onChange={(e) =>
                  setUmbrales((prev) => ({ ...prev, umbralAprobado: parseFloat(e.target.value) || 0 }))
                }
                className={`h-8 text-sm text-center font-bold ${darkMode ? "bg-slate-900 border-slate-600 text-white" : ""}`}
              />
            </div>
          </div>

          {/* Aprobado */}
          <div className={`p-3 rounded-xl border ${darkMode ? "bg-emerald-900/10 border-emerald-800/40" : "bg-emerald-50 border-emerald-200"}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <Label className={`text-xs font-bold ${darkMode ? "text-emerald-300" : "text-emerald-800"}`}>Aprobado</Label>
            </div>
            <p className={`text-[10px] mb-1.5 ${darkMode ? "text-emerald-400/70" : "text-emerald-700/70"}`}>
              Nota mínima para aprobar
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>&ge;</span>
              <div
                className={`flex-1 h-8 flex items-center justify-center rounded-md border text-sm font-bold ${darkMode ? "bg-slate-900 border-slate-600 text-emerald-400" : "bg-white border-slate-200 text-emerald-700"}`}
              >
                {umbrales.umbralAprobado.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Historial */}
        <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <Label className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
            Límite Historial por Celda
          </Label>
          <p className={`text-[10px] mb-1.5 ${darkMode ? "text-slate-500" : "text-slate-500"}`}>
            Máximo de registros de cambios por celda
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step={1}
              min={1}
              max={50}
              value={umbrales.maxHistorialCelda}
              onChange={(e) =>
                setUmbrales((prev) => ({ ...prev, maxHistorialCelda: parseInt(e.target.value) || 1 }))
              }
              className={`h-8 text-sm w-24 text-center font-bold ${darkMode ? "bg-slate-900 border-slate-600 text-white" : ""}`}
            />
            <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-500"}`}>registros</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
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
