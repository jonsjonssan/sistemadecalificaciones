import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/api/auth/login",
  "/api/auth/google",
  "/api/init",
  "/api/init-usuarios",
  "/api/check-session",
  "/_next/",
  "/favicon.ico",
  "/sw.js",
  "/manifest.json",
  "/logo",
];

function isPublic(path: string): boolean {
  return publicPaths.some((p) => path.startsWith(p));
}

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 60;

function getRateMap(): Map<string, { count: number; resetAt: number }> {
  const now = Date.now();
  const g = globalThis as { __rateMap?: Map<string, { count: number; resetAt: number }> };
  if (!g.__rateMap) {
    g.__rateMap = new Map();
  } else if (g.__rateMap.size > 1000) {
    for (const [key, entry] of g.__rateMap) {
      if (now > entry.resetAt) g.__rateMap.delete(key);
    }
  }
  return g.__rateMap;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const rateMap = getRateMap();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

const SENSITIVE_PATHS = ["/api/admin", "/api/usuarios", "/api/audit", "/api/login-sessions"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto.", success: false },
        { status: 429 }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (SENSITIVE_PATHS.some((p) => pathname.startsWith(p))) {
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
