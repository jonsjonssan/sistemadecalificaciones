"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Estudiante, Calificacion, ConfigActividadPartial } from "@/types";
import { calcularPromedio, calcularPromedioFinal, parseNotas } from "@/utils/gradeCalculations";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CalificacionRowProps {
  estudiante: Estudiante;
  materiaId: string;
  trimestre: string;
  calificacion?: Calificacion;
  config: ConfigActividadPartial | null;
  onSave: (id: string, matId: string, data: {
    actividadesCotidianas: (number | null)[];
    actividadesIntegradoras: (number | null)[];
    examenTrimestral: number | null;
    recuperacion: number | null;
  }) => void;
  saving: boolean;
  darkMode: boolean;
  evenRow: boolean;
  isAdmin?: boolean;
  onBorrar?: (estudianteId: string) => void;
  promedioDecimal?: boolean;
}

function NotaInput({ value, onChange, darkMode, hasError, onBlur }: {
  value: string | number | null;
  onChange: (v: string) => void;
  darkMode: boolean;
  hasError: boolean;
  onBlur: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = value === null || value === undefined ? "" : String(value);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      className={`w-full h-7 sm:h-8 text-center text-xs sm:text-sm border rounded px-0.5 transition-colors ${darkMode
        ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
        : "bg-white border-slate-300 text-slate-900"
        } ${hasError ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""} focus:ring-1 focus:ring-teal-500 focus:border-teal-500`}
      placeholder="-"
      maxLength={4}
    />
  );
}

export const CalificacionRow = React.memo(function CalificacionRow({
  estudiante,
  materiaId,
  trimestre,
  calificacion,
  config,
  onSave,
  saving,
  darkMode,
  evenRow,
  isAdmin,
  onBorrar,
  promedioDecimal = false,
}: CalificacionRowProps) {
  const numAC = config?.numActividadesCotidianas ?? 4;
  const numAI = config?.numActividadesIntegradoras ?? 1;
  const tieneExamen = config?.tieneExamen ?? true;

  const key = `${materiaId}-${trimestre}-${calificacion?.id || "none"}-${numAC}-${numAI}`;

  const [acNotas, setAcNotas] = useState<(number | null)[]>(() =>
    parseNotas(calificacion?.actividadesCotidianas ?? null, numAC)
  );
  const [aiNotas, setAiNotas] = useState<(number | null)[]>(() =>
    parseNotas(calificacion?.actividadesIntegradoras ?? null, numAI)
  );
  const [examen, setExamen] = useState<number | null>(() => calificacion?.examenTrimestral ?? null);
  const [recup, setRecup] = useState<number | null>(() => calificacion?.recuperacion ?? null);
  const [dirty, setDirty] = useState(false);
  const [acErrors, setAcErrors] = useState<Set<number>>(new Set());
  const [aiErrors, setAiErrors] = useState<Set<number>>(new Set());
  const [examenError, setExamenError] = useState(false);
  const [recupError, setRecupError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const newAC = parseNotas(calificacion?.actividadesCotidianas ?? null, numAC);
      const newAI = parseNotas(calificacion?.actividadesIntegradoras ?? null, numAI);
      const newEx = calificacion?.examenTrimestral ?? null;
      const newRc = calificacion?.recuperacion ?? null;
      setAcNotas(newAC);
      setAiNotas(newAI);
      setExamen(newEx);
      setRecup(newRc);
      setDirty(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [key, numAC, numAI, calificacion?.actividadesCotidianas, calificacion?.actividadesIntegradoras, calificacion?.examenTrimestral, calificacion?.recuperacion]);

  const stateRef = useRef({ dirty, acNotas, aiNotas, examen, recup });
  useEffect(() => {
    stateRef.current = { dirty, acNotas, aiNotas, examen, recup };
  }, [dirty, acNotas, aiNotas, examen, recup]);

  const promAC = calcularPromedio(acNotas),
    promAI = calcularPromedio(aiNotas);
  const promACPeso = config && promAC !== null ? promAC * (config.porcentajeAC / 100) : promAC !== null ? promAC * 0.35 : null;
  const promAIPeso = config && promAI !== null ? promAI * (config.porcentajeAI / 100) : promAI !== null ? promAI * 0.35 : null;
  const promExPeso = config && config.tieneExamen && examen !== null ? examen * (config.porcentajeExamen / 100) : examen !== null ? examen * 0.35 : null;
  const promFinal = config
    ? calcularPromedioFinal(promAC, promAI, examen, config, recup)
    : promAC !== null || promAI !== null || examen !== null
      ? ((promAC ?? 0) * 0.35 + (promAI ?? 0) * 0.30 + (examen ?? 0) * 0.35)
      : null;
  const parseVal = useCallback((v: string): number | null => {
    const n = parseFloat(v);
    return isNaN(n) ? null : Math.min(10, Math.max(0, n));
  }, []);

  const updateAC = useCallback(
    (i: number, v: string) => {
      setAcNotas(n => {
        const arr = [...n];
        arr[i] = parseVal(v);
        return arr;
      });
      setDirty(true);
      if (v !== "")
        setAcErrors(prev => {
          const next = new Set(prev);
          next.delete(i);
          return next;
        });
    },
    [parseVal]
  );
  const updateAI = useCallback(
    (i: number, v: string) => {
      setAiNotas(n => {
        const arr = [...n];
        arr[i] = parseVal(v);
        return arr;
      });
      setDirty(true);
      if (v !== "")
        setAiErrors(prev => {
          const next = new Set(prev);
          next.delete(i);
          return next;
        });
    },
    [parseVal]
  );
  const handleExamen = useCallback(
    (v: string) => {
      setExamen(parseVal(v));
      setDirty(true);
      if (v !== "") setExamenError(false);
    },
    [parseVal]
  );
  const handleRecup = useCallback(
    (v: string) => {
      setRecup(parseVal(v));
      setDirty(true);
      if (v !== "") setRecupError(false);
    },
    [parseVal]
  );
  const blurAC = useCallback((i: number, v: string | number | null) => {
    setAcErrors(prev => {
      const next = new Set(prev);
      if (v === "" || v === null) next.add(i);
      else next.delete(i);
      return next;
    });
  }, []);
  const blurAI = useCallback((i: number, v: string | number | null) => {
    setAiErrors(prev => {
      const next = new Set(prev);
      if (v === "" || v === null) next.add(i);
      else next.delete(i);
      return next;
    });
  }, []);
  const blurExamen = useCallback((v: string | number | null) => {
    setExamenError(v === "" || v === null);
  }, []);
  const blurRecup = useCallback((v: string | number | null) => {
    setRecupError(v === "" || v === null);
  }, []);

  useEffect(() => {
    return () => {
      if (stateRef.current.dirty) {
        onSave(estudiante.id, materiaId, {
          actividadesCotidianas: stateRef.current.acNotas,
          actividadesIntegradoras: stateRef.current.aiNotas,
          examenTrimestral: stateRef.current.examen,
          recuperacion: stateRef.current.recup,
        });
      }
    };
  }, [estudiante.id, materiaId, onSave]);

  useEffect(() => {
    if (!dirty) return;
    const handler = setTimeout(() => {
      onSave(estudiante.id, materiaId, {
        actividadesCotidianas: stateRef.current.acNotas,
        actividadesIntegradoras: stateRef.current.aiNotas,
        examenTrimestral: stateRef.current.examen,
        recuperacion: stateRef.current.recup,
      });
      setDirty(false);
    }, 800);
    return () => clearTimeout(handler);
  }, [acNotas, aiNotas, examen, recup, dirty, estudiante.id, materiaId, onSave]);

  const rowBg = evenRow
    ? darkMode
      ? "bg-[#1e293b] hover:bg-slate-700/80"
      : "bg-white hover:bg-slate-50"
    : darkMode
      ? "bg-slate-800/60 hover:bg-slate-700/80"
      : "bg-slate-50/50 hover:bg-slate-100";
  const cellBorder = darkMode ? "border-slate-600/60" : "border-slate-200";
  const stickyBg = evenRow
    ? darkMode
      ? "bg-[#1e293b]"
      : "bg-white"
    : darkMode
      ? "bg-slate-800/60"
      : "bg-slate-50/50";
  const promACBg = darkMode ? "bg-blue-900/50" : "bg-blue-50/70";
  const promAIBg = darkMode ? "bg-purple-900/50" : "bg-purple-50/70";
  const promExBg = darkMode ? "bg-amber-900/50" : "bg-amber-50/70";
  const finalBg = darkMode ? "bg-emerald-900/60" : "bg-emerald-50/80";
  const hasData = acNotas.some(n => n !== null) || aiNotas.some(n => n !== null) || examen !== null;
  const statusIcon =
    saving && dirty ? (
      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 text-teal-500 animate-spin mx-auto" />
    ) : !dirty && hasData ? (
      <span title="Guardado">✅</span>
    ) : (
      <span className={darkMode ? "text-slate-600" : "text-slate-300"}>-</span>
    );
  const finalBadgeClass =
    promFinal !== null && promFinal >= 5
      ? darkMode
        ? "bg-emerald-700/80 text-emerald-100 ring-1 ring-emerald-500"
        : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
      : promFinal !== null
        ? darkMode
          ? "bg-rose-700/80 text-rose-100 ring-1 ring-rose-500"
          : "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
        : darkMode
          ? "bg-slate-700 text-slate-400"
          : "bg-slate-100 text-slate-400";

  if (!config) {
    return (
      <tr className={`border-b transition-colors ${rowBg}`}>
        <td className={`p-2 text-center font-semibold sticky-col shadow-right left-0 z-10 border-r ${stickyBg} ${cellBorder}`}>
          {estudiante.numero}
        </td>
        <td className={`p-2 font-medium sticky-col shadow-right left-10 z-10 whitespace-nowrap border-r ${stickyBg} ${cellBorder}`}>
          {estudiante.nombre}
        </td>
        {Array.from({ length: numAC }).map((_, i) => (
          <td key={`ac-${i}`} className={`p-1 border-l ${cellBorder}`}>
            <NotaInput
              value={acNotas[i] ?? ""}
              onChange={v => updateAC(i, v)}
              darkMode={darkMode}
              hasError={acErrors.has(i)}
              onBlur={() => blurAC(i, acNotas[i])}
            />
          </td>
        ))}
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promACBg} text-base`}>
          {promACPeso !== null ? promACPeso.toFixed(1) : "-"}
        </td>
        {Array.from({ length: numAI }).map((_, i) => (
          <td key={`ai-${i}`} className={`p-1 border-l ${cellBorder}`}>
            <NotaInput
              value={aiNotas[i] ?? ""}
              onChange={v => updateAI(i, v)}
              darkMode={darkMode}
              hasError={aiErrors.has(i)}
              onBlur={() => blurAI(i, aiNotas[i])}
            />
          </td>
        ))}
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promAIBg} text-base`}>
          {promAIPeso !== null ? promAIPeso.toFixed(1) : "-"}
        </td>
        {tieneExamen && (
          <td className={`p-1 border-l ${cellBorder}`}>
            <NotaInput
              value={examen ?? ""}
              onChange={handleExamen}
              darkMode={darkMode}
              hasError={examenError}
              onBlur={() => blurExamen(examen)}
            />
          </td>
        )}
        {tieneExamen && (
          <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promExBg} text-base`}>
            {promExPeso !== null ? Math.round(promExPeso).toString() : "-"}
          </td>
        )}
        <td className={`p-1 border-l ${cellBorder}`}>
          <NotaInput
            value={recup ?? ""}
            onChange={handleRecup}
            darkMode={darkMode}
            hasError={recupError}
            onBlur={() => blurRecup(recup)}
          />
        </td>
        <td className={`p-2 text-center border-l ${cellBorder} ${finalBg}`}>
          <span className={`inline-block px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow ${finalBadgeClass}`}>
            {promFinal !== null ? (promedioDecimal ? promFinal.toFixed(1) : Math.round(promFinal).toString()) : "-"}
          </span>
        </td>
        <td className={`p-2 border-l ${cellBorder} text-center`}>{statusIcon}</td>
        {isAdmin && onBorrar && (
          <td className={`p-1 border-l ${cellBorder} text-center`}>
            <button
              onClick={() => onBorrar(estudiante.id)}
              title="Borrar calificaciones de este alumno"
              className="text-red-500 hover:text-red-700 p-1"
            >
              🗑️
            </button>
          </td>
        )}
      </tr>
    );
  }

  return (
    <tr className={`border-b transition-colors ${rowBg}`}>
      <td className={`p-2 text-center font-semibold sticky-col shadow-right left-0 z-10 border-r ${stickyBg} ${cellBorder}`}>
        {estudiante.numero}
      </td>
      <td className={`p-2 font-medium sticky-col shadow-right left-10 z-10 whitespace-nowrap border-r ${stickyBg} ${cellBorder}`}>
        {estudiante.nombre}
      </td>
      {acNotas.map((n, i) => (
        <td key={`ac-${i}`} className={`p-1 border-l ${cellBorder}`}>
          <NotaInput
            value={n ?? ""}
            onChange={v => updateAC(i, v)}
            darkMode={darkMode}
            hasError={acErrors.has(i)}
            onBlur={() => blurAC(i, n)}
          />
        </td>
      ))}
      <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promACBg} text-sm sm:text-base`}>
        {promACPeso !== null ? promACPeso.toFixed(1) : "-"}
      </td>
      {aiNotas.map((n, i) => (
        <td key={`ai-${i}`} className={`p-1 border-l ${cellBorder}`}>
          <NotaInput
            value={n ?? ""}
            onChange={v => updateAI(i, v)}
            darkMode={darkMode}
            hasError={aiErrors.has(i)}
            onBlur={() => blurAI(i, n)}
          />
        </td>
      ))}
      <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promAIBg} text-sm sm:text-base`}>
        {promAIPeso !== null ? promAIPeso.toFixed(1) : "-"}
      </td>
      {config.tieneExamen && (
        <td className={`p-1 border-l ${cellBorder}`}>
          <NotaInput
            value={examen ?? ""}
            onChange={handleExamen}
            darkMode={darkMode}
            hasError={examenError}
            onBlur={() => blurExamen(examen)}
          />
        </td>
      )}
      {config.tieneExamen && (
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promExBg} text-sm sm:text-base`}>
          {promExPeso !== null ? Math.round(promExPeso).toString() : "-"}
        </td>
      )}
      <td className={`p-1 border-l ${cellBorder}`}>
        <NotaInput
          value={recup ?? ""}
          onChange={handleRecup}
          darkMode={darkMode}
          hasError={recupError}
          onBlur={() => blurRecup(recup)}
        />
      </td>
      <td className={`p-2 text-center border-l ${cellBorder} ${finalBg}`}>
        <span className={`inline-block px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow ${finalBadgeClass}`}>
          {promFinal !== null ? (promedioDecimal ? promFinal.toFixed(1) : Math.round(promFinal).toString()) : "-"}
        </span>
      </td>
      <td className={`p-2 border-l ${cellBorder} text-center`}>{statusIcon}</td>
    </tr>
  );
});

export default CalificacionRow;