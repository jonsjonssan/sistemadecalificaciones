-- Migración idempotente: añade multi-tenencia (tabla Escuela + escuelaId en todas las tablas)
-- Segura: preserva datos existentes, rellena escuelaId con la escuela por defecto.

BEGIN;

-- 1. Crear tabla Escuela (si no existe)
CREATE TABLE IF NOT EXISTS "Escuela" (
  id              TEXT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  codigo          TEXT UNIQUE,
  direccion       TEXT,
  distrito        TEXT,
  tipo            TEXT NOT NULL DEFAULT 'publico',
  "planEstudio"   TEXT NOT NULL DEFAULT 'general',
  "escalaNotas"   TEXT NOT NULL DEFAULT '0-10',
  periodos        TEXT NOT NULL DEFAULT 'trimestres',
  logo            TEXT,
  "colorPrimario" TEXT NOT NULL DEFAULT '#1a3a2a',
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Escuela_codigo_idx" ON "Escuela"(codigo);

-- 2. Insertar escuela por defecto si no existe
INSERT INTO "Escuela" (id, nombre, codigo, tipo, direccion, activo)
SELECT 'escuela-default-cec', 'CEC San José de la Montaña', 'CEC-SJM', 'religioso', 'República Dominicana', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Escuela" WHERE id = 'escuela-default-cec');

-- Helper: añadir columna + backfill + NOT NULL + index + FK de forma idempotente
DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'Usuario','Grado','Estudiante','Materia','DocenteMateria',
    'ConfigActividad','Calificacion','NotaActividad','Asistencia',
    'ConfiguracionSistema','ObservacionBoleta','RecuperacionAnual',
    'AuditLog','HistorialCalificacion','LoginSession','AgentAlert','AgentLog'
  ];
  col_exists BOOLEAN;
  fk_exists BOOLEAN;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- ADD COLUMN IF NOT EXISTS
    EXECUTE format('ALTER TABLE "%s" ADD COLUMN IF NOT EXISTS "escuelaId" TEXT', t);

    -- Backfill
    EXECUTE format('UPDATE "%s" SET "escuelaId" = ''escuela-default-cec'' WHERE "escuelaId" IS NULL', t);

    -- SET NOT NULL
    EXECUTE format('ALTER TABLE "%s" ALTER COLUMN "escuelaId" SET NOT NULL', t);

    -- INDEX (CREATE INDEX IF NOT EXISTS)
    EXECUTE format('CREATE INDEX IF NOT EXISTS "%s_escuelaId_idx" ON "%s"("escuelaId")', t, t);

    -- FK (verificar si existe antes de crear)
    SELECT EXISTS(
      SELECT 1 FROM pg_constraint
      WHERE conname = t || '_escuelaId_fkey'
    ) INTO fk_exists;
    IF NOT fk_exists THEN
      EXECUTE format('ALTER TABLE "%s" ADD CONSTRAINT "%s_escuelaId_fkey" FOREIGN KEY ("escuelaId") REFERENCES "Escuela"(id) ON DELETE CASCADE ON UPDATE CASCADE', t, t);
    END IF;
  END LOOP;
END $$;

-- Unique constraints específicos del schema
DO $$
BEGIN
  -- Usuario (email, escuelaId)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Usuario_email_escuelaId_key') THEN
    ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_email_escuelaId_key" UNIQUE (email, "escuelaId");
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Usuario unique: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Grado (numero, seccion, año, escuelaId)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grado_numero_seccion_año_escuelaId_key') THEN
    ALTER TABLE "Grado" ADD CONSTRAINT "Grado_numero_seccion_año_escuelaId_key" UNIQUE (numero, seccion, año, "escuelaId");
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Grado unique: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Calificacion (escuelaId) - unique single
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Calificacion_escuelaId_key') THEN
    ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_escuelaId_key" UNIQUE ("escuelaId");
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Calificacion unique: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- ConfiguracionSistema (escuelaId) - unique single
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConfiguracionSistema_escuelaId_key') THEN
    ALTER TABLE "ConfiguracionSistema" ADD CONSTRAINT "ConfiguracionSistema_escuelaId_key" UNIQUE ("escuelaId");
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'ConfiguracionSistema unique: %', SQLERRM;
END $$;

COMMIT;
