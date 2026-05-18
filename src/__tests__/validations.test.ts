import { describe, it, expect } from "vitest";
import { loginSchema, usuarioCreateSchema, estudianteCreateSchema, configActividadCreateSchema } from "@/lib/validations";

describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    const result = loginSchema.safeParse({ email: "admin@test.com", password: "123456" });
    expect(result.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const result = loginSchema.safeParse({ email: "invalido", password: "123456" });
    expect(result.success).toBe(false);
  });

  it("rechaza password vacío", () => {
    const result = loginSchema.safeParse({ email: "admin@test.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("usuarioCreateSchema", () => {
  it("acepta usuario válido", () => {
    const result = usuarioCreateSchema.safeParse({
      email: "docente@test.com",
      password: "123456",
      nombre: "María Pérez",
      rol: "docente",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza rol inválido", () => {
    const result = usuarioCreateSchema.safeParse({
      email: "test@test.com",
      password: "123456",
      nombre: "Test",
      rol: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre con caracteres especiales", () => {
    const result = usuarioCreateSchema.safeParse({
      email: "test@test.com",
      password: "123456",
      nombre: "<script>alert('xss')</script>",
      rol: "docente",
    });
    expect(result.success).toBe(false);
  });
});

describe("estudianteCreateSchema", () => {
  it("acepta estudiante válido", () => {
    const result = estudianteCreateSchema.safeParse({
      nombre: "Juan Pérez",
      gradoId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza nombre muy corto", () => {
    const result = estudianteCreateSchema.safeParse({
      nombre: "A",
      gradoId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("acepta estudiante con email opcional", () => {
    const result = estudianteCreateSchema.safeParse({
      nombre: "Juan Pérez",
      email: "",
      gradoId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});

describe("configActividadCreateSchema", () => {
  it("acepta configuración con porcentajes que suman 100%", () => {
    const result = configActividadCreateSchema.safeParse({
      materiaId: "550e8400-e29b-41d4-a716-446655440000",
      trimestre: 1,
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 2,
      tieneExamen: true,
      porcentajeAC: 35,
      porcentajeAI: 35,
      porcentajeExamen: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza porcentajes que no suman 100%", () => {
    const result = configActividadCreateSchema.safeParse({
      materiaId: "550e8400-e29b-41d4-a716-446655440000",
      trimestre: 1,
      numActividadesCotidianas: 4,
      numActividadesIntegradoras: 2,
      tieneExamen: true,
      porcentajeAC: 50,
      porcentajeAI: 50,
      porcentajeExamen: 50,
    });
    expect(result.success).toBe(false);
  });
});

import { sanitizeInput } from "@/lib/validations";

describe("sanitizeInput", () => {
  it("elimina caracteres <> del input", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe("scriptalert('xss')/script");
  });

  it("retorna string vacío para non-string", () => {
    expect(sanitizeInput(123)).toBe("");
    expect(sanitizeInput(null)).toBe("");
  });
});
