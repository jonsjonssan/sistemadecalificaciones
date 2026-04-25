import { useState, useCallback } from "react";
import { Calificacion, ConfigActividadPartial } from "@/types";

interface UseGradingReturn {
  saving: boolean;
  setSaving: (s: boolean) => void;
  handleSaveCalificacion: (
    estId: string,
    matId: string,
    trimestre: number,
    data: {
      actividadesCotidianas: (number | null)[];
      actividadesIntegradoras: (number | null)[];
      examenTrimestral: number | null;
      recuperacion: number | null;
    }
  ) => Promise<Calificacion>;
  handleSaveConfig: (
    materiaId: string,
    trimestre: number,
    config: ConfigActividadPartial
  ) => Promise<void>;
  handleDeleteCalif: (
    tipo: "alumno" | "grado",
    estudianteId?: string,
    gradoId?: string
  ) => Promise<void>;
}

/** Reintentar una función async con delay exponencial */
async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

export function useGrading(): UseGradingReturn {
  const [saving, setSaving] = useState(false);

  const handleSaveCalificacion = useCallback(
    async (
      estId: string,
      matId: string,
      trimestre: number,
      data: {
        actividadesCotidianas: (number | null)[];
        actividadesIntegradoras: (number | null)[];
        examenTrimestral: number | null;
        recuperacion: number | null;
      }
    ): Promise<Calificacion> => {
      setSaving(true);
      try {
        return await retry(async () => {
          const res = await fetch("/api/calificaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              estudianteId: estId,
              materiaId: matId,
              trimestre,
              actividadesCotidianas: JSON.stringify(data.actividadesCotidianas),
              actividadesIntegradoras: JSON.stringify(data.actividadesIntegradoras),
              examenTrimestral: data.examenTrimestral,
              recuperacion: data.recuperacion,
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `HTTP ${res.status}`);
          }
          return res.json() as Promise<Calificacion>;
        }, 3, 800);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleSaveConfig = useCallback(
    async (materiaId: string, trimestre: number, config: ConfigActividadPartial) => {
      setSaving(true);
      try {
        await retry(async () => {
          const res = await fetch("/api/config-actividades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              materiaId,
              trimestre,
              numActividadesCotidianas: config.numActividadesCotidianas,
              numActividadesIntegradoras: config.numActividadesIntegradoras,
              tieneExamen: config.tieneExamen,
              porcentajeAC: config.porcentajeAC,
              porcentajeAI: config.porcentajeAI,
              porcentajeExamen: config.porcentajeExamen,
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `HTTP ${res.status}`);
          }
        }, 3, 800);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleDeleteCalif = useCallback(
    async (
      tipo: "alumno" | "grado",
      estudianteId?: string,
      gradoId?: string
    ) => {
      setSaving(true);
      try {
        const params = new URLSearchParams();
        if (tipo === "alumno" && estudianteId) params.set("estudianteId", estudianteId);
        if (tipo === "grado" && gradoId) params.set("gradoId", gradoId);

        const res = await fetch(`/api/calificaciones?${params}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    saving,
    setSaving,
    handleSaveCalificacion,
    handleSaveConfig,
    handleDeleteCalif,
  };
}
