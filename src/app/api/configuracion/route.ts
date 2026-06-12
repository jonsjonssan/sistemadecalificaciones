import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { randomUUID } from 'crypto';
import { getSession, requireAdmin } from '@/lib/api-middleware';

export const revalidate = 300;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const escuelaId = (session as any).escuelaId;
    if (!escuelaId) {
      return NextResponse.json({ error: 'Escuela no identificada' }, { status: 400 });
    }

    let config = await sql`SELECT * FROM "ConfiguracionSistema" WHERE "escuelaId" = ${escuelaId} LIMIT 1`;

    if (config.length === 0) {
      const id = randomUUID();
      await sql`INSERT INTO "ConfiguracionSistema" (id, "escuelaId", "añoEscolar", "nombreDirectora", "umbralCondicionado", "umbralAprobado") VALUES (${id}, ${escuelaId}, 2026, '_______________________________', 4.50, 6.50)`;
      config = await sql`SELECT * FROM "ConfiguracionSistema" WHERE "escuelaId" = ${escuelaId} LIMIT 1`;
    }

    // Auto-corregir umbrales desfasados en BD (4.49/6.49 → 4.50/6.50)
    const row = config[0];
    const ucRaw = parseFloat(row?.umbralCondicionado ?? 'NaN');
    const uaRaw = parseFloat(row?.umbralAprobado ?? 'NaN');
    const ucNeedsFix = !Number.isNaN(ucRaw) && Math.abs(ucRaw - 4.49) < 0.001;
    const uaNeedsFix = !Number.isNaN(uaRaw) && Math.abs(uaRaw - 6.49) < 0.001;
    const ucIsInvalid = !Number.isNaN(ucRaw) && ucRaw >= (Number.isNaN(uaRaw) ? 10 : uaRaw);
    const uaIsInvalid = !Number.isNaN(uaRaw) && uaRaw <= (Number.isNaN(ucRaw) ? 0 : ucRaw);
    if (ucNeedsFix || uaNeedsFix || ucIsInvalid || uaIsInvalid) {
      const fixedUc = ucNeedsFix || ucIsInvalid || Number.isNaN(ucRaw) ? 4.50 : ucRaw;
      const fixedUa = uaNeedsFix || uaIsInvalid || Number.isNaN(uaRaw) ? 6.50 : uaRaw;
      await sql`UPDATE "ConfiguracionSistema" SET "umbralCondicionado" = ${fixedUc}, "umbralAprobado" = ${fixedUa}, "updatedAt" = NOW() WHERE id = ${row.id}`;
      config = await sql`SELECT * FROM "ConfiguracionSistema" WHERE "escuelaId" = ${escuelaId} LIMIT 1`;
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
    let session;
    try {
      const adminResult = await requireAdmin();
      if (adminResult.error) return adminResult.error;
      session = adminResult.session;
    } catch (authErr: any) {
      console.error('[configuracion/PUT] Auth error:', authErr);
      return NextResponse.json({ error: 'Error de autenticación', details: authErr?.message || String(authErr) }, { status: 401 });
    }



    const escuelaId = (session as any).escuelaId;

    let body;
    try {
      body = await request.json();
    } catch (parseErr: any) {
      return NextResponse.json({ error: 'Body inválido', details: parseErr?.message }, { status: 400 });
    }

    const {
      añoEscolar,
      nombreDirectora,
      umbralRecuperacion,
      umbralCondicionado,
      umbralAprobado,
      notaMinima,
      notaMaxima,
      maxHistorialCelda,
      usarIntervaloReprobado,
      usarIntervaloCondicionado,
      usarIntervaloAprobado,
      fechaInicioT1,
      fechaFinT1,
      fechaInicioT2,
      fechaFinT2,
      fechaInicioT3,
      fechaFinT3,
    } = body;

    let config;
    try {
      config = await sql`SELECT * FROM "ConfiguracionSistema" WHERE "escuelaId" = ${escuelaId} LIMIT 1`;
    } catch (selectErr: any) {
      console.error('[configuracion/PUT] SELECT error:', selectErr);
      return NextResponse.json({ error: 'Error al leer configuración', details: selectErr?.message }, { status: 500 });
    }

    // Normalizar valores para SQL
    const valAño = typeof añoEscolar === 'number' ? añoEscolar : (config[0]?.añoEscolar ?? 2026);
    const valDirectora = typeof nombreDirectora === 'string' ? nombreDirectora : (config[0]?.nombreDirectora ?? '_______________________________');
    const valUmbralRec = typeof umbralRecuperacion === 'number' && !isNaN(umbralRecuperacion) ? umbralRecuperacion : parseFloat(config[0]?.umbralRecuperacion ?? '5.0');

    // Normalizar umbrales: auto-corregir desfase 4.49/6.49 → 4.50/6.50 y asegurar uc < ua
    const bodyUc = parseFloat(umbralCondicionado ?? 'NaN');
    const bodyUa = parseFloat(umbralAprobado ?? 'NaN');
    const dbUc = parseFloat(config[0]?.umbralCondicionado ?? 'NaN');
    const dbUa = parseFloat(config[0]?.umbralAprobado ?? 'NaN');

    let rawUmbralCond = !Number.isNaN(bodyUc) ? bodyUc : (!Number.isNaN(dbUc) ? dbUc : 4.50);
    let rawUmbralApr = !Number.isNaN(bodyUa) ? bodyUa : (!Number.isNaN(dbUa) ? dbUa : 6.50);

    if (Math.abs(rawUmbralCond - 4.49) < 0.001) rawUmbralCond = 4.50;
    if (Math.abs(rawUmbralApr - 6.49) < 0.001) rawUmbralApr = 6.50;
    if (rawUmbralCond >= rawUmbralApr) {
      rawUmbralCond = 4.50;
      rawUmbralApr = 6.50;
    }
    const valUmbralCond = Math.round(rawUmbralCond * 100) / 100;
    const valUmbralApr = Math.round(rawUmbralApr * 100) / 100;

    const bodyMin = parseFloat(notaMinima ?? 'NaN');
    const bodyMax = parseFloat(notaMaxima ?? 'NaN');
    const dbMin = parseFloat(config[0]?.notaMinima ?? 'NaN');
    const dbMax = parseFloat(config[0]?.notaMaxima ?? 'NaN');
    let valNotaMinima = !Number.isNaN(bodyMin) ? bodyMin : (!Number.isNaN(dbMin) ? dbMin : 0.0);
    let valNotaMaxima = !Number.isNaN(bodyMax) ? bodyMax : (!Number.isNaN(dbMax) ? dbMax : 10.0);
    if (valNotaMinima < 0) valNotaMinima = 0.0;
    if (valNotaMaxima > 10) valNotaMaxima = 10.0;
    if (valNotaMinima >= valNotaMaxima) {
      valNotaMinima = 0.0;
      valNotaMaxima = 10.0;
    }
    if (valNotaMinima >= valUmbralCond) valNotaMinima = Math.max(0, valUmbralCond - 0.5);
    if (valNotaMaxima <= valUmbralApr) valNotaMaxima = Math.min(10, valUmbralApr + 0.5);

    const valMaxHist = typeof maxHistorialCelda === 'number' && !isNaN(maxHistorialCelda) ? maxHistorialCelda : (config[0]?.maxHistorialCelda ?? 10);
    const valUsarReprobado = typeof usarIntervaloReprobado === 'boolean' ? usarIntervaloReprobado : (config[0]?.usarIntervaloReprobado ?? true);
    const valUsarCondicionado = typeof usarIntervaloCondicionado === 'boolean' ? usarIntervaloCondicionado : (config[0]?.usarIntervaloCondicionado ?? true);
    const valUsarAprobado = typeof usarIntervaloAprobado === 'boolean' ? usarIntervaloAprobado : (config[0]?.usarIntervaloAprobado ?? true);

    const parseDate = (val: any, fallback: string | null): Date | null => {
      if (val === null || val === undefined || val === '') return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const valFechaInicioT1 = parseDate(fechaInicioT1, null) ?? (config[0]?.fechaInicioT1 ? new Date(config[0].fechaInicioT1) : null);
    const valFechaFinT1 = parseDate(fechaFinT1, null) ?? (config[0]?.fechaFinT1 ? new Date(config[0].fechaFinT1) : null);
    const valFechaInicioT2 = parseDate(fechaInicioT2, null) ?? (config[0]?.fechaInicioT2 ? new Date(config[0].fechaInicioT2) : null);
    const valFechaFinT2 = parseDate(fechaFinT2, null) ?? (config[0]?.fechaFinT2 ? new Date(config[0].fechaFinT2) : null);
    const valFechaInicioT3 = parseDate(fechaInicioT3, null) ?? (config[0]?.fechaInicioT3 ? new Date(config[0].fechaInicioT3) : null);
    const valFechaFinT3 = parseDate(fechaFinT3, null) ?? (config[0]?.fechaFinT3 ? new Date(config[0].fechaFinT3) : null);

    try {
      if (!config || config.length === 0) {
        const id = randomUUID();
        await sql`INSERT INTO "ConfiguracionSistema" (
          id, "escuelaId", "añoEscolar", "nombreDirectora",
          "umbralRecuperacion", "umbralCondicionado", "umbralAprobado",
          "notaMinima", "notaMaxima",
          "maxHistorialCelda",
          "usarIntervaloReprobado", "usarIntervaloCondicionado", "usarIntervaloAprobado",
          "fechaInicioT1", "fechaFinT1", "fechaInicioT2", "fechaFinT2", "fechaInicioT3", "fechaFinT3"
        ) VALUES (
          ${id}, ${escuelaId}, ${valAño}, ${valDirectora},
          ${valUmbralRec}, ${valUmbralCond}, ${valUmbralApr},
          ${valNotaMinima}, ${valNotaMaxima},
          ${valMaxHist},
          ${valUsarReprobado}, ${valUsarCondicionado}, ${valUsarAprobado},
          ${valFechaInicioT1}, ${valFechaFinT1}, ${valFechaInicioT2}, ${valFechaFinT2}, ${valFechaInicioT3}, ${valFechaFinT3}
        )`;
      } else {
        const row = config[0];
        if (!row.id) {
          return NextResponse.json({ error: 'Fila de configuración sin ID válido' }, { status: 500 });
        }
        await sql`UPDATE "ConfiguracionSistema" SET
          "añoEscolar" = ${valAño},
          "nombreDirectora" = ${valDirectora},
          "umbralRecuperacion" = ${valUmbralRec},
          "umbralCondicionado" = ${valUmbralCond},
          "umbralAprobado" = ${valUmbralApr},
          "notaMinima" = ${valNotaMinima},
          "notaMaxima" = ${valNotaMaxima},
          "maxHistorialCelda" = ${valMaxHist},
          "usarIntervaloReprobado" = ${valUsarReprobado},
          "usarIntervaloCondicionado" = ${valUsarCondicionado},
          "usarIntervaloAprobado" = ${valUsarAprobado},
          "fechaInicioT1" = ${valFechaInicioT1},
          "fechaFinT1" = ${valFechaFinT1},
          "fechaInicioT2" = ${valFechaInicioT2},
          "fechaFinT2" = ${valFechaFinT2},
          "fechaInicioT3" = ${valFechaInicioT3},
          "fechaFinT3" = ${valFechaFinT3},
          "updatedAt" = NOW()
        WHERE id = ${row.id}`;
      }

      config = await sql`SELECT * FROM "ConfiguracionSistema" WHERE "escuelaId" = ${escuelaId} LIMIT 1`;
      return NextResponse.json(config[0]);
    } catch (sqlErr: any) {
      console.error('[configuracion/PUT] SQL error:', sqlErr);
      return NextResponse.json(
        { error: 'Error al actualizar configuración', details: sqlErr?.message || String(sqlErr) },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[configuracion/PUT] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperado al actualizar configuración', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await requireAdmin();
    if (adminResult.error) return adminResult.error;

    const escuelaId = (adminResult.session as any).escuelaId;

    let body;
    try {
      body = await request.json();
    } catch (parseErr: any) {
      return NextResponse.json({ error: 'Body inválido', details: parseErr?.message }, { status: 400 });
    }

    let config;
    try {
      config = await sql`SELECT * FROM "ConfiguracionSistema" WHERE "escuelaId" = ${escuelaId} LIMIT 1`;
    } catch (selectErr: any) {
      return NextResponse.json({ error: 'Error al leer configuración', details: selectErr?.message }, { status: 500 });
    }

    const parseDate = (val: any): Date | null => {
      if (val === null || val === undefined || val === '') return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const fechaInicioT1 = parseDate(body.fechaInicioT1);
    const fechaFinT1 = parseDate(body.fechaFinT1);
    const fechaInicioT2 = parseDate(body.fechaInicioT2);
    const fechaFinT2 = parseDate(body.fechaFinT2);
    const fechaInicioT3 = parseDate(body.fechaInicioT3);
    const fechaFinT3 = parseDate(body.fechaFinT3);

    const row = config[0];
    if (!row.id) {
      return NextResponse.json({ error: 'Fila de configuración sin ID válido' }, { status: 500 });
    }

    await sql`UPDATE "ConfiguracionSistema" SET
      "fechaInicioT1" = ${fechaInicioT1},
      "fechaFinT1" = ${fechaFinT1},
      "fechaInicioT2" = ${fechaInicioT2},
      "fechaFinT2" = ${fechaFinT2},
      "fechaInicioT3" = ${fechaInicioT3},
      "fechaFinT3" = ${fechaFinT3},
      "updatedAt" = NOW()
    WHERE id = ${row.id}`;

    config = await sql`SELECT * FROM "ConfiguracionSistema" WHERE "escuelaId" = ${escuelaId} LIMIT 1`;
    return NextResponse.json(config[0]);
  } catch (error: any) {
    console.error('[configuracion/POST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Error inesperado al actualizar fechas de trimestres', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
