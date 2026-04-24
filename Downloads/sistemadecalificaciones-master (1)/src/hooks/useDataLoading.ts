import { useState, useCallback } from "react";
import { Grado, Estudiante, Asignatura, AsignaturaConGrado, Calificacion, ConfigActividad, ConfigActividadPartial, ConfiguracionSistema, Usuario } from "@/types";

interface UseDataLoadingReturn {
  grados: Grado[];
  setGrados: (g: Grado[]) => void;
  estudiantes: Estudiante[];
  setEstudiantes: (e: Estudiante[]) => void;
  asignaturas: Asignatura[];
  setAsignaturas: (a: Asignatura[]) => void;
  todasAsignaturas: AsignaturaConGrado[];
  setTodasAsignaturas: (a: AsignaturaConGrado[]) => void;
  calificaciones: Calificacion[];
  setCalificaciones: (c: Calificacion[]) => void;
  configActual: ConfigActividadPartial | null;
  setConfigActual: (c: ConfigActividadPartial | null) => void;
  configsGrado: ConfigActividad[];
  setConfigsGrado: (c: ConfigActividad[]) => void;
  usuarios: Usuario[];
  setUsuarios: (u: Usuario[]) => void;
  configuracion: ConfiguracionSistema | null;
  setConfiguracion: (c: ConfiguracionSistema | null) => void;
  promedioAsignatura: number | null;
  setPromedioAsignatura: (p: number | null) => void;
  promedioGrado: number | null;
  setPromedioGrado: (p: number | null) => void;
  loadGrados: () => Promise<void>;
  loadEstudiantes: (gradoId: string) => Promise<void>;
  loadAsignaturas: (gradoId: string) => Promise<void>;
  loadTodasAsignaturas: () => Promise<void>;
  loadConfig: (materiaId: string, trimestre: string) => Promise<void>;
  loadConfigsGrado: (gradoId: string, trimestre: string) => Promise<void>;
  loadCalificaciones: (gradoId: string, materiaId: string, trimestre: string) => Promise<void>;
  loadPromedioGrado: (gradoId: string, trimestre: string) => Promise<void>;
  loadUsuarios: () => Promise<void>;
  loadConfiguracion: () => Promise<void>;
}

export function useDataLoading(): UseDataLoadingReturn {
  const [grados, setGrados] = useState<Grado[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [todasAsignaturas, setTodasAsignaturas] = useState<AsignaturaConGrado[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [configActual, setConfigActual] = useState<ConfigActividadPartial | null>(null);
  const [configsGrado, setConfigsGrado] = useState<ConfigActividad[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [configuracion, setConfiguracion] = useState<ConfiguracionSistema | null>(null);
  const [promedioAsignatura, setPromedioAsignatura] = useState<number | null>(null);
  const [promedioGrado, setPromedioGrado] = useState<number | null>(null);

  const loadGrados = useCallback(async () => {
    try {
      const res = await fetch("/api/grados", { cache: "no-store", credentials: "include" });
      if (res.ok) setGrados(await res.json());
      else setGrados([]);
    } catch {
      setGrados([]);
    }
  }, []);

  const loadEstudiantes = useCallback(async (gradoId: string) => {
    if (!gradoId) return;
    try {
      const res = await fetch(`/api/estudiantes?gradoId=${gradoId}`, { cache: "no-store", credentials: "include" });
      if (res.ok) setEstudiantes(await res.json());
      else setEstudiantes([]);
    } catch {
      setEstudiantes([]);
    }
  }, []);

  const loadAsignaturas = useCallback(async (gradoId: string) => {
    if (!gradoId) return;
    try {
      const res = await fetch(`/api/materias?gradoId=${gradoId}`, { cache: "no-store", credentials: "include" });
      if (res.ok) setAsignaturas(await res.json());
      else setAsignaturas([]);
    } catch {
      setAsignaturas([]);
    }
  }, []);

  const loadTodasAsignaturas = useCallback(async () => {
    try {
      const res = await fetch("/api/materias?todas=true", { cache: "no-store", credentials: "include" });
      setTodasAsignaturas(await res.json());
    } catch {}
  }, []);

  const loadConfig = useCallback(
    async (materiaId: string, trimestre: string) => {
      if (!materiaId || !trimestre) return;
      try {
        const res = await fetch(
          `/api/config-actividades?materiaId=${materiaId}&trimestre=${trimestre}`,
          { cache: "no-store", credentials: "include" }
        );
        if (res.ok) setConfigActual(await res.json());
        else
          setConfigActual({
            numActividadesCotidianas: 4,
            numActividadesIntegradoras: 1,
            tieneExamen: true,
            porcentajeAC: 35,
            porcentajeAI: 35,
            porcentajeExamen: 30,
          });
      } catch {
        setConfigActual({
          numActividadesCotidianas: 4,
          numActividadesIntegradoras: 1,
          tieneExamen: true,
          porcentajeAC: 35,
          porcentajeAI: 35,
          porcentajeExamen: 30,
        });
      }
    },
    []
  );

  const loadConfigsGrado = useCallback(async (gradoId: string, trimestre: string) => {
    if (!gradoId || !trimestre) return;
    try {
      const res = await fetch(
        `/api/config-actividades?gradoId=${gradoId}&trimestre=${trimestre}`,
        { cache: "no-store", credentials: "include" }
      );
      if (res.ok) setConfigsGrado(await res.json());
    } catch {
      setConfigsGrado([]);
    }
  }, []);

  const loadCalificaciones = useCallback(
    async (gradoId: string, materiaId: string, trimestre: string) => {
      if (!gradoId || !materiaId || !trimestre) return;
      try {
        const res = await fetch(
          `/api/calificaciones?gradoId=${gradoId}&materiaId=${materiaId}&trimestre=${trimestre}`,
          { cache: "no-store", credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setCalificaciones(data);
          const promsFinalesValidos = data
            .filter((c: Calificacion) => c.promedioFinal !== null)
            .map((c: Calificacion) => c.promedioFinal);
          if (promsFinalesValidos.length > 0) {
            const suma = promsFinalesValidos.reduce(
              (a: number, b: number) => a + b,
              0
            );
            setPromedioAsignatura(
              Math.round((suma / promsFinalesValidos.length) * 100) / 100
            );
          } else {
            setPromedioAsignatura(null);
          }
        } else {
          setCalificaciones([]);
          setPromedioAsignatura(null);
        }
      } catch {
        setCalificaciones([]);
        setPromedioAsignatura(null);
      }
    },
    []
  );

  const loadPromedioGrado = useCallback(async (gradoId: string, trimestre: string) => {
    if (!gradoId || !trimestre) return;
    try {
      const res = await fetch(
        `/api/calificaciones/promedio-grado?gradoId=${gradoId}&trimestre=${trimestre}`,
        { cache: "no-store", credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setPromedioGrado(data.promedio);
      } else {
        setPromedioGrado(null);
      }
    } catch {
      setPromedioGrado(null);
    }
  }, []);

  const loadUsuarios = useCallback(async () => {
    try {
      const res = await fetch("/api/usuarios", { cache: "no-store", credentials: "include" });
      if (res.ok) setUsuarios(await res.json());
    } catch {}
  }, []);

  const loadConfiguracion = useCallback(async () => {
    try {
      const res = await fetch("/api/configuracion", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConfiguracion(data);
      }
    } catch {}
  }, []);

  return {
    grados,
    setGrados,
    estudiantes,
    setEstudiantes,
    asignaturas,
    setAsignaturas,
    todasAsignaturas,
    setTodasAsignaturas,
    calificaciones,
    setCalificaciones,
    configActual,
    setConfigActual,
    configsGrado,
    setConfigsGrado,
    usuarios,
    setUsuarios,
    configuracion,
    setConfiguracion,
    promedioAsignatura,
    setPromedioAsignatura,
    promedioGrado,
    setPromedioGrado,
    loadGrados,
    loadEstudiantes,
    loadAsignaturas,
    loadTodasAsignaturas,
    loadConfig,
    loadConfigsGrado,
    loadCalificaciones,
    loadPromedioGrado,
    loadUsuarios,
    loadConfiguracion,
  };
}