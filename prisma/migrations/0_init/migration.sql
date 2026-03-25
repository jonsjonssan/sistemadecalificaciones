-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grado" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "seccion" TEXT NOT NULL DEFAULT 'A',
    "año" INTEGER NOT NULL DEFAULT 2026,
    "docenteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estudiante" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "gradoId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "gradoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Materia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocenteMateria" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocenteMateria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigActividad" (
    "id" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "trimestre" INTEGER NOT NULL DEFAULT 1,
    "numActividadesCotidianas" INTEGER NOT NULL DEFAULT 4,
    "numActividadesIntegradoras" INTEGER NOT NULL DEFAULT 1,
    "tieneExamen" BOOLEAN NOT NULL DEFAULT true,
    "porcentajeAC" DOUBLE PRECISION NOT NULL DEFAULT 35.0,
    "porcentajeAI" DOUBLE PRECISION NOT NULL DEFAULT 35.0,
    "porcentajeExamen" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigActividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calificacion" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "trimestre" INTEGER NOT NULL DEFAULT 1,
    "actividadesCotidianas" TEXT,
    "calificacionAC" DOUBLE PRECISION,
    "actividadesIntegradoras" TEXT,
    "calificacionAI" DOUBLE PRECISION,
    "examenTrimestral" DOUBLE PRECISION,
    "promedioFinal" DOUBLE PRECISION,
    "recuperacion" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DocenteMateria_docenteId_materiaId_key" ON "DocenteMateria"("docenteId", "materiaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigActividad_materiaId_trimestre_key" ON "ConfigActividad"("materiaId", "trimestre");

-- CreateIndex
CREATE UNIQUE INDEX "Calificacion_estudianteId_materiaId_trimestre_key" ON "Calificacion"("estudianteId", "materiaId", "trimestre");

-- AddForeignKey
ALTER TABLE "Grado" ADD CONSTRAINT "Grado_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estudiante" ADD CONSTRAINT "Estudiante_gradoId_fkey" FOREIGN KEY ("gradoId") REFERENCES "Grado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_gradoId_fkey" FOREIGN KEY ("gradoId") REFERENCES "Grado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocenteMateria" ADD CONSTRAINT "DocenteMateria_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocenteMateria" ADD CONSTRAINT "DocenteMateria_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigActividad" ADD CONSTRAINT "ConfigActividad_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
