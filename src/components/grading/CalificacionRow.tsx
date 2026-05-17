"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Estudiante, Calificacion, ConfigActividadPartial } from "@/types";
import { calcularPromedio, calcularPromedioFinal, parseNotas, getEstadoCompletitud } from "@/utils/gradeCalculations";
import { RefreshCw, History, AlertTriangle, Check, AlertCircle, Trash2 } from "lucide-react";
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
  onDirtyChange?: (studentId: string, isDirty: boolean) => void;
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
  activeHistoryCell?: { calificacionId: string; tipoCampo: string } | null;
  umbralCondicionado?: number;
  umbralAprobado?: number;
  mostrarRecuperacion?: boolean;
}

function NotaInput({ value, onChange, darkMode, hasError, onBlur, onNavigate, inputKey, inputRefs, onShowHistory, calificacionId, tipoCampo, campoLabel, activeHistoryCell }: {
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
  activeHistoryCell?: { calificacionId: string; tipoCampo: string } | null;
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
  const isEditingRef = useRef(false);

  // Sincronizar rawValue cuando el valor externo cambie (e.g., carga de datos)
  useEffect(() => {
    const newVal = value === null || value === undefined ? "" : String(value);
    // Solo actualizar si el usuario no está editando activamente (evita sobrescribir mientras escribe)
    if (!isEditingRef.current) {
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
    isEditingRef.current = true;
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
    isEditingRef.current = false;
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

  const isActive = activeHistoryCell
    ? activeHistoryCell.calificacionId === calificacionId && activeHistoryCell.tipoCampo === tipoCampo
    : false;

  return (
    <div
      ref={cellRef}
      suppressHydrationWarning
      onContextMenu={handleContextMenu}
      className={`relative group ${onShowHistory ? "cursor-pointer" : ""}`}
      title={onShowHistory ? "Clic derecho para ver historial" : undefined}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={rawValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`grade-input w-full text-center border rounded px-0.5 transition-all ${darkMode
          ? "bg-slate-700 border-slate-600 text-emerald-200 placeholder-slate-500"
          : "bg-white border-slate-300 text-slate-900"
          } ${hasError ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""} focus:ring-emerald-500 focus:border-emerald-500 ${
            isActive
              ? darkMode
                ? "ring-2 ring-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(101,203,86,0.4)]"
                : "ring-2 ring-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(101,203,86,0.3)]"
              : ""
          }`}
        placeholder="-"
        maxLength={6}
        suppressHydrationWarning
      />
      {/* Indicador de historial — punto sutil permanente, mas visible en hover */}
      {onShowHistory && calificacionId && (
        <>
          <div className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full transition-opacity duration-200 ${
            isActive
              ? "bg-emerald-400 opacity-100"
              : "bg-emerald-500 opacity-40 group-hover:opacity-100"
          }`} />
          {/* Tooltip mini al hacer hover */}
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className={`px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap ${darkMode ? "bg-slate-600 text-emerald-400" : "bg-white text-emerald-700 border border-emerald-200 shadow-sm"}`}>
              Historial
            </div>
          </div>
        </>
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
  onDirtyChange,
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
  activeHistoryCell,
  umbralCondicionado = 4.50,
  umbralAprobado = 6.50,
  mostrarRecuperacion = true,
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
  const scheduleRetryRef = useRef<(() => void) | null>(null);
  const lastSavedAtRef = useRef<number>(0);

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

      // Proteccion contra lag de replica de BD: si acabamos de guardar exitosamente
      // y la prop entrante viene vacia mientras el estado local tiene datos,
      // ignoramos la sincronizacion durante 5 segundos para evitar que el polling
      // sobrescriba el valor recien guardado antes de que se replique.
      const localHasData = acNotas.some(n => n !== null) || aiNotas.some(n => n !== null) || examen !== null || recup !== null;
      const incomingHasData = newAC.some(n => n !== null) || newAI.some(n => n !== null) || newEx !== null || newRc !== null;
      if (localHasData && !incomingHasData && Date.now() - lastSavedAtRef.current < 5000) {
        return;
      }

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
  const recupEfectiva = mostrarRecuperacion ? recup : null;
  const promFinal = config
    ? calcularPromedioFinal(promAC, promAI, examen, config, recupEfectiva)
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
      setExamen(prev => {
        if (prev !== newVal) {
          setDirty(true);
        }
        return newVal;
      });
      if (v !== "") setExamenError(false);
    },
    [parseVal]
  );
  const handleRecup = useCallback(
    (v: string) => {
      const newVal = parseVal(v);
      setRecup(prev => {
        if (prev !== newVal) {
          setDirty(true);
        }
        return newVal;
      });
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
      lastSavedAtRef.current = Date.now();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    } catch {
      setSaveError(true);
      scheduleRetryRef.current?.();
    } finally {
      savingRef.current = false;
    }
  }, [estudiante.id, materiaId, onSave, numAC, numAI]);

  useEffect(() => {
    scheduleRetryRef.current = () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      const delay = Math.min(2000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        doSave();
      }, delay);
    };
  }, [doSave]);

  // Notificar al padre cuando cambia el estado dirty (para advertencia al cambiar pestaña)
  useEffect(() => {
    onDirtyChange?.(estudiante.id, dirty);
  }, [dirty, estudiante.id, onDirtyChange]);

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
      ? "bg-[#0E1726] hover:bg-slate-700/80"
      : "bg-white hover:bg-slate-50"
    : darkMode
      ? "bg-[#1A2331] hover:bg-slate-700/80"
      : "bg-slate-50/50 hover:bg-slate-100";
  const cellBorder = darkMode ? "border-slate-600/60" : "border-slate-200";
  const stickyBg = evenRow
    ? darkMode
      ? "bg-[#0E1726]"
      : "bg-white"
    : darkMode
      ? "bg-[#1A2331]"
      : "bg-slate-50/50";
  const promACBg = darkMode ? "bg-blue-900/50" : "bg-blue-50/70";
  const promAIBg = darkMode ? "bg-purple-900/50" : "bg-purple-50/70";
  const promExBg = darkMode ? "bg-amber-900/50" : "bg-amber-50/70";
  const finalBg = darkMode ? "bg-emerald-900/60" : "bg-emerald-50/80";
  const hasData = acNotas.some(n => n !== null) || aiNotas.some(n => n !== null) || examen !== null;
  const estadoCompletitud = useMemo(() => getEstadoCompletitud(calificacion, config), [calificacion, config]);
const statusIcon =
    saveError ? (
      <span title="Error al guardar. Se reintentará automáticamente.">
        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mx-auto" />
      </span>
    ) : saving && dirty ? (
      <span title="Guardando...">
        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 animate-spin mx-auto" />
      </span>
    ) : !dirty && hasData ? (
      <span title="Guardado">
        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 mx-auto" />
      </span>
    ) : (
      <span className={`text-xs ${darkMode ? "text-slate-600" : "text-slate-300"}`}>-</span>
    );
  const finalBadgeClass =
    promFinal !== null
      ? promFinal >= umbralAprobado
        ? darkMode
          ? "bg-emerald-900/60 text-emerald-200 ring-1 ring-emerald-600"
          : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
        : promFinal >= umbralCondicionado
          ? darkMode
            ? "bg-amber-900/60 text-amber-200 ring-1 ring-amber-600"
            : "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
          : darkMode
            ? "bg-red-900/60 text-red-200 ring-1 ring-red-600"
            : "bg-red-100 text-red-800 ring-1 ring-red-300"
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
          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 flex-shrink-0 align-middle ${
            estadoCompletitud === 'completo'
              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
              : estadoCompletitud === 'parcial'
                ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                : 'bg-slate-300 dark:bg-slate-600'
          }`} title={estadoCompletitud === 'completo' ? 'Completo' : estadoCompletitud === 'parcial' ? 'Incompleto' : 'Sin datos'} />
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
              activeHistoryCell={activeHistoryCell}
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
              activeHistoryCell={activeHistoryCell}
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
              activeHistoryCell={activeHistoryCell}
            />
          </td>
        )}
        {tieneExamen && (
          <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promExBg} text-sm sm:text-base`}>
            {promExPeso !== null ? formatNumber(promExPeso) : "-"}
          </td>
        )}
        {mostrarRecuperacion && (
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
              activeHistoryCell={activeHistoryCell}
            />
        </td>
        )}
        <td className={`p-2 text-center border-l ${cellBorder} ${finalBg}`}>
          <span className={`inline-block px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow ${finalBadgeClass}`}>
            {promFinal !== null ? (promedioDecimal ? formatNumber(promFinal, true) : Math.round(promFinal).toString()) : "-"}
            {promFinal !== null && recup !== null && mostrarRecuperacion && (
              <span className="ml-0.5 text-[10px] opacity-70" title={`Recuperación: ${formatNumber(recup)}`}>†</span>
            )}
          </span>
        </td>
        <td className={`p-2 border-l ${cellBorder} text-center`}>{statusIcon}</td>
        {isAdmin && onBorrar && (
          <td className={`p-1 border-l ${cellBorder} text-center`}>
            <button
              onClick={() => onBorrar(estudiante.id)}
              title="Borrar calificaciones de este alumno"
              className="text-red-500 hover:text-red-700 p-2 rounded-md"
            >
              <Trash2 className="h-4 w-4" />
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
        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 flex-shrink-0 align-middle ${
          estadoCompletitud === 'completo'
            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
            : estadoCompletitud === 'parcial'
              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
              : 'bg-slate-300 dark:bg-slate-600'
        }`} title={estadoCompletitud === 'completo' ? 'Completo' : estadoCompletitud === 'parcial' ? 'Incompleto' : 'Sin datos'} />
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
            activeHistoryCell={activeHistoryCell}
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
            activeHistoryCell={activeHistoryCell}
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
            activeHistoryCell={activeHistoryCell}
          />
        </td>
      )}
      {config.tieneExamen && (
        <td className={`p-2 text-center font-bold border-l ${cellBorder} ${promExBg} text-sm sm:text-base`}>
          {promExPeso !== null ? formatNumber(promExPeso) : "-"}
        </td>
      )}
      {mostrarRecuperacion && (
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
          activeHistoryCell={activeHistoryCell}
        />
      </td>
      )}
      <td className={`p-2 text-center border-l ${cellBorder} ${finalBg}`}>
        <span className={`inline-block px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold shadow ${finalBadgeClass}`}>
          {promFinal !== null ? (promedioDecimal ? formatNumber(promFinal, true) : Math.round(promFinal).toString()) : "-"}
          {promFinal !== null && recup !== null && mostrarRecuperacion && (
            <span className="ml-0.5 text-[10px] opacity-70" title={`Recuperación: ${formatNumber(recup)}`}>†</span>
          )}
        </span>
      </td>
      <td className={`p-2 border-l ${cellBorder} text-center`}>{statusIcon}</td>
    </tr>
  );
});

export default CalificacionRow;