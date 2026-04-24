import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const revalidate = 300;

// Obtener configuración del sistema
export async function GET() {
  try {
    let config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;

    // Si no existe, crear configuración inicial
    if (config.length === 0) {
      const id = randomUUID();
      await sql`INSERT INTO "ConfiguracionSistema" (id, "añoEscolar", escuela, "nombreDirectora") VALUES (${id}, 2026, 'Centro Escolar', '_______________________________')`;
      config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;
    }

    return NextResponse.json(config[0]);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

// Actualizar configuración (solo admin)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const usuario = JSON.parse(session.value);
    if (usuario.rol !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden cambiar la configuración.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { añoEscolar, escuela, nombreDirectora } = body;

    let config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;

    if (config.length === 0) {
      const id = randomUUID();
      await sql`INSERT INTO "ConfiguracionSistema" (id, "añoEscolar", escuela, "nombreDirectora") VALUES (${id}, ${añoEscolar || 2026}, ${escuela || 'Centro Escolar'}, ${nombreDirectora || '_______________________________'})`;
      config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;
    } else {
      await sql`UPDATE "ConfiguracionSistema" SET 
        "añoEscolar" = ${añoEscolar !== undefined ? añoEscolar : config[0].añoEscolar}, 
        escuela = ${escuela !== undefined ? escuela : config[0].escuela}, 
        "nombreDirectora" = ${nombreDirectora !== undefined ? nombreDirectora : config[0].nombreDirectora}, 
        "updatedAt" = NOW() 
      WHERE id = ${config[0].id}`;
      config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;
    }

    return NextResponse.json(config[0]);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
