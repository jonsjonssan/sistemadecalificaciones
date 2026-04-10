import type { Usuario } from "@/types";

/**
 * Verifica si un rol tiene permisos de administrador.
 */
export const isAdmin = (rol: string): boolean =>
  ["admin", "admin-directora", "admin-codirectora"].includes(rol);

/**
 * Verifica si un usuario tiene permiso especial para eliminar otros usuarios.
 * Hardcoded para el usuario específico del sistema.
 */
export const canDeleteUsers = (user: Pick<Usuario, "email"> | null | undefined): boolean =>
  user?.email === "jonathan.araujo.mendoza@clases.edu.sv";

/**
 * Obtiene la lista de docentes asignados a un grado específico.
 * Basado en la relación DocenteMateria.
 */
export const getDocentesDelGrado = (
  gradoId: string,
  usuarios: Usuario[]
): string[] => {
  const docentes = new Set<string>();
  usuarios.forEach((u) => {
    u.materias?.forEach((m) => {
      if (m.gradoId === gradoId) {
        docentes.add(u.nombre);
      }
    });
  });
  return Array.from(docentes);
};
