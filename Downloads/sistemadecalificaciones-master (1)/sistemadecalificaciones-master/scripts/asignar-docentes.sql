-- Script para asignar docentes orientadores a los grados
-- Ejecutar en la consola de la base de datos o mediante npx prisma db execute

-- 1. Verificar que los usuarios docentes existen
SELECT id, nombre, email, rol FROM "Usuario" WHERE email IN (
  'deysi.elizabeth.umanzor@clases.edu.sv',
  '04876579-1@clases.edu.sv',
  'silverio.silverio.monico@clases.edu.sv',
  'emilia.peraza.publicos698@clases.edu.sv',
  'yessenia.carmen.villafuerte@clases.edu.sv',
  'jaqueline.lissette.landaverde@clases.edu.sv',
  'ana.carmen.romero@clases.edu.sv',
  'claudia.jasmin.arce@clases.edu.sv',
  'monica.lissette.tobar@clases.edu.sv'
);

-- 2. Asignar docentes a grados (ajustar los IDs según tu base de datos)
-- Primero obtén los IDs de los docentes:
-- SELECT id, nombre, email FROM "Usuario" WHERE email LIKE '%@clases.edu.sv';

-- Luego actualiza los grados:
-- UPDATE "Grado" SET "docenteId" = (SELECT id FROM "Usuario" WHERE email = 'deysi.elizabeth.umanzor@clases.edu.sv') WHERE numero = 2;
-- UPDATE "Grado" SET "docenteId" = (SELECT id FROM "Usuario" WHERE email = '04876579-1@clases.edu.sv') WHERE numero = 3;
-- UPDATE "Grado" SET "docenteId" = (SELECT id FROM "Usuario" WHERE email = 'silverio.silverio.monico@clases.edu.sv') WHERE numero = 4;
-- UPDATE "Grado" SET "docenteId" = (SELECT id FROM "Usuario" WHERE email = 'emilia.peraza.publicos698@clases.edu.sv') WHERE numero = 5;
-- UPDATE "Grado" SET "docenteId" = (SELECT id FROM "Usuario" WHERE email = 'yessenia.carmen.villafuerte@clases.edu.sv') WHERE numero = 6;
-- UPDATE "Grado" SET "docenteId" = (SELECT id FROM "Usuario" WHERE email = 'jaqueline.lissette.landaverde@clases.edu.sv') WHERE numero = 7;
-- UPDATE "Grado" SET "docenteId" = (SELECT id FROM "Usuario" WHERE email = 'ana.carmen.romero@clases.edu.sv') WHERE numero = 8;
-- UPDATE "Grado" SET "docenteId" = (SELECT id FROM "Usuario" WHERE email = 'claudia.jasmin.arce@clases.edu.sv') WHERE numero = 9;

-- 3. Verificar asignación
SELECT g.numero, g.seccion, u.nombre as docente, u.email 
FROM "Grado" g 
LEFT JOIN "Usuario" u ON g."docenteId" = u.id 
ORDER BY g.numero;
