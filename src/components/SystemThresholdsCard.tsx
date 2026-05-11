"use client";

import React, { useState, useEffect } from "react";
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
    notaMinima: number;
    notaMaxima: number;
    maxHistorialCelda: number;
    usarIntervaloReprobado: boolean;
    usarIntervaloCondicionado: boolean;
    usarIntervaloAprobado: boolean;
  };
  setUmbrales: React.Dispatch<React.SetStateAction<{
    umbralRecuperacion: number;
    umbralCondicionado: number;
    umbralAprobado: number;
    notaMinima: number;
    notaMaxima: number;
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
  const ur = umbrales.umbralRecuperacion;
  const min = umbrales.notaMinima;
  const max = umbrales.notaMaxima;

  // Raw string states para permitir tipear decimales sin que React
  // reformatee el valor intermedio (ej: "6." → "6.00")
  const [rawUc, setRawUc] = useState(String(uc));
  const [rawUa, setRawUa] = useState(String(ua));
  const [rawUr, setRawUr] = useState(String(ur));
  const [rawMin, setRawMin] = useState(String(min));
  const [rawMax, setRawMax] = useState(String(max));

  // Sincronizar cuando cambian los props (reset, carga desde DB)
  useEffect(() => {
    queueMicrotask(() => {
      setRawUc(String(uc));
      setRawUa(String(ua));
      setRawUr(String(ur));
      setRawMin(String(min));
      setRawMax(String(max));
    });
  }, [uc, ua, ur, min, max]);

  // Rango total para la escala visual
  const rangeTotal = max - min;

  // Proporciones visuales basadas en el rango configurado
  const redWidth = rangeTotal > 0 ? Math.max(0, Math.min(100, ((uc - min) / rangeTotal) * 100)) : 0;
  const yellowWidth = rangeTotal > 0 ? Math.max(0, Math.min(100, ((ua - uc) / rangeTotal) * 100)) : 0;
  const greenWidth = rangeTotal > 0 ? Math.max(0, Math.min(100, ((max - ua) / rangeTotal) * 100)) : 0;

  const textMuted = darkMode ? "text-slate-500" : "text-slate-400";
  const inputBase = `text-center border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-b-2 transition-colors ${darkMode ? "bg-transparent border-slate-600 text-white focus-visible:border-slate-400" : "bg-transparent border-slate-300 text-slate-900 focus-visible:border-slate-500"}`;
  const inputSmall = `text-center border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-b-2 transition-colors text-sm ${darkMode ? "bg-transparent border-slate-600 text-white focus-visible:border-slate-400" : "bg-transparent border-slate-300 text-slate-900 focus-visible:border-slate-500"}`;

  const commitMin = (val: string) => {
    if (val === "" || val === ".") { setRawMin(String(min)); return; }
    let num = parseFloat(val);
    if (Number.isNaN(num)) { setRawMin(String(min)); return; }
    if (num < 0) num = 0;
    if (num >= uc) num = Math.max(0, Math.round((uc - 0.01) * 100) / 100);
    const rounded = Math.round(num * 100) / 100;
    setUmbrales((prev) => ({ ...prev, notaMinima: rounded }));
    setRawMin(String(rounded));
  };

  const commitUc = (val: string) => {
    if (val === "" || val === ".") { setRawUc(String(uc)); return; }
    let num = parseFloat(val);
    if (Number.isNaN(num)) { setRawUc(String(uc)); return; }
    // Auto-corregir valor desfasado 4.49 → 4.50
    if (Math.abs(num - 4.49) < 0.001) num = 4.50;
    const safeUa = typeof ua === 'number' ? ua : parseFloat(String(ua)) || 6.5;
    const safeMin = typeof min === 'number' ? min : parseFloat(String(min)) || 0;
    if (num <= safeMin) num = Math.min(safeUa, Math.round((safeMin + 0.01) * 100) / 100);
    if (num >= safeUa) num = Math.max(safeMin, Math.round((safeUa - 0.01) * 100) / 100);
    const rounded = Math.round(num * 100) / 100;
    setUmbrales((prev) => ({ ...prev, umbralCondicionado: rounded }));
    setRawUc(String(rounded));
  };

  const commitUa = (val: string) => {
    if (val === "" || val === ".") { setRawUa(String(ua)); return; }
    let num = parseFloat(val);
    if (Number.isNaN(num)) { setRawUa(String(ua)); return; }
    // Auto-corregir valor desfasado 6.49 → 6.50
    if (Math.abs(num - 6.49) < 0.001) num = 6.50;
    const safeUc = typeof uc === 'number' ? uc : parseFloat(String(uc)) || 4.5;
    const safeMax = typeof max === 'number' ? max : parseFloat(String(max)) || 10;
    if (num <= safeUc) num = Math.max(safeUc, Math.round((safeUc + 0.01) * 100) / 100);
    if (num >= safeMax) num = Math.min(safeMax, Math.round((safeMax - 0.01) * 100) / 100);
    const rounded = Math.round(num * 100) / 100;
    setUmbrales((prev) => ({ ...prev, umbralAprobado: rounded }));
    setRawUa(String(rounded));
  };

  const commitMax = (val: string) => {
    if (val === "" || val === ".") { setRawMax(String(max)); return; }
    let num = parseFloat(val);
    if (Number.isNaN(num)) { setRawMax(String(max)); return; }
    if (num > 10) num = 10;
    if (num <= ua) num = Math.min(10, Math.round((ua + 0.01) * 100) / 100);
    const rounded = Math.round(num * 100) / 100;
    setUmbrales((prev) => ({ ...prev, notaMaxima: rounded }));
    setRawMax(String(rounded));
  };

  const commitUr = (val: string) => {
    if (val === "" || val === ".") { setRawUr(String(ur)); return; }
    const num = parseFloat(val);
    if (Number.isNaN(num)) { setRawUr(String(ur)); return; }
    setUmbrales((prev) => ({ ...prev, umbralRecuperacion: num }));
    setRawUr(String(num));
  };

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

          {/* Intervalos en formato Marco Normativo */}
          <div className="flex text-xs font-mono">
            <div className="flex-1 text-left">
              {umbrales.usarIntervaloReprobado ? (
                <span className="text-[#f43f5e]">{min.toFixed(2)} – {Math.max(min, uc - 0.01).toFixed(2)}</span>
              ) : (
                <span className={textMuted}>—</span>
              )}
            </div>
            <div className="flex-1 text-center">
              {umbrales.usarIntervaloCondicionado ? (
                <span className="text-[#f59e0b]">{uc.toFixed(2)} – {Math.max(uc, ua - 0.01).toFixed(2)}</span>
              ) : (
                <span className={textMuted}>—</span>
              )}
            </div>
            <div className="flex-1 text-right">
              {umbrales.usarIntervaloAprobado ? (
                <span className="text-[#10b981]">{ua.toFixed(2)} – {max.toFixed(2)}</span>
              ) : (
                <span className={textMuted}>—</span>
              )}
            </div>
          </div>
        </div>

        {/* ===== RANGOS EDITABLES ===== */}
        <div className="space-y-4">
          {/* REPROBADO */}
          <div className={`rounded-xl border p-3 ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"} ${!umbrales.usarIntervaloReprobado ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f43f5e]" />
                <span className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Reprobado</span>
              </div>
              <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                <input
                  type="checkbox"
                  checked={umbrales.usarIntervaloReprobado}
                  onChange={(e) => setUmbrales((prev) => ({ ...prev, usarIntervaloReprobado: e.target.checked }))}
                  className="rounded"
                />
                <span className={textMuted}>Activo</span>
              </label>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] uppercase ${textMuted}`}>Desde</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={10}
                  value={rawMin}
                  onChange={(e) => setRawMin(e.target.value)}
                  onBlur={(e) => commitMin(e.target.value)}
                  disabled={!umbrales.usarIntervaloReprobado}
                  className={`w-16 text-base font-medium ${inputSmall}`}
                />
              </div>
              <span className={`text-lg ${textMuted}`}>→</span>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] uppercase ${textMuted}`}>Hasta</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={10}
                  value={rawUc}
                  onChange={(e) => setRawUc(e.target.value)}
                  onBlur={(e) => commitUc(e.target.value)}
                  disabled={!umbrales.usarIntervaloReprobado}
                  className={`w-16 text-base font-medium ${inputSmall}`}
                />
              </div>
            </div>
          </div>

          {/* CONDICIONADO */}
          <div className={`rounded-xl border p-3 ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"} ${!umbrales.usarIntervaloCondicionado ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Condicionado</span>
              </div>
              <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                <input
                  type="checkbox"
                  checked={umbrales.usarIntervaloCondicionado}
                  onChange={(e) => setUmbrales((prev) => ({ ...prev, usarIntervaloCondicionado: e.target.checked }))}
                  className="rounded"
                />
                <span className={textMuted}>Activo</span>
              </label>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] uppercase ${textMuted}`}>Desde</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={10}
                  value={rawUc}
                  onChange={(e) => setRawUc(e.target.value)}
                  onBlur={(e) => commitUc(e.target.value)}
                  disabled={!umbrales.usarIntervaloCondicionado}
                  className={`w-16 text-base font-medium ${inputSmall}`}
                />
              </div>
              <span className={`text-lg ${textMuted}`}>→</span>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] uppercase ${textMuted}`}>Hasta</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={10}
                  value={rawUa}
                  onChange={(e) => setRawUa(e.target.value)}
                  onBlur={(e) => commitUa(e.target.value)}
                  disabled={!umbrales.usarIntervaloCondicionado}
                  className={`w-16 text-base font-medium ${inputSmall}`}
                />
              </div>
            </div>
          </div>

          {/* APROBADO */}
          <div className={`rounded-xl border p-3 ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"} ${!umbrales.usarIntervaloAprobado ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Aprobado</span>
              </div>
              <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                <input
                  type="checkbox"
                  checked={umbrales.usarIntervaloAprobado}
                  onChange={(e) => setUmbrales((prev) => ({ ...prev, usarIntervaloAprobado: e.target.checked }))}
                  className="rounded"
                />
                <span className={textMuted}>Activo</span>
              </label>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] uppercase ${textMuted}`}>Desde</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={10}
                  value={rawUa}
                  onChange={(e) => setRawUa(e.target.value)}
                  onBlur={(e) => commitUa(e.target.value)}
                  disabled={!umbrales.usarIntervaloAprobado}
                  className={`w-16 text-base font-medium ${inputSmall}`}
                />
              </div>
              <span className={`text-lg ${textMuted}`}>→</span>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] uppercase ${textMuted}`}>Hasta</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={10}
                  value={rawMax}
                  onChange={(e) => setRawMax(e.target.value)}
                  onBlur={(e) => commitMax(e.target.value)}
                  disabled={!umbrales.usarIntervaloAprobado}
                  className={`w-16 text-base font-medium ${inputSmall}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===== UMBRAL RECUPERACIÓN ===== */}
        <div className={`rounded-xl border p-3 text-center ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
          <div className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>UMBRAL RECUPERACIÓN (RECUPERACIÓN ANUAL)</div>
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>≥</span>
            <Input
              type="number"
              step="0.01"
              min={0}
              max={10}
              value={rawUr}
              onChange={(e) => setRawUr(e.target.value)}
              onBlur={(e) => commitUr(e.target.value)}
              className={`w-20 text-lg font-medium ${inputBase}`}
            />
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
