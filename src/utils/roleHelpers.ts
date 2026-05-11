import { Usuario, UsuarioSesion } from "@/types";

export const isAdmin = (rol: string): boolean => {
  return ["admin", "admin-directora", "admin-codirectora"].includes(rol);
};

export const canDeleteUsers = (user: UsuarioSesion | null): boolean => {
  return ["admin", "admin-directora", "admin-codirectora"].includes(user?.rol || "");
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