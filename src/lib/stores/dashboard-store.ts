"use client";

import { create } from "zustand";
import type { Usuario, UsuarioSesion, Estudiante, Asignatura, AsignaturaConGrado, Calificacion, Grado, ConfigActividad, ConfigActividadPartial, ConfiguracionSistema } from "@/types";

interface UmbralesState {
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

interface DashboardState {
  usuario: UsuarioSesion | null;
  loading: boolean;
  dataLoading: boolean;
  grados: Grado[];
  gradosFiltrados: Grado[];
  asignaturasFiltradas: Asignatura[];
  estudiantes: Estudiante[];
  asignaturas: Asignatura[];
  todasAsignaturas: AsignaturaConGrado[];
  calificaciones: Calificacion[];
  configActual: ConfigActividadPartial | null;
  configsGrado: ConfigActividad[];
  usuarios: any[];
  configuracion: ConfiguracionSistema | null;

  gradoSeleccionado: string;
  trimestreSeleccionado: string;
  asignaturaSeleccionada: string;
  activeTab: string;

  umbrales: UmbralesState;

  setUsuario: (u: UsuarioSesion | null) => void;
  setLoading: (v: boolean) => void;
  setDataLoading: (v: boolean) => void;
  setGrados: (v: Grado[]) => void;
  setGradosFiltrados: (v: Grado[]) => void;
  setAsignaturasFiltradas: (v: Asignatura[]) => void;
  setEstudiantes: (v: Estudiante[]) => void;
  setAsignaturas: (v: Asignatura[]) => void;
  setTodasAsignaturas: (v: AsignaturaConGrado[]) => void;
  setCalificaciones: (v: Calificacion[]) => void;
  setConfigActual: (v: ConfigActividadPartial | null) => void;
  setConfigsGrado: (v: ConfigActividad[]) => void;
  setUsuarios: (v: any[]) => void;
  setConfiguracion: (v: ConfiguracionSistema | null) => void;
  setUmbrales: (v: Partial<UmbralesState>) => void;

  setGradoSeleccionado: (v: string) => void;
  setTrimestreSeleccionado: (v: string) => void;
  setAsignaturaSeleccionada: (v: string) => void;
  setActiveTab: (v: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  usuario: null,
  loading: true,
  dataLoading: false,
  grados: [],
  gradosFiltrados: [],
  asignaturasFiltradas: [],
  estudiantes: [],
  asignaturas: [],
  todasAsignaturas: [],
  calificaciones: [],
  configActual: null,
  configsGrado: [],
  usuarios: [],
  configuracion: null,

  gradoSeleccionado: "",
  trimestreSeleccionado: "",
  asignaturaSeleccionada: "",
  activeTab: "dashboard",

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

  setUsuario: (u) => set({ usuario: u }),
  setLoading: (v) => set({ loading: v }),
  setDataLoading: (v) => set({ dataLoading: v }),
  setGrados: (v) => set({ grados: v }),
  setGradosFiltrados: (v) => set({ gradosFiltrados: v }),
  setAsignaturasFiltradas: (v) => set({ asignaturasFiltradas: v }),
  setEstudiantes: (v) => set({ estudiantes: v }),
  setAsignaturas: (v) => set({ asignaturas: v }),
  setTodasAsignaturas: (v) => set({ todasAsignaturas: v }),
  setCalificaciones: (v) => set({ calificaciones: v }),
  setConfigActual: (v) => set({ configActual: v }),
  setConfigsGrado: (v) => set({ configsGrado: v }),
  setUsuarios: (v) => set({ usuarios: v }),
  setConfiguracion: (v) => set({ configuracion: v }),
  setUmbrales: (v) => set((s) => ({ umbrales: { ...s.umbrales, ...v } })),

  setGradoSeleccionado: (v) => set({ gradoSeleccionado: v }),
  setTrimestreSeleccionado: (v) => set({ trimestreSeleccionado: v }),
  setAsignaturaSeleccionada: (v) => set({ asignaturaSeleccionada: v }),
  setActiveTab: (v) => set({ activeTab: v }),
}));
