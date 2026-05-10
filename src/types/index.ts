export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  gradosAsignados?: { id: string; numero: number; seccion: string }[];
  asignaturasAsignadas?: {
    id: string;
    nombre: string;
    gradoId: string;
    gradoNumero?: number;
    gradoSeccion?: string;
  }[];
}

export interface AsignaturaConGrado {
  id: string;
  nombre: string;
  gradoId: string;
  grado?: { id: string; numero: number; seccion: string };
  gradoNumero?: number;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  gradosComoTutor?: { id: string; numero: number; seccion: string; año: number }[];
  materias?: AsignaturaConGrado[];
}

export interface Estudiante {
  id: string;
  numero: number;
  nombre: string;
  email?: string;
  gradoId: string;
  activo: boolean;
  orden?: number;
}

export interface Asignatura {
  id: string;
  nombre: string;
  gradoId: string;
}

export interface ConfigActividad {
  id: string;
  materiaId: string;
  trimestre: number;
  numActividadesCotidianas: number;
  numActividadesIntegradoras: number;
  tieneExamen: boolean;
  porcentajeAC: number;
  porcentajeAI: number;
  porcentajeExamen: number;
  asignaturaNombre?: string;
}

export type ConfigActividadPartial = Partial<ConfigActividad> & {
  numActividadesCotidianas: number;
  numActividadesIntegradoras: number;
  tieneExamen: boolean;
  porcentajeAC: number;
  porcentajeAI: number;
  porcentajeExamen: number;
};

export interface Calificacion {
  id: string;
  estudianteId: string;
  materiaId: string;
  trimestre: number;
  actividadesCotidianas: string | null;
  calificacionAC: number | null;
  actividadesIntegradoras: string | null;
  calificacionAI: number | null;
  examenTrimestral: number | null;
  promedioFinal: number | null;
  recuperacion: number | null;
  estudiante?: Estudiante;
  asignatura?: Asignatura;
  config?: ConfigActividad;
}

export interface Grado {
  id: string;
  numero: number;
  seccion: string;
  año: number;
  docenteId: string | null;
  docente?: { id: string; nombre: string; email: string };
  _count?: { estudiantes: number; materias: number };
}

export interface ConfiguracionSistema {
  id: string;
  añoEscolar: number;
  escuela: string;
  nombreDirectora?: string;
  umbralRecuperacion?: number;
  umbralCondicionado?: number;
  umbralAprobado?: number;
  maxHistorialCelda?: number;
  usarIntervaloReprobado?: boolean;
  usarIntervaloCondicionado?: boolean;
  usarIntervaloAprobado?: boolean;
}
