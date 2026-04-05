export type RolUsuario = "admin" | "admin-directora" | "admin-codirectora" | "docente" | "docente-orientador";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Grado {
  id: string;
  numero: number;
  seccion: string;
  año: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Estudiante {
  id: string;
  numero: number;
  nombre: string;
  email?: string;
  gradoId: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Materia {
  id: string;
  nombre: string;
  gradoId: string;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Calificacion {
  id: string;
  estudianteId: string;
  materiaId: string;
  trimestre: number;
  actividadesCotidianas: number[];
  calificacionAC: number | null;
  actividadesIntegradoras: number[];
  calificacionAI: number | null;
  examenTrimestral: number | null;
  promedioFinal: number | null;
  recuperacion: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asistencia {
  id: string;
  estudianteId: string;
  fecha: Date;
  estado: "presente" | "ausente" | "justificada" | "tarde";
  gradoId: string | null;
  materiaId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
