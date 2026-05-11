import { z } from "zod";

export const emailSchema = z.string().email("Email inválido").min(5).max(255);

export const passwordSchema = z
  .string()
  .min(6, "La contraseña debe tener al menos 6 caracteres")
  .max(100);

export const nombreSchema = z
  .string()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(255)
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.\-']+$/, "El nombre solo puede contener letras, espacios, puntos, guiones y apóstrofes");

export const rolSchema = z.enum(["admin", "admin-directora", "admin-codirectora", "docente", "docente-orientador"]);

export const usuarioCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nombre: nombreSchema,
  rol: rolSchema,
  materiasAsignadas: z.array(z.string()).optional(),
});

export const usuarioUpdateSchema = z.object({
  id: z.string().uuid("ID de usuario inválido"),
  email: emailSchema.optional(),
  nombre: nombreSchema.optional(),
  rol: rolSchema.optional(),
  activo: z.boolean().optional(),
  password: passwordSchema.optional(),
  materiasAsignadas: z.array(z.string()).optional(),
});

export const gradoNumeroSchema = z.number().int().min(2).max(9);
export const gradoSeccionSchema = z.string().length(1).toUpperCase();
export const gradoAnioSchema = z.number().int().min(2020).max(2100);

export const gradoCreateSchema = z.object({
  numero: gradoNumeroSchema,
  seccion: gradoSeccionSchema.default("A"),
  año: gradoAnioSchema.default(() => new Date().getFullYear()),
});

export const gradoUpdateSchema = z.object({
  id: z.string().uuid("ID de grado inválido"),
  numero: gradoNumeroSchema.optional(),
  seccion: gradoSeccionSchema.optional(),
  año: gradoAnioSchema.optional(),
});

export const estudianteNombreSchema = z
  .string()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(255)
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.]+$/, "El nombre contiene caracteres inválidos");

export const estudianteCreateSchema = z.object({
  nombre: estudianteNombreSchema,
  email: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
  gradoId: z.string().uuid("ID de grado inválido"),
});

export const estudiantesBulkCreateSchema = z.object({
  estudiantes: z.array(z.object({
    nombre: estudianteNombreSchema,
    email: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
  })).min(1).max(100),
  gradoId: z.string().uuid("ID de grado inválido"),
});

export const estudianteUpdateSchema = z.object({
  id: z.string().uuid("ID de estudiante inválido"),
  nombre: estudianteNombreSchema.optional(),
  email: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
  numero: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
});

export const materiaNombreSchema = z
  .string()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(255);

export const materiaCreateSchema = z.object({
  nombre: materiaNombreSchema,
  gradoId: z.string().uuid("ID de grado inválido"),
});

export const materiaUpdateSchema = z.object({
  id: z.string().uuid("ID de materia inválido"),
  nombre: materiaNombreSchema.optional(),
});

export const asistenciaEstadoSchema = z.enum(["presente", "ausente", "justificada", "tarde"]);

export const asistenciaCreateSchema = z.object({
  estudianteId: z.string().uuid("ID de estudiante inválido"),
  fecha: z.string().datetime({ message: "Fecha inválida" }),
  estado: asistenciaEstadoSchema,
  gradoId: z.string().uuid("ID de grado inválido").optional(),
  materiaId: z.string().uuid("ID de materia inválido").optional(),
});

export const asistenciaBulkCreateSchema = z.object({
  registros: z.array(z.object({
    estudianteId: z.string().uuid("ID de estudiante inválido"),
    fecha: z.string().datetime({ message: "Fecha inválida" }),
    estado: asistenciaEstadoSchema,
  })).min(1).max(500),
  gradoId: z.string().uuid("ID de grado inválido").optional(),
  materiaId: z.string().uuid("ID de materia inválido").optional(),
});

const notaSchema = z.number().min(0).max(10).optional();
const actividadesSchema = z.array(z.number().min(0).max(10)).max(20);

export const calificacionCreateSchema = z.object({
  estudianteId: z.string().uuid("ID de estudiante inválido"),
  materiaId: z.string().uuid("ID de materia inválido"),
  trimestre: z.number().int().min(1).max(3),
  actividadesCotidianas: actividadesSchema.optional(),
  calificacionAC: notaSchema,
  actividadesIntegradoras: actividadesSchema.optional(),
  calificacionAI: notaSchema,
  examenTrimestral: notaSchema,
  promedioFinal: notaSchema,
  recuperacion: notaSchema,
});

export const calificacionUpdateSchema = z.object({
  id: z.string().uuid("ID de calificación inválido"),
  actividadesCotidianas: actividadesSchema.optional(),
  calificacionAC: notaSchema,
  actividadesIntegradoras: actividadesSchema.optional(),
  calificacionAI: notaSchema,
  examenTrimestral: notaSchema,
  promedioFinal: notaSchema,
  recuperacion: notaSchema,
});

export const configActividadCreateSchema = z.object({
  materiaId: z.string().uuid("ID de materia inválido"),
  trimestre: z.number().int().min(1).max(3),
  numActividadesCotidianas: z.number().int().min(1).max(20).default(4),
  numActividadesIntegradoras: z.number().int().min(0).max(10).default(1),
  tieneExamen: z.boolean().default(true),
  porcentajeAC: z.number().min(0).max(100).default(35),
  porcentajeAI: z.number().min(0).max(100).default(35),
  porcentajeExamen: z.number().min(0).max(100).default(30),
}).refine(
  (data) => {
    const total = data.porcentajeAC + data.porcentajeAI + (data.tieneExamen ? data.porcentajeExamen : 0);
    return Math.abs(total - 100) < 0.01;
  },
  { message: "Los porcentajes deben sumar 100%" }
);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es requerida"),
});

export const cambiarPasswordSchema = z.object({
  actualPassword: z.string().min(1, "La contraseña actual es requerida"),
  nuevaPassword: passwordSchema,
});

export const idParamSchema = z.object({
  id: z.string().uuid("ID inválido"),
});

export const paginacionSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const filtroEstudiantesSchema = paginacionSchema.extend({
  gradoId: z.string().uuid("ID de grado inválido").optional(),
  activos: z.enum(["true", "false"]).optional(),
  busqueda: z.string().max(100).optional(),
});

export const filtroCalificacionesSchema = z.object({
  estudianteId: z.string().uuid("ID de estudiante inválido").optional(),
  materiaId: z.string().uuid("ID de materia inválido").optional(),
  gradoId: z.string().uuid("ID de grado inválido").optional(),
  trimestre: z.coerce.number().int().min(1).max(3).optional(),
});

export function sanitizeInput(input: unknown): string {
  if (typeof input === "string") {
    return input.trim().replace(/[<>]/g, "");
  }
  return "";
}

export function validarId(id: string): boolean {
  return /^[a-zA-Z0-9]{25}$/.test(id);
}
