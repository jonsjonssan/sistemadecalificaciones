import { useState, useCallback } from "react";
import { Calificacion, ConfigActividadPartial } from "@/types";
import { calcularPromedioFinal } from "@/utils/gradeCalculations";

interface UseGradingReturn {
  saving: boolean;
  setSaving: (s: boolean) => void;
  handleSaveCalificacion: (
    estId: string,
    matId: string,
    data: {
      actividadesCotidianas: (number | null)[];
      actividadesIntegradoras: (number | null)[];
      examenTrimestral: number | null;
      recuperacion: number | null;
    }
  ) => Promise<void>;
  handleSaveConfig: (
    materiaId: string,
    config: ConfigActividadPartial
  ) => Promise<void>;
  handleDeleteCalif: (
    tipo: "alumno" | "grado",
    estudianteId?: string,
    gradoId?: string
  ) => Promise<void>;
}

export function useGrading(): UseGradingReturn {
  const [saving, setSaving] = useState(false);

  const handleSaveCalificacion = useCallback(
    async (
      estId: string,
      matId: string,
      data: {
        actividadesCotidianas: (number | null)[];
        actividadesIntegradoras: (number | null)[];
        examenTrimestral: number | null;
        recuperacion: number | null;
      }
    ) => {
      setSaving(true);
      try {
        const res = await fetch("/api/calificaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            estudianteId: estId,
            materiaId: matId,
            actividadesCotidianas: JSON.stringify(data.actividadesCotidianas),
            actividadesIntegradoras: JSON.stringify(data.actividadesIntegradoras),
            examenTrimestral: data.examenTrimestral,
            recuperacion: data.recuperacion,
          }),
        });
        if (!res.ok) console.error("Error saving calification");
      } catch (e) {
        console.error("Save error:", e);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleSaveConfig = useCallback(
    async (materiaId: string, config: ConfigActividadPartial) => {
      setSaving(true);
      try {
        const res = await fetch("/api/config-actividades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            materiaId,
            trimestre: config.numActividadesCotidianas,
            numActividadesCotidianas: config.numActividadesCotidianas,
            numActividadesIntegradoras: config.numActividadesIntegradoras,
            tieneExamen: config.tieneExamen,
            porcentajeAC: config.porcentajeAC,
            porcentajeAI: config.porcentajeAI,
            porcentajeExamen: config.porcentajeExamen,
          }),
        });
        if (!res.ok) console.error("Error saving config");
      } catch (e) {
        console.error("Save config error:", e);
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
        if (!res.ok) console.error("Error deleting califications");
      } catch (e) {
        console.error("Delete error:", e);
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