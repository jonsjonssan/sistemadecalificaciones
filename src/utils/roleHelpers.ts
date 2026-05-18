import { Usuario, UsuarioSesion } from "@/types";

export const ADMIN_ROLES = ["admin", "admin-directora", "admin-codirectora"] as const;

export const isAdmin = (rol: string): boolean => {
  return ADMIN_ROLES.includes(rol as any);
};

export const canDeleteUsers = (user: UsuarioSesion | null): boolean => {
  return ADMIN_ROLES.includes(user?.rol as any);
};

export const getDocentesDelGrado = (usuarios: Usuario[], gradoId: string): string[] => {
  if (!Array.isArray(usuarios)) return [];
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
