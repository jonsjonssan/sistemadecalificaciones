import { describe, it, expect } from "vitest";

const ROLES_SOBRESCRIBIR = ["admin", "admin-directora", "admin-codirectora", "docente-orientador"];

function puedeSobrescribir(usuario: { rol: string } | null | undefined): boolean {
  if (!usuario) return false;
  return ROLES_SOBRESCRIBIR.includes(usuario.rol);
}

function canAccessGrado(session: any, gradoId: string): boolean {
  if (["admin", "admin-directora", "admin-codirectora"].includes(session?.rol)) return true;
  return session?.asignaturasAsignadas?.some((m: any) => m.gradoId === gradoId) ?? false;
}

describe("puedeSobrescribir (asistencia - roles que pueden editar sin bloqueo)", () => {
  it("admin puede sobrescribir", () => {
    expect(puedeSobrescribir({ rol: "admin" })).toBe(true);
  });

  it("admin-directora puede sobrescribir", () => {
    expect(puedeSobrescribir({ rol: "admin-directora" })).toBe(true);
  });

  it("admin-codirectora puede sobrescribir", () => {
    expect(puedeSobrescribir({ rol: "admin-codirectora" })).toBe(true);
  });

  it("docente-orientador puede sobrescribir", () => {
    expect(puedeSobrescribir({ rol: "docente-orientador" })).toBe(true);
  });

  it("docente NO puede sobrescribir", () => {
    expect(puedeSobrescribir({ rol: "docente" })).toBe(false);
  });

  it("usuario null NO puede sobrescribir", () => {
    expect(puedeSobrescribir(null)).toBe(false);
  });

  it("usuario undefined NO puede sobrescribir", () => {
    expect(puedeSobrescribir(undefined)).toBe(false);
  });

  it("rol vacío NO puede sobrescribir", () => {
    expect(puedeSobrescribir({ rol: "" })).toBe(false);
  });

  it("rol inexistente NO puede sobrescribir", () => {
    expect(puedeSobrescribir({ rol: "estudiante" })).toBe(false);
    expect(puedeSobrescribir({ rol: "padre" })).toBe(false);
  });

  it("case sensitive - mayúsculas no coinciden", () => {
    expect(puedeSobrescribir({ rol: "Admin" })).toBe(false);
    expect(puedeSobrescribir({ rol: "DOCENTE-ORIENTADOR" })).toBe(false);
  });
});

describe("canAccessGrado (API - control de acceso a grado)", () => {
  it("admin accede a cualquier grado", () => {
    expect(canAccessGrado({ rol: "admin" }, "grado-1")).toBe(true);
    expect(canAccessGrado({ rol: "admin" }, "grado-999")).toBe(true);
  });

  it("admin-directora accede a cualquier grado", () => {
    expect(canAccessGrado({ rol: "admin-directora" }, "grado-X")).toBe(true);
  });

  it("admin-codirectora accede a cualquier grado", () => {
    expect(canAccessGrado({ rol: "admin-codirectora" }, "grado-Y")).toBe(true);
  });

  it("docente accede solo a grado asignado", () => {
    const session = {
      rol: "docente",
      asignaturasAsignadas: [
        { id: "m1", gradoId: "grado-1" },
        { id: "m2", gradoId: "grado-2" },
      ],
    };
    expect(canAccessGrado(session, "grado-1")).toBe(true);
    expect(canAccessGrado(session, "grado-2")).toBe(true);
    expect(canAccessGrado(session, "grado-3")).toBe(false);
  });

  it("docente sin asignaturas no accede a ningún grado", () => {
    const session = { rol: "docente", asignaturasAsignadas: [] };
    expect(canAccessGrado(session, "grado-1")).toBe(false);
  });

  it("docente sin propiedad asignaturas no accede", () => {
    const session = { rol: "docente" };
    expect(canAccessGrado(session, "grado-1")).toBe(false);
  });

  it("session null no accede", () => {
    expect(canAccessGrado(null, "grado-1")).toBe(false);
  });

  it("session undefined no accede", () => {
    expect(canAccessGrado(undefined, "grado-1")).toBe(false);
  });

  it("docente-orientador NO tiene acceso administrativo a grados", () => {
    // docente-orientador no está en la lista de admin del API
    const session = { rol: "docente-orientador", asignaturasAsignadas: [] };
    expect(canAccessGrado(session, "grado-1")).toBe(false);
  });
});
