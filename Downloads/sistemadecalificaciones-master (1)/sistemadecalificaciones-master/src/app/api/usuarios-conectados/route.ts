import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";

async function getUsuarioSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session) return null;
    const parsed = JSON.parse(session.value);
    if (!parsed || !parsed.id) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session || !["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");

    if (tipo === "usuarios-conectados") {
      const usuariosConectadosQuery = `
        SELECT 
          s.id as session_id,
          s."usuarioId",
          s.ip,
          s."loginAt",
          s."isActive",
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          u.rol as usuario_rol
        FROM "LoginSession" s
        JOIN "Usuario" u ON s."usuarioId" = u.id
        WHERE s."isActive" = true
          AND s."loginAt" > NOW() - INTERVAL '24 hours'
        ORDER BY s."loginAt" DESC
        LIMIT 50
      `;

      const usuariosConectados = await sql.unsafe(usuariosConectadosQuery);

      const conectados = usuariosConectados.map((u: any) => ({
        id: u.session_id,
        usuarioId: u.usuarioId,
        ip: u.ip,
        loginAt: u.loginAt,
        isActive: u.isActive,
        usuario: {
          nombre: u.usuario_nombre,
          email: u.usuario_email,
          rol: u.usuario_rol
        }
      }));

      return NextResponse.json({
        tipo: "usuarios-conectados",
        cantidad: conectados.length,
        usuarios: conectados,
        timestamp: new Date().toISOString()
      });
    }

    if (tipo === "actividad-reciente") {
      const limite = parseInt(searchParams.get("limite") || "20");

      const actividadQuery = `
        (
          SELECT 
            'calificacion' as tipo,
            a.id,
            a."usuarioId",
            a.accion,
            a.entidad,
            a."entidadId",
            a.detalles,
            a."createdAt" as fecha,
            u.nombre as usuario_nombre,
            u.email as usuario_email,
            u.rol as usuario_rol
          FROM "AuditLog" a
          JOIN "Usuario" u ON a."usuarioId" = u.id
          WHERE a."createdAt" > NOW() - INTERVAL '1 hour'
            AND a.entidad = 'Calificacion'
          ORDER BY a."createdAt" DESC
          LIMIT ${limite}
        )
        UNION ALL
        (
          SELECT 
            'asistencia' as tipo,
            a.id,
            a."usuarioId",
            a.accion,
            a.entidad,
            a."entidadId",
            a.detalles,
            a."createdAt" as fecha,
            u.nombre as usuario_nombre,
            u.email as usuario_email,
            u.rol as usuario_rol
          FROM "AuditLog" a
          JOIN "Usuario" u ON a."usuarioId" = u.id
          WHERE a."createdAt" > NOW() - INTERVAL '1 hour'
            AND a.entidad = 'Asistencia'
          ORDER BY a."createdAt" DESC
          LIMIT ${limite}
        )
        ORDER BY fecha DESC
        LIMIT ${limite}
      `;

      const actividad = await sql.unsafe(actividadQuery);

      const actividadFormateada = actividad.map((a: any) => ({
        id: a.id,
        tipo: a.tipo,
        accion: a.accion,
        entidad: a.entidad,
        entidadId: a.entidadId,
        detalles: a.detalles ? JSON.parse(a.detalles) : null,
        fecha: a.fecha,
        usuario: {
          nombre: a.usuario_nombre,
          email: a.usuario_email,
          rol: a.usuario_rol
        }
      }));

      return NextResponse.json({
        tipo: "actividad-reciente",
        cantidad: actividadFormateada.length,
        actividad: actividadFormateada,
        timestamp: new Date().toISOString()
      });
    }

    const usuariosConectadosQuery = `
      SELECT 
        s.id as session_id,
        s."usuarioId",
        s.ip,
        s."loginAt",
        s."isActive",
        u.nombre as usuario_nombre,
        u.email as usuario_email,
        u.rol as usuario_rol
      FROM "LoginSession" s
      JOIN "Usuario" u ON s."usuarioId" = u.id
      WHERE s."isActive" = true
        AND s."loginAt" > NOW() - INTERVAL '24 hours'
      ORDER BY s."loginAt" DESC
      LIMIT 50
    `;

    const usuariosConectados = await sql.unsafe(usuariosConectadosQuery);

    const conectados = usuariosConectados.map((u: any) => ({
      id: u.session_id,
      usuarioId: u.usuarioId,
      ip: u.ip,
      loginAt: u.loginAt,
      isActive: u.isActive,
      usuario: {
        nombre: u.usuario_nombre,
        email: u.usuario_email,
        rol: u.usuario_rol
      }
    }));

    const actividadRecienteQuery = `
      (
        SELECT 
          'calificacion' as tipo,
          a.id,
          a."usuarioId",
          a.accion,
          a.entidad,
          a."entidadId",
          a.detalles,
          a."createdAt" as fecha,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          u.rol as usuario_rol
        FROM "AuditLog" a
        JOIN "Usuario" u ON a."usuarioId" = u.id
        WHERE a."createdAt" > NOW() - INTERVAL '1 hour'
          AND a.entidad = 'Calificacion'
        ORDER BY a."createdAt" DESC
        LIMIT 20
      )
      UNION ALL
      (
        SELECT 
          'asistencia' as tipo,
          a.id,
          a."usuarioId",
          a.accion,
          a.entidad,
          a."entidadId",
          a.detalles,
          a."createdAt" as fecha,
          u.nombre as usuario_nombre,
          u.email as usuario_email,
          u.rol as usuario_rol
        FROM "AuditLog" a
        JOIN "Usuario" u ON a."usuarioId" = u.id
        WHERE a."createdAt" > NOW() - INTERVAL '1 hour'
          AND a.entidad = 'Asistencia'
        ORDER BY a."createdAt" DESC
        LIMIT 20
      )
      ORDER BY fecha DESC
      LIMIT 20
    `;

    const actividadReciente = await sql.unsafe(actividadRecienteQuery);

    const actividad = actividadReciente.map((a: any) => ({
      id: a.id,
      tipo: a.tipo,
      accion: a.accion,
      entidad: a.entidad,
      entidadId: a.entidadId,
      detalles: a.detalles ? JSON.parse(a.detalles) : null,
      fecha: a.fecha,
      usuario: {
        nombre: a.usuario_nombre,
        email: a.usuario_email,
        rol: a.usuario_rol
      }
    }));

    return NextResponse.json({
      usuariosConectados: conectados,
      actividadReciente: actividad,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[usuarios-conectados] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error al obtener datos", details: errMsg }, { status: 500 });
  }
}