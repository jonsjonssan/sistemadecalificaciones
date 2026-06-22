export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  ADMIN_DIRECTORA: "admin-directora",
  ADMIN_CODIRECTORA: "admin-codirectora",
  DOCENTE: "docente",
  DOCENTE_ORIENTADOR: "docente-orientador",
} as const;

export const ADMIN_ROLES = ["admin", "admin-directora", "admin-codirectora"] as const;
export const SUPERADMIN_ROLES = ["superadmin"] as const;
export const ADMIN_ROLES_ALL = [...SUPERADMIN_ROLES, ...ADMIN_ROLES] as const;

export const ESTADOS_ASISTENCIA = {
  PRESENTE: "presente",
  AUSENTE: "ausente",
  JUSTIFICADA: "justificada",
  TARDE: "tarde",
} as const;

export const TRIMESTRES = {
  PRIMERO: 1,
  SEGUNDO: 2,
  TERCERO: 3,
} as const;

export const CANTIDAD_TRIMESTRES = 3;

export const GRADOS = [2, 3, 4, 5, 6, 7, 8, 9] as const;

export const SECCIONES = ["A", "B", "C", "D"] as const;

export const MATERIAS_POR_GRADO: Record<number, string[]> = {
  2: ["Comunicación", "Números y Formas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes"],
  3: ["Comunicación", "Números y Formas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe", "Artes"],
  4: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe"],
  5: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciudadanía y Valores", "Ciencia y Tecnología", "Desarrollo Corporal", "Educación en la Fe"],
  6: ["Comunicación y Literatura", "Aritmética y Finanzas", "Ciencia y Tecnología", "Ciudadanía y Valores", "Desarrollo Corporal", "Educación en la Fe"],
  7: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Educación Física y Deportes", "Educación en la Fe", "Inglés"],
  8: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Educación Física y Deportes", "Educación en la Fe", "Inglés"],
  9: ["Lengua y Literatura", "Matemática y Datos", "Ciencia y Tecnología", "Ciudadanía y Valores", "Educación Física y Deportes", "Educación en la Fe", "Inglés"],
};

export const ESTANDARES_PORCENTAJES = {
  ACTIVIDADES_COTIDIANAS: 35,
  ACTIVIDADES_INTEGRADORAS: 35,
  EXAMEN: 30,
} as const;

export const PORCENTAJE_DEFAULT_AC = 35.0;
export const PORCENTAJE_DEFAULT_AI = 35.0;
export const PORCENTAJE_DEFAULT_EXAMEN = 30.0;

export const TOLERANCIA_PORCENTAJE = 0.01;

export const NOTA_MINIMA = 0.0;
export const NOTA_MAXIMA = 10.0;

export const NOTA_MINIMA_APROBATORIA = 5.0;

export const UMBRAL_CONDICIONADO_DEFAULT = 4.5;
export const UMBRAL_APROBADO_DEFAULT = 6.5;
export const UMBRAL_RECUPERACION_DEFAULT = 5.0;

export const ASISTENCIA_PESO_TARDANZA = 0.5;
export const ASISTENCIA_CRITICA_PCT = 70;
export const ASISTENCIA_BAJA_PCT = 80;

export const MAX_ACTIVIDADES_COTIDIANAS = 10;
export const MAX_ACTIVIDADES_INTEGRADORAS = 5;
export const MAX_EXAMENES = 5;

export const DEFAULT_NUM_ACTIVIDADES_COTIDIANAS = 4;
export const DEFAULT_NUM_ACTIVIDADES_INTEGRADORAS = 1;
export const DEFAULT_NUM_EXAMENES = 1;

export const MAX_HISTORIAL_CELDA_DEFAULT = 10;

export const SESSION_CACHE_TTL_MS = 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 60;

export const AGENTE_UMBRAL_RIESGO_ALTO = 0.6;
export const AGENTE_UMBRAL_RIESGO_MEDIO = 0.4;
export const AGENTE_UMBRAL_DESCARTAR = 0.3;
export const AGENTE_TENDENCIA_FUERTE = -0.5;
export const AGENTE_TENDENCIA_LEVE = -0.2;

export const FETCH_TIMEOUT_MS = 15_000;
export const FETCH_REINTENTOS = 3;
export const FETCH_BACKOFF_BASE_MS = 1000;
export const FETCH_BACKOFF_MAX_MS = 10_000;
export const CIRCUIT_BREAKER_UMBRAL_FALLOS = 5;
export const CIRCUIT_BREAKER_RESET_MS = 30_000;
