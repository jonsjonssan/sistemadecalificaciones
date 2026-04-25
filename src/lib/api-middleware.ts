/**
 * Shared API Middleware
 * 
 * Proporciona funcionalidades comunes para todas las rutas API:
 * - Autenticación y autorización
 * - Validación de datos
 * - Manejo consistente de errores
 * - Audit logging helper
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "./db";
import { verifySession } from "./session";

// ==========================================
// Session Helpers
// ==========================================

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  try {
    const verified = verifySession(session.value);
    if (!verified) return null;
    return verified as { id: string; email: string; nombre: string; rol: string; asignaturasAsignadas?: any[] };
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

export function successResponse(data: any, status = 200) {
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

export function paginationResponse(data: any[], total: number, page: number, limit: number) {
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

export function withAuth(handler: (req: NextRequest, session: any) => Promise<NextResponse>, options?: { requireAdmin?: boolean }) {
  return withErrorHandling(async (req: NextRequest, ...args: any[]) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión primero." }, { status: 401 });
    }
    if (options?.requireAdmin && session.rol !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requiere rol de administrador." }, { status: 403 });
    }
    return handler(req, session);
  });
}

// ==========================================
// Rate Limiter Simple (In-Memory)
// ==========================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
