import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/api-middleware';

export const revalidate = 300;

export async function GET() {
  try {
    // Asegurar que las columnas nuevas existen (migración segura idempotente)
    await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "usarIntervaloReprobado" BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "usarIntervaloCondicionado" BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "usarIntervaloAprobado" BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "maxHistorialCelda" INTEGER DEFAULT 10`;
    await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "notaMinima" FLOAT DEFAULT 0.0`;
    await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "notaMaxima" FLOAT DEFAULT 10.0`;

    let config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;

    if (config.length === 0) {
      const id = randomUUID();
      await sql`INSERT INTO "ConfiguracionSistema" (id, "añoEscolar", escuela, "nombreDirectora", "umbralCondicionado", "umbralAprobado") VALUES (${id}, 2026, 'Centro Escolar', '_______________________________', 4.50, 6.50)`;
      config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;
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
    let session;
    try {
      const adminResult = await requireAdmin();
      if (adminResult.error) return adminResult.error;
      session = adminResult.session;
    } catch (authErr: any) {
      console.error('[configuracion/PUT] Auth error:', authErr);
      return NextResponse.json({ error: 'Error de autenticación', details: authErr?.message || String(authErr) }, { status: 401 });
    }

    // Asegurar que las columnas nuevas existen (migración segura idempotente)
    try {
      await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "usarIntervaloReprobado" BOOLEAN DEFAULT true`;
      await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "usarIntervaloCondicionado" BOOLEAN DEFAULT true`;
      await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "usarIntervaloAprobado" BOOLEAN DEFAULT true`;
      await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "maxHistorialCelda" INTEGER DEFAULT 10`;
      await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "notaMinima" FLOAT DEFAULT 0.0`;
      await sql`ALTER TABLE "ConfiguracionSistema" ADD COLUMN IF NOT EXISTS "notaMaxima" FLOAT DEFAULT 10.0`;
    } catch (alterErr: any) {
      console.error('[configuracion/PUT] ALTER TABLE error:', alterErr);
      // No bloquear si ALTER falla (puede ser por permisos); continuar con la lógica
    }

    let body;
    try {
      body = await request.json();
    } catch (parseErr: any) {
      return NextResponse.json({ error: 'Body inválido', details: parseErr?.message }, { status: 400 });
    }

    const {
      añoEscolar,
      escuela,
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
    } = body;

    let config;
    try {
      config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;
    } catch (selectErr: any) {
      console.error('[configuracion/PUT] SELECT error:', selectErr);
      return NextResponse.json({ error: 'Error al leer configuración', details: selectErr?.message }, { status: 500 });
    }

    // Normalizar valores para SQL
    const valAño = typeof añoEscolar === 'number' ? añoEscolar : (config[0]?.añoEscolar ?? 2026);
    const valEscuela = typeof escuela === 'string' ? escuela : (config[0]?.escuela ?? 'Centro Escolar');
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

    try {
      if (!config || config.length === 0) {
        const id = randomUUID();
        await sql`INSERT INTO "ConfiguracionSistema" (
          id, "añoEscolar", escuela, "nombreDirectora",
          "umbralRecuperacion", "umbralCondicionado", "umbralAprobado",
          "notaMinima", "notaMaxima",
          "maxHistorialCelda",
          "usarIntervaloReprobado", "usarIntervaloCondicionado", "usarIntervaloAprobado"
        ) VALUES (
          ${id}, ${valAño}, ${valEscuela}, ${valDirectora},
          ${valUmbralRec}, ${valUmbralCond}, ${valUmbralApr},
          ${valNotaMinima}, ${valNotaMaxima},
          ${valMaxHist},
          ${valUsarReprobado}, ${valUsarCondicionado}, ${valUsarAprobado}
        )`;
      } else {
        const row = config[0];
        if (!row.id) {
          return NextResponse.json({ error: 'Fila de configuración sin ID válido' }, { status: 500 });
        }
        await sql`UPDATE "ConfiguracionSistema" SET
          "añoEscolar" = ${valAño},
          escuela = ${valEscuela},
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
          "updatedAt" = NOW()
        WHERE id = ${row.id}`;
      }

      config = await sql`SELECT * FROM "ConfiguracionSistema" LIMIT 1`;
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
