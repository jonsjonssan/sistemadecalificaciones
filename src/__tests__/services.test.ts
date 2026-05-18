import { describe, it, expect } from "vitest";
import { api, ApiError } from "@/services/api";
import { clientLogger } from "@/lib/logger-client";
import { perf } from "@/lib/performance";

describe("api service - integration checks", () => {
  it("api es un objeto con secciones", () => {
    expect(api).toBeDefined();
    expect(typeof api.auth).toBe("object");
    expect(typeof api.estudiantes).toBe("object");
    expect(typeof api.grados).toBe("object");
    expect(typeof api.usuarios).toBe("object");
    expect(typeof api.calificaciones).toBe("object");
    expect(typeof api.asistencia).toBe("object");
    expect(typeof api.admin).toBe("object");
    expect(typeof api.init).toBe("object");
  });

  it("ApiError es una clase Error", () => {
    const err = new ApiError(400, "test");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.message).toBe("test");
  });
});

describe("clientLogger - verifica estructura", () => {
  it("clientLogger tiene métodos esperados", () => {
    expect(typeof clientLogger.info).toBe("function");
    expect(typeof clientLogger.error).toBe("function");
    expect(typeof clientLogger.warn).toBe("function");
    expect(typeof clientLogger.debug).toBe("function");
  });
});

describe("performance - verifica estructura", () => {
  it("perf tiene start y end", () => {
    expect(typeof perf.start).toBe("function");
    expect(typeof perf.end).toBe("function");
  });
});
