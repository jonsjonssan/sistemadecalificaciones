import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/api-middleware';

export const revalidate = 300;

export async function GET() {
  try {
    let config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;

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

export async function PUT(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const { añoEscolar, escuela, nombreDirectora, umbralRecuperacion, umbralCondicionado, umbralAprobado, maxHistorialCelda } = body;

    let config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;

    if (config.length === 0) {
      const id = randomUUID();
      await sql`INSERT INTO "ConfiguracionSistema" (id, "añoEscolar", escuela, "nombreDirectora", "umbralRecuperacion", "umbralCondicionado", "umbralAprobado", "maxHistorialCelda") VALUES (${id}, ${añoEscolar || 2026}, ${escuela || 'Centro Escolar'}, ${nombreDirectora || '_______________________________'}, ${umbralRecuperacion ?? 5.0}, ${umbralCondicionado ?? 4.5}, ${umbralAprobado ?? 6.5}, ${maxHistorialCelda ?? 10})`;
      config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;
    } else {
      await sql`UPDATE "ConfiguracionSistema" SET 
        "añoEscolar" = ${añoEscolar !== undefined ? añoEscolar : config[0].añoEscolar}, 
        escuela = ${escuela !== undefined ? escuela : config[0].escuela}, 
        "nombreDirectora" = ${nombreDirectora !== undefined ? nombreDirectora : config[0].nombreDirectora},
        "umbralRecuperacion" = ${umbralRecuperacion !== undefined ? umbralRecuperacion : config[0].umbralRecuperacion ?? 5.0},
        "umbralCondicionado" = ${umbralCondicionado !== undefined ? umbralCondicionado : config[0].umbralCondicionado ?? 4.5},
        "umbralAprobado" = ${umbralAprobado !== undefined ? umbralAprobado : config[0].umbralAprobado ?? 6.5},
        "maxHistorialCelda" = ${maxHistorialCelda !== undefined ? maxHistorialCelda : config[0].maxHistorialCelda ?? 10},
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
