import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }

    const usuario = await sql`
      SELECT * FROM "Usuario" WHERE email = ${email}
    `;

    if (usuario.length === 0) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const hashMatch = await bcrypt.compare(password, usuario[0].password);
    const plaintextMatch = password === usuario[0].password;

    if (!hashMatch && !plaintextMatch) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (plaintextMatch && !hashMatch) {
      const hashed = await bcrypt.hash(password, 10);
      await sql`UPDATE "Usuario" SET password = ${hashed} WHERE id = ${usuario[0].id}`;
    }

    if (!usuario[0].activo) {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }

    // Obtener los grados como tutor
    const gradosTutor = await sql`
      SELECT g.id, g.numero, g.seccion, g.año
      FROM "Grado" g
      WHERE g."docenteId" = ${usuario[0].id}
    `;

    // Obtener las materias asignadas
    const materiasAsignadas = await sql`
      SELECT m.id, m.nombre, m."gradoId", gr.numero as grado_numero, gr.seccion as grado_seccion
      FROM "DocenteMateria" dm
      JOIN "Materia" m ON dm."materiaId" = m.id
      JOIN "Grado" gr ON m."gradoId" = gr.id
      WHERE dm."docenteId" = ${usuario[0].id}
    `;

    const cookieStore = await cookies();
    
    const userData = {
      id: usuario[0].id,
      email: usuario[0].email,
      nombre: usuario[0].nombre,
      rol: usuario[0].rol,
      gradosAsignados: gradosTutor.map((g: any) => ({
        id: g.id,
        numero: g.numero,
        seccion: g.seccion,
        año: g.año
      })),
      asignaturasAsignadas: materiasAsignadas.map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        gradoId: m.gradoId,
        gradoNumero: m.grado_numero,
        gradoSeccion: m.grado_seccion
      }))
    };

    console.log("[auth/login] User data to save in session:", JSON.stringify(userData));

    cookieStore.set("session", JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas - sesión más corta
    });

    return NextResponse.json({ usuario: userData });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}