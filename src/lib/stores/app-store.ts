import { create } from "zustand";

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

interface Umbrales {
  umbralRecuperacion: number;
  umbralCondicionado: number;
  umbralAprobado: number;
  notaMinima: number;
  notaMaxima: number;
  maxHistorialCelda: number;
  usarIntervaloReprobado: boolean;
  usarIntervaloCondicionado: boolean;
  usarIntervaloAprobado: boolean;
}

interface UIState {
  activeTab: string;
  darkMode: boolean;
  gradoSeleccionado: string;
  asignaturaSeleccionada: string;
  trimestreSeleccionado: string;
  busquedaEstudiante: string;
  filtroEstado: string;
  mostrarRecuperacion: boolean;
  promedioDecimal: boolean;
  paperSize: "letter" | "a4";
}

interface AppState {
  // Auth
  usuario: Usuario | null;
  loading: boolean;
  setUsuario: (usuario: Usuario | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;

  // UI State
  ui: UIState;
  setActiveTab: (tab: string) => void;
  setDarkMode: (dark: boolean) => void;
  setGradoSeleccionado: (gradoId: string) => void;
  setAsignaturaSeleccionada: (materiaId: string) => void;
  setTrimestreSeleccionado: (trimestre: string) => void;
  setBusquedaEstudiante: (q: string) => void;
  setFiltroEstado: (f: string) => void;

  // Umbrales
  umbrales: Umbrales;
  setUmbrales: (u: Partial<Umbrales>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
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

  // UI State
  ui: {
    activeTab: "dashboard",
    darkMode: false,
    gradoSeleccionado: "",
    asignaturaSeleccionada: "",
    trimestreSeleccionado: "",
    busquedaEstudiante: "",
    filtroEstado: "todos",
    mostrarRecuperacion: true,
    promedioDecimal: false,
    paperSize: "letter",
  },
  setActiveTab: (tab) => set((s) => ({ ui: { ...s.ui, activeTab: tab } })),
  setDarkMode: (dark) => set((s) => ({ ui: { ...s.ui, darkMode: dark } })),
  setGradoSeleccionado: (gradoId) => set((s) => ({ ui: { ...s.ui, gradoSeleccionado: gradoId } })),
  setAsignaturaSeleccionada: (materiaId) => set((s) => ({ ui: { ...s.ui, asignaturaSeleccionada: materiaId } })),
  setTrimestreSeleccionado: (trimestre) => set((s) => ({ ui: { ...s.ui, trimestreSeleccionado: trimestre } })),
  setBusquedaEstudiante: (q) => set((s) => ({ ui: { ...s.ui, busquedaEstudiante: q } })),
  setFiltroEstado: (f) => set((s) => ({ ui: { ...s.ui, filtroEstado: f } })),

  // Umbrales
  umbrales: {
    umbralRecuperacion: 5.0,
    umbralCondicionado: 4.5,
    umbralAprobado: 6.5,
    notaMinima: 0.0,
    notaMaxima: 10.0,
    maxHistorialCelda: 10,
    usarIntervaloReprobado: true,
    usarIntervaloCondicionado: true,
    usarIntervaloAprobado: true,
  },
  setUmbrales: (u) => set((s) => ({ umbrales: { ...s.umbrales, ...u } })),
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
