export const ROLES = {
  ADMIN: "admin",
  DOCENTE: "docente",
} as const;

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

export const NOTA_MINIMA_APROBATORIA = 5.0;

export const MAX_ACTIVIDADES_COTIDIANAS = 10;
export const MAX_ACTIVIDADES_INTEGRADORAS = 5;
