"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import {
  Clock,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  ArrowRightLeft,
  CalendarDays,
} from "lucide-react";

interface HistorialEntry {
  id: string;
  calificacionId: string;
  usuarioId: string;
  usuarioNombre: string;
  tipoCampo: string;
  valorAnterior: number | null;
  valorNuevo: number | null;
  descripcion: string;
  estudianteNombre?: string;
  materiaNombre?: string;
  trimestre?: number;
  createdAt: string;
}

interface HistorialCalificacionPopupProps {
  calificacionId: string;
  tipoCampo: string;
  campoLabel: string;
  darkMode: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

function formatValor(valor: number | null): string {
  if (valor === null || valor === undefined) return "—";
  return Number.isInteger(valor) ? valor.toString() : valor.toFixed(2);
}

function formatFecha(fecha: string): string {
  const d = new Date(fecha);
  return d.toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFechaRelativa(fecha: string): string {
  const ahora = new Date();
  const cambio = new Date(fecha);
  const diffMs = ahora.getTime() - cambio.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Ahora mismo";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHoras < 24) return `Hace ${diffHoras}h`;
  if (diffDias < 7) return `Hace ${diffDias} día${diffDias > 1 ? "s" : ""}`;
  return formatFecha(fecha);
}

export function HistorialCalificacionPopup({
  calificacionId,
  tipoCampo,
  campoLabel,
  darkMode,
  onClose,
  anchorRef,
}: HistorialCalificacionPopupProps) {
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [valorActual, setValorActual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState<{
    top: number | string;
    left: number | string;
    transform?: string;
  }>({
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  });

  useLayoutEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popupWidth = 300;
      const popupHeight = 400;
      // Posicionar a la derecha de la celda (menu contextual)
      let left = rect.right + 8;
      let top = rect.top;
      // Si no cabe a la derecha, mostrar a la izquierda
      if (left + popupWidth > window.innerWidth - 8) {
        left = rect.left - popupWidth - 8;
      }
      // Ajustar verticalmente si se sale de la pantalla
      if (top + popupHeight > window.innerHeight - 8) {
        top = window.innerHeight - popupHeight - 8;
      }
      if (top < 8) top = 8;
      setPosition({ top, left });
    } else {
      setPosition({ top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
    }
  }, [anchorRef]);

  useEffect(() => {
    let cancelled = false;

    const fetchHistorial = async () => {
      if (!calificacionId || calificacionId === "undefined" || calificacionId === "null") {
        if (!cancelled) {
          setLoading(false);
          setError("No hay historial disponible: la calificación aún no ha sido guardada.");
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
      try {
        const params = new URLSearchParams({ calificacionId, tipoCampo });
        const res = await fetch(`/api/historial-calificaciones?${params}`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const list: HistorialEntry[] = data.historial || [];
          setHistorial(list);
          setValorActual(data.valorActual ?? null);
          setIndex(list.length > 0 ? 0 : -1);
        } else {
          let errText = "Error al cargar el historial";
          try {
            const errData = await res.json();
            errText = errData.details || errData.error || errText;
          } catch { /* ignore */ }
          setError(errText);
        }
      } catch {
        if (!cancelled) setError("Error de conexión");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistorial();

    return () => { cancelled = true; };
  }, [calificacionId, tipoCampo]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev < historial.length - 1 ? prev + 1 : prev));
  }, [historial.length]);

  const goNext = useCallback(() => {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const current = index >= 0 && index < historial.length ? historial[index] : null;
  const total = historial.length;
  const posLabel = total > 0 ? `${index + 1} / ${total}` : "0 / 0";

  return (
    <div
      className={`fixed z-50 rounded-xl shadow-2xl border overflow-hidden flex flex-col ${
        darkMode
          ? "bg-[#121923] border-slate-600 text-white"
          : "bg-white border-slate-200 text-slate-900"
      }`}
      style={{
        width: 300,
        maxHeight: "min(400px, calc(100vh - 32px))",
        top: position.top,
        left: position.left,
        transform: position.transform,
      }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          darkMode ? "border-slate-600 bg-slate-800/80" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-lg ${
              darkMode ? "bg-emerald-900/40" : "bg-emerald-50"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">
              Historial
            </span>
            <span
              className={`text-[10px] leading-tight ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {campoLabel}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            darkMode
              ? "hover:bg-slate-700 text-slate-400 hover:text-white"
              : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Valor actual */}
      {valorActual !== null && (
        <div className={`px-4 py-2 border-b flex items-center justify-center gap-2 ${darkMode ? "border-slate-600 bg-slate-800/40" : "border-slate-200 bg-slate-50/60"}`}>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Valor actual
          </span>
          <span className={`inline-flex items-center justify-center min-w-[48px] px-2.5 py-0.5 rounded-md text-sm font-bold font-mono ${darkMode ? "bg-emerald-900/30 text-emerald-400 ring-1 ring-emerald-700/40" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>
            {formatValor(valorActual)}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-7 w-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p
              className={`text-xs ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Cargando historial...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 px-6">
            <Trash2 className="h-6 w-6 text-red-400" />
            <p className="text-sm text-red-500 text-center">{error}</p>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 px-6">
            <Clock className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p
              className={`text-sm text-center ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              No hay cambios registrados para esta celda
            </p>
          </div>
        ) : current ? (
          <div className="p-4 space-y-4">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={goPrev}
                disabled={index >= total - 1}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  darkMode
                    ? "bg-slate-700 hover:bg-slate-600 text-slate-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title="Más antiguo"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Ant.
              </button>

              <div className="flex flex-col items-center">
                <span
                  className={`text-[10px] font-semibold tracking-wider uppercase ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Registro
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {posLabel}
                </span>
              </div>

              <button
                onClick={goNext}
                disabled={index <= 0}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  darkMode
                    ? "bg-slate-700 hover:bg-slate-600 text-slate-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title="Más reciente"
              >
                Sig.
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Dots timeline */}
            <div className="flex items-center justify-center gap-1">
              {historial.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index
                      ? "w-5 bg-emerald-500"
                      : darkMode
                      ? "w-2 bg-slate-600 hover:bg-slate-500"
                      : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  title={`Registro ${i + 1}`}
                />
              ))}
            </div>

            {/* Main entry card */}
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                darkMode
                  ? "bg-slate-800/60 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              {/* User & time */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      darkMode
                        ? "bg-emerald-900/40 text-emerald-300"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {current.usuarioNombre
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {current.usuarioNombre}
                    </p>
                    <div className="flex items-center gap-1 text-[10px]">
                      <CalendarDays className="h-3 w-3" />
                      <span className={darkMode ? "text-slate-400" : "text-slate-500"}>
                        {formatFecha(current.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    darkMode
                      ? "bg-slate-700 text-slate-300"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {formatFechaRelativa(current.createdAt)}
                </span>
              </div>

              {/* Divider */}
              <div
                className={`h-px ${
                  darkMode ? "bg-slate-700" : "bg-slate-200"
                }`}
              />

              {/* Values transition */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider ${
                      darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Anterior
                  </span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[56px] px-3 py-1.5 rounded-lg text-sm font-bold font-mono ${
                      current.valorAnterior === null
                        ? darkMode
                          ? "bg-slate-700 text-slate-400"
                          : "bg-slate-200 text-slate-400"
                        : darkMode
                        ? "bg-rose-900/30 text-rose-300 ring-1 ring-rose-700/50"
                        : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                    }`}
                  >
                    {formatValor(current.valorAnterior)}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    darkMode
                      ? "bg-emerald-900/30 text-emerald-400"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider ${
                      darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Nuevo
                  </span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[56px] px-3 py-1.5 rounded-lg text-sm font-bold font-mono ${
                      current.valorNuevo === null
                        ? darkMode
                          ? "bg-slate-700 text-slate-400"
                          : "bg-slate-200 text-slate-400"
                        : darkMode
                        ? "bg-emerald-900/30 text-emerald-300 ring-1 ring-emerald-700/50"
                        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    }`}
                  >
                    {formatValor(current.valorNuevo)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {current.descripcion && (
                <div
                  className={`text-center text-xs px-3 py-2 rounded-lg ${
                    darkMode
                      ? "bg-slate-900/40 text-slate-300"
                      : "bg-white text-slate-600 border border-slate-100"
                  }`}
                >
                  {current.descripcion}
                </div>
              )}
            </div>

            {/* Compact list preview */}
            <div className="space-y-1.5">
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  darkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Resumen ({total} registro{total !== 1 ? "s" : ""})
              </p>
              <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                {historial.map((entry, i) => (
                  <button
                    key={entry.id}
                    onClick={() => setIndex(i)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs ${
                      i === index
                        ? darkMode
                          ? "bg-emerald-900/20 text-emerald-300 ring-1 ring-emerald-700/40"
                          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : darkMode
                        ? "hover:bg-slate-700/50 text-slate-300"
                        : "hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === index
                          ? darkMode
                            ? "bg-emerald-700 text-white"
                            : "bg-emerald-600 text-white"
                          : darkMode
                          ? "bg-slate-700 text-slate-400"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">
                      {entry.usuarioNombre.split(" ").slice(0, 2).join(" ")}
                    </span>
                    <span
                      className={`flex-shrink-0 font-mono text-[10px] ${
                        darkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {formatValor(entry.valorAnterior)} →{" "}
                      {formatValor(entry.valorNuevo)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      {total > 0 && (
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-between ${
            darkMode
              ? "border-slate-600 bg-slate-800/80 text-slate-400"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3" />
            <span className="text-[10px]">
              {current?.usuarioNombre || "—"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="text-[10px]">
              {current ? formatFechaRelativa(current.createdAt) : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistorialCalificacionPopup;
