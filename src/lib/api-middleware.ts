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
import { db } from "./db";
import { verifySession } from "./session";
import { z } from "zod";

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

export interface SessionUsuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  gradoId?: string;
  materias?: Array<{ id: string; nombre: string; gradoId: string; grado?: { numero: number; seccion: string } }>;
  gradosAsignados?: Array<{ id: string; numero: number; seccion: string }>;
  asignaturasAsignadas?: Array<{ id: string; nombre: string; gradoId: string }>;
}

export async function getSession(): Promise<SessionUsuario | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  try {
    const verified = verifySession(session.value);
    if (!verified) return null;
    return verified as SessionUsuario;
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

export async function requireAdmin() {
  const { session, error } = await requireSession();
  if (error) return { error };
  if (!["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) {
    return { error: NextResponse.json({ error: "Solo administradores pueden realizar esta acción" }, { status: 403 }) };
  }
  return { session };
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

export function withErrorHandling(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: any[]) => {
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

export function withAuth(handler: (req: NextRequest, session: SessionUsuario) => Promise<NextResponse>, options?: { requireAdmin?: boolean }) {
  return withErrorHandling(async (req: NextRequest, ...args: any[]) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión primero." }, { status: 401 });
    }
    if (options?.requireAdmin && !["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) {
      return NextResponse.json({ error: "Acceso denegado. Se requiere rol de administrador." }, { status: 403 });
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
