-- Migración: agregar columna numExamenes a ConfigActividad
-- Ejecutar en la base de datos (Neon/PostgreSQL)

ALTER TABLE "ConfigActividad" ADD COLUMN IF NOT EXISTS "numExamenes" INTEGER NOT NULL DEFAULT 1;
