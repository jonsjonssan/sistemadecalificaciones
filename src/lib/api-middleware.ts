/**
 * Shared API Middleware
 * 
 * Proporciona funcionalidades comunes para todas las rutas API:
 * - Autenticación y autorización
 * - Validación de datos con Zod
 * - Manejo consistente de errores
 * - Audit logging helper
 * - Rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "./session";
import { z } from "zod";
import { sql } from "./neon";
import type { SessionUsuario } from "@/lib/types/session";
import { SESSION_CACHE_TTL_MS } from "@/lib/constants";

// ==========================================
// Zod Validation Helpers
// ==========================================

export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join("; ");
}

export async function validateBody<T>(req: NextRequest, schema: z.ZodType<T>): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return { error: NextResponse.json({ success: false, error: "Datos inválidos", details: formatZodErrors(result.error) }, { status: 400 }) };
    }
    return { data: result.data };
  } catch {
    return { error: NextResponse.json({ success: false, error: "JSON inválido en el cuerpo de la solicitud" }, { status: 400 }) };
  }
}

export function validateQuery<T>(searchParams: URLSearchParams, schema: z.ZodType<T>): { data: T; error?: never } | { data?: never; error: NextResponse } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => { params[key] = value; });
  const result = schema.safeParse(params);
  if (!result.success) {
    return { error: NextResponse.json({ success: false, error: "Parámetros inválidos", details: formatZodErrors(result.error) }, { status: 400 }) };
  }
  return { data: result.data };
}

export function validateObject<T>(obj: unknown, schema: z.ZodType<T>): { data: T; error?: never } | { data?: never; error: NextResponse } {
  const result = schema.safeParse(obj);
  if (!result.success) {
    return { error: NextResponse.json({ success: false, error: "Datos inválidos", details: formatZodErrors(result.error) }, { status: 400 }) };
  }
  return { data: result.data };
}

// ==========================================
// Session Helpers
// ==========================================

export type { SessionUsuario };

// ==========================================
// Session Activity Cache (60s TTL)
// ==========================================

const sessionActivityCache = new Map<string, { active: boolean; checkedAt: number }>();
const SESSION_CACHE_TTL = SESSION_CACHE_TTL_MS;

async function isUserActive(userId: string): Promise<boolean> {
  const now = Date.now();
  const cached = sessionActivityCache.get(userId);
  if (cached && now - cached.checkedAt < SESSION_CACHE_TTL) {
    return cached.active;
  }
  try {
    const rows = await sql`
      SELECT activo FROM "Usuario" WHERE id = ${userId} LIMIT 1
    `;
    const active = rows.length > 0 && rows[0].activo === true;
    sessionActivityCache.set(userId, { active, checkedAt: now });
    return active;
  } catch {
    // Si la DB no responde, permitir acceso (fail-open para no bloquear todo el sistema)
    return true;
  }
}

export function invalidateSessionCache(userId: string) {
  sessionActivityCache.delete(userId);
}

export async function getSession(): Promise<SessionUsuario | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  try {
    const verified = verifySession(session.value);
    if (!verified) return null;
    const sessionUser = verified as SessionUsuario;

    // Verificar que el usuario siga activo en la BD
    const active = await isUserActive(sessionUser.id);
    if (!active) return null;

    return sessionUser;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  return { session };
}

const ADMIN_ROLES_ALL = ["superadmin", "admin", "admin-directora", "admin-codirectora"];

export async function requireAdmin() {
  const { session, error } = await requireSession();
  if (error) return { error };
  if (!ADMIN_ROLES_ALL.includes(session.rol)) {
    return { error: NextResponse.json({ error: "Solo administradores pueden realizar esta acción" }, { status: 403 }) };
  }
  return { session };
}

// ==========================================
// Tenant Isolation Helpers
// ==========================================

export async function requireEscuelaSession() {
  const { session, error } = await requireSession();
  if (error) return { error };
  if (!session.escuelaId) {
    return { error: NextResponse.json({ error: "Sesión sin escuela asignada" }, { status: 400 }) };
  }
  return { session };
}

export async function requireAdminInEscuela() {
  const { session, error } = await requireAdmin();
  if (error) return { error };
  if (!session.escuelaId) {
    return { error: NextResponse.json({ error: "Sesión sin escuela asignada" }, { status: 400 }) };
  }
  return { session };
}

export function checkEscuelaOwnership(session: SessionUsuario, targetEscuelaId: string): boolean {
  if (!session.escuelaId || !targetEscuelaId) return false;
  return session.escuelaId === targetEscuelaId;
}

export function rejectIfNotSameEscuela(session: SessionUsuario, targetEscuelaId: string) {
  if (!checkEscuelaOwnership(session, targetEscuelaId)) {
    return NextResponse.json({ error: "No tiene acceso a recursos de otra escuela" }, { status: 403 });
  }
  return null;
}

// ==========================================
// Response Helpers
// ==========================================

export function successResponse<T = unknown>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ==========================================
// Pagination Helper
// ==========================================

export function parsePagination(searchParams: URLSearchParams, defaults = { page: 1, limit: 100 }) {
  const page = Math.max(1, parseInt(searchParams.get("page") || String(defaults.page)));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || String(defaults.limit))));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginationResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  };
}

// ==========================================
// Error Handler Wrapper
// ==========================================

export function withErrorHandling(handler: (req: NextRequest, ...args: never[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: never[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      console.error(`[API Error] ${req.url}:`, error);
      return NextResponse.json(
        { error: "Error interno del servidor", details: process.env.NODE_ENV === "development" ? String(error) : undefined },
        { status: 500 }
      );
    }
  };
}

// ==========================================
// Auth Wrapper
// ==========================================

export function withAuth(handler: (req: NextRequest, session: SessionUsuario) => Promise<NextResponse>, options?: { requireAdmin?: boolean; requireEscuela?: boolean }) {
  return withErrorHandling(async (req: NextRequest, ..._args: never[]) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión primero." }, { status: 401 });
    }
    if (options?.requireAdmin && !ADMIN_ROLES_ALL.includes(session.rol)) {
      return NextResponse.json({ error: "Acceso denegado. Se requiere rol de administrador." }, { status: 403 });
    }
    if (options?.requireEscuela && !session.escuelaId) {
      return NextResponse.json({ error: "Sesión sin escuela asignada" }, { status: 400 });
    }
    return handler(req, session);
  });
}

// ==========================================
// Rate Limiter Simple (In-Memory)
// ==========================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, RATE_LIMIT_CLEANUP_INTERVAL);
}

export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60 * 1000) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: maxAttempts - entry.count, resetIn: entry.resetTime - now };
}
