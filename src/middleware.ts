import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

const publicPaths = [
  "/api/auth/login",
  "/api/auth/google",
  "/api/init",
  "/api/init-usuarios",
  "/api/check-session",
  "/api/escuelas",
  "/_next/",
  "/favicon.ico",
  "/sw.js",
  "/manifest.json",
  "/logo",
];

function isPublic(path: string): boolean {
  return publicPaths.some((p) => path.startsWith(p));
}

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;

let cachedKey: CryptoKey | null = null;
async function getHmacKey(): Promise<CryptoKey | null> {
  if (!SESSION_SECRET) return null;
  if (cachedKey) return cachedKey;
  try {
    cachedKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    return cachedKey;
  } catch {
    return null;
  }
}

async function verifySessionSignature(cookieValue: string): Promise<boolean> {
  const dotIndex = cookieValue.indexOf(".");
  if (dotIndex === -1) return false;
  const payload = cookieValue.substring(0, dotIndex);
  const providedSignature = cookieValue.substring(dotIndex + 1);
  const key = await getHmacKey();
  if (!key) return false;
  try {
    const data = new TextEncoder().encode(payload);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (providedSignature.length !== expectedHex.length) return false;
    let diff = 0;
    for (let i = 0; i < providedSignature.length; i++) {
      diff |= providedSignature.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

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
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

const SENSITIVE_PATHS = ["/api/admin", "/api/usuarios", "/api/audit", "/api/login-sessions"];

export async function middleware(request: NextRequest) {
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

    if (SESSION_SECRET) {
      const sessionCookie = request.cookies.get("session");
      const authHeader = request.headers.get("authorization");
      const hasBearer = authHeader?.startsWith("Bearer ") ?? false;

      if (!sessionCookie && !hasBearer) {
        return NextResponse.json(
          { error: "No autorizado. Inicia sesión primero.", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      if (sessionCookie && !hasBearer) {
        const valid = await verifySessionSignature(sessionCookie.value);
        if (!valid) {
          return NextResponse.json(
            { error: "Sesión inválida o expirada.", code: "INVALID_SESSION" },
            { status: 401 }
          );
        }
      }
    }

    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=)");

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
