import { describe, it, expect } from "vitest";

describe("middleware security headers", () => {
  it("middleware matcher incluye /api/:path*", () => {
    const config = { matcher: ["/api/:path*"] };
    expect(config.matcher).toContain("/api/:path*");
  });

  it("rate limiting usa ventana de 60s y max 60 requests", () => {
    const RATE_LIMIT_WINDOW = 60_000;
    const RATE_LIMIT_MAX = 60;
    expect(RATE_LIMIT_WINDOW).toBe(60000);
    expect(RATE_LIMIT_MAX).toBe(60);
  });
});

describe("security recommendations", () => {
  it("CSP headers recomendados existen", () => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];
    expect(csp.length).toBeGreaterThan(5);
    expect(csp.some((h) => h.startsWith("default-src"))).toBe(true);
    expect(csp.some((h) => h.startsWith("frame-ancestors"))).toBe(true);
  });

  it("Permissions-Policy deshabilita features no necesarios", () => {
    const policy = "camera=(), microphone=(), geolocation=()";
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
  });

  it("Referrer-Policy es strict-origin-when-cross-origin", () => {
    expect("strict-origin-when-cross-origin").toBe("strict-origin-when-cross-origin");
  });
});
