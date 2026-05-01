"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Estudiante, Calificacion, ConfigActividadPartial } from "@/types";
import { calcularPromedio, calcularPromedioFinal, parseNotas } from "@/utils/gradeCalculations";
import { RefreshCw, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HistorialCalificacionPopup } from "./HistorialCalificacionPopup";

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
  }) => Promise<Calificacion | void> | void;
  onRegisterForceSave?: (studentId: string, saveFn: (() => Promise<void>) | null) => void;
  saving: boolean;
  darkMode: boolean;
  evenRow: boolean;
  isAdmin?: boolean;
  onBorrar?: (estudianteId: string) => void;
  promedioDecimal?: boolean;
  rowIndex?: number;
  totalRows?: number;
  onNavigate?: (fromRow: number, fromCol: number, direction: 'up' | 'down' | 'left' | 'right') => void;
  inputRefs?: React.MutableRefObject<Map<string, HTMLInputElement>>;
  onShowHistory?: (calificacionId: string, tipoCampo: string, campoLabel: string, anchorRef: React.RefObject<HTMLElement | null>) => void;
}

function NotaInput({ value, onChange, darkMode, hasError, onBlur, onNavigate, inputKey, inputRefs, onShowHistory, calificacionId, tipoCampo, campoLabel }: {
  value: string | number | null;
  onChange: (v: string) => void;
  darkMode: boolean;
  hasError: boolean;
  onBlur: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  inputKey?: string;
  inputRefs?: React.MutableRefObject<Map<string, HTMLInputElement>>;
  onShowHistory?: (calificacionId: string, tipoCampo: string, campoLabel: string, anchorRef: React.RefObject<HTMLElement | null>) => void;
  calificacionId?: string;
  tipoCampo?: string;
  campoLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onShowHistory && calificacionId && tipoCampo && campoLabel) {
      onShowHistory(calificacionId, tipoCampo, campoLabel, cellRef);
    }
  };

  // Registrar input en el Map de referencias
  useEffect(() => {
    if (inputKey && inputRefs && inputRef.current) {
      inputRefs.current.set(inputKey, inputRef.current);
      return () => {
        inputRefs.current.delete(inputKey);
      };
    }
  }, [inputKey, inputRefs]);
  // Inicializar con el valor raw como string para permitir escritura libre de decimales
  const [rawValue, setRawValue] = useState(() =>
    value === null || value === undefined ? "" : String(value)
  );

  // Sincronizar rawValue cuando el valor externo cambie (e.g., carga de datos)
  useEffect(() => {
    const newVal = value === null || value === undefined ? "" : String(value);
    // Solo actualizar si el input no está enfocado (evita sobrescribir mientras el usuario escribe)
    if (document.activeElement !== inputRef.current) {
      setRawValue(newVal);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    // Permitir solo caracteres válidos: dígitos, punto decimal, signo negativo
    v = v.replace(/[^0-9.\-]/g, "");
    // Asegurar que solo haya un punto decimal
    const parts = v.split(".");
    if (parts.length > 2) {
      v = parts[0] + "." + parts.slice(1).join("");
    }
    // Asegurar que solo haya un signo negativo al inicio
    if (v.indexOf("-") > 0) {
      v = v.replace(/-/g, "");
    }
    setRawValue(v);
    // Enviar el valor raw al padre también, para que se pueda parsear correctamente
    onChange(v);
  };

  const handleBlur = () => {
    // Al perder el foco, normalizar el valor: si es vacío o inválido, enviar ""
    let v = rawValue.trim();
    let normalizedValue = "";
    if (v !== "" && v !== "." && v !== "-") {
      const n = parseFloat(v);
      if (!isNaN(n)) {
        const clamped = Math.min(10, Math.max(0, n));
        normalizedValue = Number.isInteger(clamped) ? clamped.toString() : parseFloat(clamped.toFixed(2)).toString();
      }
    }
    // Solo actualizar si el valor cambió realmente
    const currentValue = value === null || value === undefined ? "" : String(value);
    if (normalizedValue !== currentValue) {
      setRawValue(normalizedValue);
      onChange(normalizedValue);
    } else if (normalizedValue !== rawValue) {
      // Aunque no cambie el valor numérico, actualizar display si fue modificado
      setRawValue(normalizedValue);
    }
    onBlur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onNavigate?.('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        onNavigate?.('down');
        break;
      case 'ArrowLeft':
        // Solo mover si el cursor está al inicio del texto
        if (e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
          e.preventDefault();
          onNavigate?.('left');
        }
        break;
      case 'ArrowRight':
        // Solo mover si el cursor está al final del texto
        if (e.currentTarget.selectionStart === e.currentTarget.value.length && e.currentTarget.selectionEnd === e.currentTarget.value.length) {
          e.preventDefault();
          onNavigate?.('right');
        }
        break;
      case 'Enter':
        e.preventDefault();
        onNavigate?.('down');
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          onNavigate?.('left');
        } else {
          onNavigate?.('right');
        }
        break;
    }
  };

  return (
    <div ref={cellRef} suppressHydrationWarning onContextMenu={handleContextMenu} className="relative group">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={rawValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full h-7 sm:h-8 text-center text-xs sm:text-sm border rounded px-0.5 transition-colors ${darkMode
          ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
          : "bg-white border-slate-300 text-slate-900"
          } ${hasError ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""} focus:ring-1 focus:ring-teal-500 focus:border-teal-500`}
        placeholder="-"
        maxLength={6}
        suppressHydrationWarning
      />
      {onShowHistory && (
        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className={`p-0.5 rounded-full cursor-pointer ${darkMode ? "bg-slate-600 hover:bg-slate-500" : "bg-slate-200 hover:bg-slate-300"}`} title="Ver historial de cambios">
            <History className="h-2.5 w-2.5 text-teal-500" />
          </div>
        </div>
      )}
    </div>
  );
}

export const CalificacionRow = React.memo(function CalificacionRow({
  estudiante,
  materiaId,
  trimestre,
  calificacion,
  config,
  onSave,
  onRegisterForceSave,
  saving,
  darkMode,
  evenRow,
  isAdmin,
  onBorrar,
  promedioDecimal = false,
  rowIndex = 0,
  totalRows = 0,
  onNavigate,
  inputRefs,
  onShowHistory,
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
  const [saveError, setSaveError] = useState(false);
  const [acErrors, setAcErrors] = useState<Set<number>>(new Set());
  const [aiErrors, setAiErrors] = useState<Set<number>>(new Set());
  const [examenError, setExamenError] = useState(false);
  const [recupError, setRecupError] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Detectar cuando calificacion es eliminada (cambia de tener valor a undefined)
const wasDeleted = useRef(false);
const prevCalifId = useRef(calificacion?.id);

useEffect(() => {
  const currId = calificacion?.id;
  // Si antes tenía ID y ahora no tiene (calificacion es undefined), fue eliminado
  if (prevCalifId.current !== undefined && currId === undefined) {
    wasDeleted.current = true;
  }
  prevCalifId.current = currId;
}, [calificacion?.id]);

// Efecto defensivo: si fue eliminado, resetear todo el estado local
useEffect(() => {
  if (wasDeleted.current) {
    setAcNotas(Array(numAC).fill(null));
    setAiNotas(Array(numAI).fill(null));
    setExamen(null);
    setRecup(null);
    setDirty(false);
    setSaveError(false);
    wasDeleted.current = false;
  }
}, [calificacion?.id, numAC, numAI]);

// Sincronizar con props SOLO cuando no haya cambios locales pendientes (dirty)
// para evitar sobreescribir lo que el usuario acaba de escribir
  useEffect(() => {
    if (dirty) return; // No sobreescribir si el usuario tiene cambios sin guardar
    const timer = setTimeout(() => {
      const newAC = parseNotas(calificacion?.actividadesCotidianas ?? null, numAC);
      const newAI = parseNotas(calificacion?.actividadesIntegradoras ?? null, numAI);
      const newEx = calificacion?.examenTrimestral ?? null;
      const newRc = calificacion?.recuperacion ?? null;
      setAcNotas(newAC);
      setAiNotas(newAI);
      setExamen(newEx);
      setRecup(newRc);
      setSaveError(false);
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [key, numAC, numAI, calificacion?.actividadesCotidianas, calificacion?.actividadesIntegradoras, calificacion?.examenTrimestral, calificacion?.recuperacion, dirty]);

  const stateRef = useRef({ dirty, acNotas, aiNotas, examen, recup });
  const savingRef = useRef(false);
  useEffect(() => {
    stateRef.current = { dirty, acNotas, aiNotas, examen, recup };
  }, [dirty, acNotas, aiNotas, examen, recup]);

  const promAC = calcularPromedio(acNotas),
    promAI = calcularPromedio(aiNotas);
  const promACPeso = config && promAC !== null ? promAC * (config.porcentajeAC / 100) : promAC !== null ? promAC * 0.35 : null;
  const promAIPeso = config && promAI !== null ? promAI * (config.porcentajeAI / 100) : promAI !== null ? promAI * 0.35 : null;
  const promExPeso = config && config.tieneExamen && examen !== null ? examen * (config.porcentajeExamen / 100) : examen !== null ? examen * 0.30 : null;
  const promFinal = config
    ? calcularPromedioFinal(promAC, promAI, examen, config, recup)
    : promAC !== null || promAI !== null || examen !== null
      ? ((promAC ?? 0) * 0.35 + (promAI ?? 0) * 0.35 + (examen ?? 0) * 0.30)
      : null;

  // Helper para formatear números: muestra entero si es entero, decimal si tiene decimales
  const formatNumber = useCallback((value: number | null, decimal?: boolean): string => {
    if (value === null) return "-";
    if (decimal) {
      // Modo decimal: mostrar hasta 2 decimales, eliminando ceros innecesarios
      return parseFloat(value.toFixed(2)).toString();
    }
    // Modo normal: mostrar entero si es entero, decimal si tiene decimales
    return Number.isInteger(value) ? value.toString() : parseFloat(value.toFixed(2)).toString();
  }, []);

  const parseVal = useCallback((v: string): number | null => {
    if (v === "" || v === "." || v === "-" || v === ".0" || v === "-.") return null;
    const n = parseFloat(v);
    if (isNaN(n)) return null;
    // Clampear al rango 0-10
    return Math.min(10, Math.max(0, n));
  }, []);

  const updateAC = useCallback(
    (i: number, v: string) => {
      const newVal = parseVal(v);
      let changed = false;
      setAcNotas(n => {
        const arr = [...n];
        if (arr[i] !== newVal) {
          arr[i] = newVal;
          changed = true;
        }
        return arr;
      });
      if (changed) {
        setDirty(true);
      }
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
      const newVal = parseVal(v);
      let changed = false;
      setAiNotas(n => {
        const arr = [...n];
        if (arr[i] !== newVal) {
          arr[i] = newVal;
          changed = true;
        }
        return arr;
      });
      if (changed) {
        setDirty(true);
      }
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
      const newVal = parseVal(v);
      if (examen !== newVal) {
        setExamen(newVal);
        setDirty(true);
      }
      if (v !== "") setExamenError(false);
    },
    [parseVal, examen]
  );
  const handleRecup = useCallback(
    (v: string) => {
      const newVal = parseVal(v);
      if (recup !== newVal) {
        setRecup(newVal);
        setDirty(true);
      }
      if (v !== "") setRecupError(false);
    },
    [parseVal, recup]
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

  // Helper para navegación por teclado
  // Columnas: AC(0..numAC-1), AI(numAC..numAC+numAI-1), Examen(numAC+numAI), Recuperación(numAC+numAI+1)
  const getColIndex = useCallback((type: 'ac' | 'ai' | 'examen' | 'recup', index: number = 0): number => {
    if (type === 'ac') return index;
    if (type === 'ai') return numAC + index;
    if (type === 'examen') return numAC + numAI;
    return numAC + numAI + (tieneExamen ? 1 : 0); // recup
  }, [numAC, numAI, tieneExamen]);

  const handleNavigate = useCallback((type: 'ac' | 'ai' | 'examen' | 'recup', index: number = 0) => {
    return (direction: 'up' | 'down' | 'left' | 'right') => {
      const colIndex = getColIndex(type, index);
      onNavigate?.(rowIndex, colIndex, direction);
    };
  }, [getColIndex, onNavigate, rowIndex]);

  const doSave = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveError(false);
    try {
      const result = await onSave(estudiante.id, materiaId, {
        actividadesCotidianas: stateRef.current.acNotas,
        actividadesIntegradoras: stateRef.current.aiNotas,
        examenTrimestral: stateRef.current.examen,
        recuperacion: stateRef.current.recup,
      });
      if (result && typeof result === "object") {
        setAcNotas(parseNotas(result.actividadesCotidianas ?? null, numAC));
        setAiNotas(parseNotas(result.actividadesIntegradoras ?? null, numAI));
        setExamen(result.examenTrimestral ?? null);
        setRecup(result.recuperacion ?? null);
      }
      setDirty(false);
      setSaveError(false);
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    } catch {
      setSaveError(true);
      scheduleRetry();
    } finally {
      savingRef.current = false;
    }
  }, [estudiante.id, materiaId, onSave, numAC, numAI]);

  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    const delay = Math.min(2000 * Math.pow(2, retryCountRef.current), 30000);
    retryCountRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      doSave();
    }, delay);
  }, [doSave]);

  // Registrar función de guardado forzado en el padre (para Guardar Todo)
  useEffect(() => {
    if (onRegisterForceSave) {
      onRegisterForceSave(estudiante.id, doSave);
      return () => { onRegisterForceSave(estudiante.id, null); };
    }
  }, [estudiante.id, doSave, onRegisterForceSave]);

  // Guardado al desmontar: guardar cambios pendientes con keepalive (solo un envío)
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (stateRef.current.dirty) {
        const trimestreNum = parseInt(trimestre);
        const body = JSON.stringify({
          estudianteId: estudiante.id,
          materiaId,
          trimestre: trimestreNum,
          actividadesCotidianas: JSON.stringify(stateRef.current.acNotas),
          actividadesIntegradoras: JSON.stringify(stateRef.current.aiNotas),
          examenTrimestral: stateRef.current.examen,
          recuperacion: stateRef.current.recup,
        });
        fetch("/api/calificaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: true,
          body,
        }).catch(() => {});
      }
    };
  }, [estudiante.id, materiaId, trimestre]);

  // Auto-save con debounce (800ms) - solo para cambios nuevos, no reintentos
  useEffect(() => {
    if (!dirty || saveError) return;
    const handler = setTimeout(() => {
      doSave();
    }, 800);
    return () => clearTimeout(handler);
  }, [acNotas, aiNotas, examen, recup, dirty, saveError, doSave]);

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
    saveError ? (
      <span title="Error al guardar. Se reintentará automáticamente.">⚠️</span>
    ) : saving && dirty ? (
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
              onNavigate={handleNavigate('ac', i)}
              inputKey={`${estudiante.id}-${getColIndex('ac', i)}`}
              inputRefs={inputRefs}
              onShowHistory={onShowHistory}
              calificacionId={calificacion?.id}
              tipoCampo={`cotidiana_${i + 1}`}
              campoLabel={`AC${i + 1}`}
            />
          </td>
        ))}
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promACBg} text-sm sm:text-base`}>
          {promACPeso !== null ? formatNumber(promACPeso) : "-"}
        </td>
        {Array.from({ length: numAI }).map((_, i) => (
          <td key={`ai-${i}`} className={`p-1 border-l ${cellBorder}`}>
            <NotaInput
              value={aiNotas[i] ?? ""}
              onChange={v => updateAI(i, v)}
              darkMode={darkMode}
              hasError={aiErrors.has(i)}
              onBlur={() => blurAI(i, aiNotas[i])}
              onNavigate={handleNavigate('ai', i)}
              inputKey={`${estudiante.id}-${getColIndex('ai', i)}`}
              inputRefs={inputRefs}
              onShowHistory={onShowHistory}
              calificacionId={calificacion?.id}
              tipoCampo={`integradora_${i + 1}`}
              campoLabel={`AI${i + 1}`}
            />
          </td>
        ))}
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promAIBg} text-sm sm:text-base`}>
          {promAIPeso !== null ? formatNumber(promAIPeso) : "-"}
        </td>
        {tieneExamen && (
          <td className={`p-1 border-l ${cellBorder}`}>
            <NotaInput
              value={examen ?? ""}
              onChange={handleExamen}
              darkMode={darkMode}
              hasError={examenError}
              onBlur={() => blurExamen(examen)}
              onNavigate={handleNavigate('examen')}
              inputKey={`${estudiante.id}-${getColIndex('examen')}`}
              inputRefs={inputRefs}
              onShowHistory={onShowHistory}
              calificacionId={calificacion?.id}
              tipoCampo="examenTrimestral"
              campoLabel="Examen"
            />
          </td>
        )}
        {tieneExamen && (
          <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promExBg} text-sm sm:text-base`}>
            {promExPeso !== null ? formatNumber(promExPeso) : "-"}
          </td>
        )}
        <td className={`p-1 border-l ${cellBorder}`}>
          <NotaInput
            value={recup ?? ""}
            onChange={handleRecup}
            darkMode={darkMode}
            hasError={recupError}
            onBlur={() => blurRecup(recup)}
            onNavigate={handleNavigate('recup')}
            inputKey={`${estudiante.id}-${getColIndex('recup')}`}
            inputRefs={inputRefs}
            onShowHistory={onShowHistory}
            calificacionId={calificacion?.id}
            tipoCampo="recuperacion"
            campoLabel="Recuperación"
          />
        </td>
        <td className={`p-2 text-center border-l ${cellBorder} ${finalBg}`}>
          <span className={`inline-block px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow ${finalBadgeClass}`}>
            {promFinal !== null ? (promedioDecimal ? formatNumber(promFinal, true) : Math.round(promFinal).toString()) : "-"}
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
            onNavigate={handleNavigate('ac', i)}
            inputKey={`${estudiante.id}-${getColIndex('ac', i)}`}
            inputRefs={inputRefs}
            onShowHistory={onShowHistory}
            calificacionId={calificacion?.id}
            tipoCampo={`cotidiana_${i + 1}`}
            campoLabel={`AC${i + 1}`}
          />
        </td>
      ))}
      <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promACBg} text-sm sm:text-base`}>
        {promACPeso !== null ? formatNumber(promACPeso) : "-"}
      </td>
      {aiNotas.map((n, i) => (
        <td key={`ai-${i}`} className={`p-1 border-l ${cellBorder}`}>
          <NotaInput
            value={n ?? ""}
            onChange={v => updateAI(i, v)}
            darkMode={darkMode}
            hasError={aiErrors.has(i)}
            onBlur={() => blurAI(i, n)}
            onNavigate={handleNavigate('ai', i)}
            inputKey={`${estudiante.id}-${getColIndex('ai', i)}`}
            inputRefs={inputRefs}
            onShowHistory={onShowHistory}
            calificacionId={calificacion?.id}
            tipoCampo={`integradora_${i + 1}`}
            campoLabel={`AI${i + 1}`}
          />
        </td>
      ))}
      <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promAIBg} text-sm sm:text-base`}>
        {promAIPeso !== null ? formatNumber(promAIPeso) : "-"}
      </td>
      {config.tieneExamen && (
        <td className={`p-1 border-l ${cellBorder}`}>
          <NotaInput
            value={examen ?? ""}
            onChange={handleExamen}
            darkMode={darkMode}
            hasError={examenError}
            onBlur={() => blurExamen(examen)}
            onNavigate={handleNavigate('examen')}
            inputKey={`${estudiante.id}-${getColIndex('examen')}`}
            inputRefs={inputRefs}
            onShowHistory={onShowHistory}
            calificacionId={calificacion?.id}
            tipoCampo="examenTrimestral"
            campoLabel="Examen"
          />
        </td>
      )}
      {config.tieneExamen && (
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promExBg} text-sm sm:text-base`}>
          {promExPeso !== null ? formatNumber(promExPeso) : "-"}
        </td>
      )}
      <td className={`p-1 border-l ${cellBorder}`}>
        <NotaInput
          value={recup ?? ""}
          onChange={handleRecup}
          darkMode={darkMode}
          hasError={recupError}
          onBlur={() => blurRecup(recup)}
          onNavigate={handleNavigate('recup')}
          inputKey={`${estudiante.id}-${getColIndex('recup')}`}
          inputRefs={inputRefs}
          onShowHistory={onShowHistory}
          calificacionId={calificacion?.id}
          tipoCampo="recuperacion"
          campoLabel="Recuperación"
        />
      </td>
      <td className={`p-2 text-center border-l ${cellBorder} ${finalBg}`}>
        <span className={`inline-block px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow ${finalBadgeClass}`}>
          {promFinal !== null ? (promedioDecimal ? formatNumber(promFinal, true) : Math.round(promFinal).toString()) : "-"}
        </span>
      </td>
      <td className={`p-2 border-l ${cellBorder} text-center`}>{statusIcon}</td>
    </tr>
  );
});

export default CalificacionRow;