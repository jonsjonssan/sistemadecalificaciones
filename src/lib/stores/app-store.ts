import { create } from "zustand";

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

interface AppState {
  usuario: Usuario | null;
  loading: boolean;
  setUsuario: (usuario: Usuario | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  usuario: null,
  loading: true,
  setUsuario: (usuario) => set({ usuario }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    set({ usuario: null });
  },
  checkAuth: async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      set({ usuario: data.usuario, loading: false });
    } catch {
      set({ usuario: null, loading: false });
    }
  },
}));

// Types para la aplicación
export interface Estudiante {
  id: string;
  numero: number;
  nombre: string;
  gradoId: string;
  activo: boolean;
}

export interface Materia {
  id: string;
  nombre: string;
  gradoId: string;
}

export interface Calificacion {
  id: string;
  estudianteId: string;
  materiaId: string;
  trimestre: number;
  actividadCotidiana1: number | null;
  actividadCotidiana2: number | null;
  actividadCotidiana3: number | null;
  actividadCotidiana4: number | null;
  calificacionAC: number | null;
  actividadIntegradora: number | null;
  calificacionAI: number | null;
  examenTrimestral: number | null;
  calificacionET: number | null;
  promedioFinal: number | null;
  recuperacion: number | null;
  estudiante?: Estudiante;
  materia?: Materia;
}

export interface Grado {
  id: string;
  numero: number;
  seccion: string;
  año: number;
  docenteId: string | null;
  docente?: {
    id: string;
    nombre: string;
    email: string;
  };
  _count?: {
    estudiantes: number;
    materias: number;
  };
}
