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
  2: ["Comunicación", "Matemática", "Descubrimiento del Medio", "Educación Artística"],
  3: ["Comunicación", "Matemática", "Ciencias Naturales", "Ciencias Sociales"],
  4: ["Comunicación y Literatura", "Matemática", "Ciencias Naturales", "Ciencias Sociales"],
  5: ["Comunicación y Literatura", "Matemática", "Ciencias Naturales", "Ciencias Sociales"],
  6: ["Comunicación y Literatura", "Matemática", "Ciencias Naturales", "Ciencias Sociales", "Educación Física"],
  7: ["Lengua y Literatura", "Matemática", "Ciencias Naturales", "Ciencias Sociales", "Educación Física"],
  8: ["Lengua y Literatura", "Matemática", "Física", "Química", "Historia", "Educación Física"],
  9: ["Lengua y Literatura", "Matemática", "Física", "Química", "Historia", "Educación Física"],
};

export const ESTANDARES_PORCENTAJES = {
  ACTIVIDADES_COTIDIANAS: 35,
  ACTIVIDADES_INTEGRADORAS: 35,
  EXAMEN: 30,
} as const;

export const NOTA_MINIMA_APROBATORIA = 6.0;

export const MAX_ACTIVIDADES_COTIDIANAS = 10;
export const MAX_ACTIVIDADES_INTEGRADORAS = 5;
