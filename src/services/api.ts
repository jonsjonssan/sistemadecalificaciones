"use client";

import type { Usuario, UsuarioSesion, Estudiante, Asignatura, AsignaturaConGrado, Calificacion, Grado, ConfigActividad, ConfigActividadPartial, ConfiguracionSistema } from "@/types";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let requestId = 0;

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { params, timeout = 15000, ...fetchOptions } = options;
  const id = ++requestId;

  let url = path;
  if (params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  if (typeof window !== "undefined") {
    performance.mark(`api-${id}-start`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!res.ok) {
      let body: unknown;
      try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
      throw new ApiError(res.status, `HTTP ${res.status}: ${res.statusText}`, body);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null as T;
  } finally {
    clearTimeout(timer);
    if (typeof window !== "undefined") {
      performance.mark(`api-${id}-end`);
      performance.measure(`api-${path}`, `api-${id}-start`, `api-${id}-end`);
    }
  }
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      request<ApiResponse<UsuarioSesion>>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      request<ApiResponse<null>>("/api/auth/logout", { method: "POST" }),
    me: () =>
      request<ApiResponse<UsuarioSesion>>("/api/auth/me"),
    checkSession: () =>
      request<ApiResponse<UsuarioSesion>>("/api/check-session"),
    googleLogin: () => "/api/auth/google",
  },

  // Users
  usuarios: {
    list: (params?: { activo?: boolean }) =>
      request<Usuario[]>("/api/usuarios", { params: params as Record<string, string | boolean | undefined> }),
    create: (data: Partial<Usuario>) =>
      request<ApiResponse<Usuario>>("/api/usuarios", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Usuario>) =>
      request<ApiResponse<Usuario>>(`/api/usuarios?id=${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<ApiResponse<null>>(`/api/usuarios?id=${id}`, { method: "DELETE" }),
    changePassword: (actualPassword: string, nuevaPassword: string) =>
      request<ApiResponse<null>>("/api/cambiar-password", {
        method: "POST",
        body: JSON.stringify({ actualPassword, nuevaPassword }),
      }),
  },

  // Grades
  grados: {
    list: (params?: { año?: number }) =>
      request<Grado[]>("/api/grados", { params }),
    get: (id: string) =>
      request<Grado>(`/api/grados?id=${id}`),
  },

  // Students
  estudiantes: {
    list: (params?: { gradoId?: string; activos?: boolean; busqueda?: string }) =>
      request<Estudiante[]>("/api/estudiantes", { params: params as Record<string, string | boolean | undefined> }),
    get: (id: string) =>
      request<Estudiante>(`/api/estudiantes/${id}`),
    create: (data: { nombre: string; email?: string; gradoId: string }) =>
      request<ApiResponse<Estudiante>>("/api/estudiantes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    bulkCreate: (data: { estudiantes: { nombre: string; email?: string }[]; gradoId: string }) =>
      request<ApiResponse<Estudiante[]>>("/api/cargar-estudiantes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Estudiante>) =>
      request<ApiResponse<Estudiante>>(`/api/estudiantes/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<ApiResponse<null>>(`/api/estudiantes/${id}`, { method: "DELETE" }),
    reorder: (data: { estudianteId: string; nuevoOrden: number }[]) =>
      request<ApiResponse<null>>("/api/estudiantes/reordenar", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Subjects
  materias: {
    list: (params?: { gradoId?: string }) =>
      request<AsignaturaConGrado[]>("/api/materias", { params }),
  },

  // Grades
  calificaciones: {
    list: (params?: { gradoId?: string; materiaId?: string; trimestre?: number; estudianteId?: string }) =>
      request<Calificacion[]>("/api/calificaciones", { params: params as Record<string, string | number | undefined> }),
    save: (data: Partial<Calificacion>) =>
      request<ApiResponse<Calificacion>>("/api/calificaciones", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (data: Partial<Calificacion>) =>
      request<ApiResponse<Calificacion>>("/api/calificaciones", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteByStudent: (estudianteId: string, materiaId: string, trimestre: number) =>
      request<ApiResponse<null>>("/api/calificaciones", {
        method: "DELETE",
        body: JSON.stringify({ estudianteId, materiaId, trimestre }),
      }),
    deleteByGrade: (materiaId: string, trimestre: number) =>
      request<ApiResponse<null>>("/api/calificaciones", {
        method: "DELETE",
        body: JSON.stringify({ materiaId, trimestre, todos: true }),
      }),
    promedioGrado: (params: { materiaId: string; trimestre: number }) =>
      request<{ promedio: number | null }>("/api/calificaciones/promedio-grado", { params }),
    history: (calificacionId: string) =>
      request<unknown[]>(`/api/historial-calificaciones?calificacionId=${calificacionId}`),
  },

  // Activity Config
  configActividades: {
    list: (params?: { materiaId?: string; trimestre?: number; gradoId?: string }) =>
      request<ConfigActividad[]>("/api/config-actividades", { params: params as Record<string, string | number | undefined> }),
    save: (data: Partial<ConfigActividad>) =>
      request<ApiResponse<ConfigActividad>>("/api/config-actividades", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // System Config
  configuracion: {
    get: () =>
      request<ConfiguracionSistema>("/api/configuracion"),
    update: (data: Partial<ConfiguracionSistema>) =>
      request<ApiResponse<ConfiguracionSistema>>("/api/configuracion", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  // Attendance
  asistencia: {
    list: (params?: { gradoId?: string; materiaId?: string; fecha?: string }) =>
      request<unknown[]>("/api/asistencia", { params: params as Record<string, string | undefined> }),
    save: (data: { estudianteId: string; fecha: string; estado: string; gradoId?: string; materiaId?: string }) =>
      request<ApiResponse<unknown>>("/api/asistencia", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    bulk: (data: { registros: { estudianteId: string; fecha: string; estado: string }[]; gradoId?: string; materiaId?: string }) =>
      request<ApiResponse<unknown>>("/api/asistencia", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    resumen: (params: { gradoId?: string; materiaId?: string }) =>
      request<unknown[]>("/api/asistencia/resumen", { params }),
    detallada: (params: { gradoId?: string; materiaId?: string }) =>
      request<unknown[]>("/api/asistencia/detallada", { params }),
  },

  // Observations
  observaciones: {
    list: (params?: { estudianteId?: string; gradoId?: string }) =>
      request<unknown[]>("/api/observaciones", { params }),
    save: (data: { estudianteId: string; trimestre: number; contenido: string }) =>
      request<ApiResponse<unknown>>("/api/observaciones", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Report Card
  boleta: {
    generate: (params: { estudianteId: string; gradoId: string; trimestre: number; materias: string[] }) =>
      request<Blob>("/api/boleta", {
        method: "POST",
        body: JSON.stringify(params),
      }).catch(() => { throw new Error("Error generando boleta"); }),
  },

  // Audit
  audit: {
    list: (params?: { page?: number; limit?: number; accion?: string; entidad?: string }) =>
      request<PaginatedResponse<unknown>>("/api/audit", { params: params as Record<string, string | number | undefined> }),
  },

  // Export
  export: {
    download: (params: { type: string; gradoId?: string; materiaId?: string; trimestre?: number }) =>
      `/api/export?${new URLSearchParams(
        Object.entries(params).reduce((acc, [k, v]) => {
          if (v !== undefined) acc[k] = String(v);
          return acc;
        }, {} as Record<string, string>)
      ).toString()}`,
  },

  // Admin
  admin: {
    resetSistema: () =>
      request<ApiResponse<null>>("/api/admin/reset-sistema", { method: "POST" }),
    resetPassword: (usuarioId: string) =>
      request<ApiResponse<null>>("/api/admin/reset-password", {
        method: "POST",
        body: JSON.stringify({ usuarioId }),
      }),
    repararAsignaciones: () =>
      request<ApiResponse<null>>("/api/admin/reparar-asignaciones", { method: "POST" }),
    fixMaterias: () =>
      request<ApiResponse<null>>("/api/admin/fix-materias", { method: "POST" }),
    initPasswords: () =>
      request<ApiResponse<null>>("/api/admin/init-passwords", { method: "POST" }),
    reconstruirDesdeHistorial: () =>
      request<ApiResponse<null>>("/api/admin/reconstruir-desde-historial", { method: "POST" }),
    restaurarSistema: (backup: unknown) =>
      request<ApiResponse<null>>("/api/admin/restaurar-sistema", {
        method: "POST",
        body: JSON.stringify(backup),
      }),
    actualizarSistema: () =>
      request<ApiResponse<null>>("/api/actualizar-sistema", { method: "POST" }),
  },

  // System Init
  init: {
    check: () =>
      request<ApiResponse<{ initialized: boolean }>>("/api/init"),
    run: (data: { adminEmail: string; adminPassword: string; escuela: string; año: number }) =>
      request<ApiResponse<null>>("/api/init", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    initUsuarios: () =>
      request<ApiResponse<null>>("/api/init-usuarios", { method: "POST" }),
  },

  // Stats
  stats: {
    dashboard: () =>
      request<unknown>("/api/stats/dashboard"),
    avanceDocentes: () =>
      request<unknown>("/api/stats/avance-docentes"),
    escalaDesempeno: (params?: { trimestre?: string; gradoId?: string }) =>
      request<unknown>("/api/stats/escala-desempeno", { params }),
  },

  // Alerts
  alerts: {
    predictive: (params?: { gradoId?: string }) =>
      request<unknown[]>("/api/alerts/predictive", { params }),
  },

  // Login Sessions
  loginSessions: {
    list: () =>
      request<unknown[]>("/api/login-sessions"),
  },

  // Logo
  logo: {
    get: () =>
      request<string>("/api/logo"),
  },

  // Recuperacion Anual
  recuperacionAnual: {
    get: (params?: { gradoId?: string; materiaId?: string }) =>
      request<unknown[]>("/api/recuperacion-anual", { params }),
  },
};

export { ApiError };
export type { ApiResponse, PaginatedResponse };
