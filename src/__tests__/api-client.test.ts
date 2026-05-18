import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/services/api";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("api.auth", () => {
  it("login llama al endpoint correcto", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: "1", email: "test@test.com" } }),
      text: () => Promise.resolve(JSON.stringify({ success: true, data: { id: "1", email: "test@test.com" } })),
    });

    const result = await api.auth.login("test@test.com", "123456");
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", password: "123456" }),
    }));
    expect(result.success).toBe(true);
  });

  it("me obtiene el usuario actual", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: "1", email: "test@test.com" } }),
      text: () => Promise.resolve(JSON.stringify({ success: true, data: { id: "1", email: "test@test.com" } })),
    });

    const result = await api.auth.me();
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/me", expect.any(Object));
    expect(result.success).toBe(true);
  });
});

describe("api.usuarios", () => {
  it("list devuelve array de usuarios", async () => {
    const usuarios = [{ id: "1", nombre: "Test" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(usuarios),
      text: () => Promise.resolve(JSON.stringify(usuarios)),
    });

    const result = await api.usuarios.list();
    expect(mockFetch).toHaveBeenCalledWith("/api/usuarios", expect.any(Object));
    expect(result).toEqual(usuarios);
  });
});

describe("api.grados", () => {
  it("list devuelve grados", async () => {
    const grados = [{ id: "1", numero: 2, seccion: "A" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(grados),
      text: () => Promise.resolve(JSON.stringify(grados)),
    });

    const result = await api.grados.list();
    expect(result).toEqual(grados);
  });
});

describe("api.estudiantes", () => {
  it("list con filtro gradoId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve(JSON.stringify([])),
    });

    await api.estudiantes.list({ gradoId: "grado-1" });
    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain("gradoId=grado-1");
  });
});
