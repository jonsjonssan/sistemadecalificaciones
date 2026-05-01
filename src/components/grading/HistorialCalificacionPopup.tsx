"use client";

import React, { useState, useEffect } from "react";
import { Clock, User, ArrowRight, X } from "lucide-react";

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
  if (valor === null || valor === undefined) return "vacío";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistorial = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          calificacionId,
          tipoCampo,
        });
        const res = await fetch(`/api/historial-calificaciones?${params}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setHistorial(data.historial || []);
        } else {
          setError("Error al cargar el historial");
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [calificacionId, tipoCampo]);

  return (
    <div
      className={`fixed z-50 rounded-lg shadow-2xl border overflow-hidden w-80 sm:w-96 max-h-[70vh] flex flex-col ${
        darkMode
          ? "bg-[#1e293b] border-slate-600 text-white"
          : "bg-white border-slate-200 text-slate-900"
      }`}
      style={{
        top: anchorRef?.current
          ? Math.min(
              anchorRef.current.getBoundingClientRect().bottom + 8,
              window.innerHeight - 300
            )
          : "50%",
        left: anchorRef?.current
          ? Math.min(
              anchorRef.current.getBoundingClientRect().left,
              window.innerWidth - 400
            )
          : "50%",
        transform: !anchorRef?.current ? "translate(-50%, -50%)" : undefined,
      }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          darkMode ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-teal-500" />
          <span className="text-sm font-semibold">
            Historial - {campoLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
            darkMode ? "hover:bg-slate-700" : ""
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-4 text-center">
            <div className="inline-block h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-xs mt-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Cargando historial...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : historial.length === 0 ? (
          <div className="p-4 text-center">
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              No hay cambios registrados para esta celda
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {historial.map((entry, index) => (
              <div
                key={entry.id}
                className={`px-4 py-3 ${
                  index === 0
                    ? darkMode
                      ? "bg-teal-900/20"
                      : "bg-teal-50"
                    : ""
                }`}
              >
                {/* Usuario y fecha */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-teal-500" />
                    <span className="text-xs font-medium">{entry.usuarioNombre}</span>
                  </div>
                  <span
                    className={`text-[10px] ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                    title={formatFecha(entry.createdAt)}
                  >
                    {formatFechaRelativa(entry.createdAt)}
                  </span>
                </div>

                {/* Cambio de valores */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${
                      entry.valorAnterior === null
                        ? darkMode
                          ? "bg-slate-700 text-slate-400"
                          : "bg-slate-100 text-slate-400"
                        : darkMode
                        ? "bg-rose-900/40 text-rose-300"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {formatValor(entry.valorAnterior)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${
                      entry.valorNuevo === null
                        ? darkMode
                          ? "bg-slate-700 text-slate-400"
                          : "bg-slate-100 text-slate-400"
                        : darkMode
                        ? "bg-emerald-900/40 text-emerald-300"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {formatValor(entry.valorNuevo)}
                  </span>
                </div>

                {/* Descripción */}
                {entry.descripcion && (
                  <p
                    className={`text-[10px] mt-1.5 ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {entry.descripcion}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {historial.length > 0 && (
        <div
          className={`px-4 py-2 border-t text-center text-[10px] ${
            darkMode
              ? "border-slate-600 bg-slate-800 text-slate-400"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {historial.length} cambio{historial.length !== 1 ? "s" : ""} registrado{historial.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

export default HistorialCalificacionPopup;
