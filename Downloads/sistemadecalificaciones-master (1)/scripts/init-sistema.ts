import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n Inicialización Completa del Sistema de Calificaciones\n');
  console.log('Este script creará:');
  console.log('  ✅ Grados (2° a 9° "A")');
  console.log('  ✅ Materias para cada grado');
  console.log('  ✅ Usuarios (docentes y directora)');
  console.log('  ✅ Asignaciones de docentes a grados\n');

  const continuar = await askQuestion('¿Continuar? (s/n): ');
  if (continuar.toLowerCase() !== 's') {
    console.log('❌ Cancelado');
    process.exit(0);
  }

  try {
    // 1. Crear grados y materias
    console.log('\n📋 Creando grados y materias...');
    for (let num = 2; num <= 9; num++) {
      const materia6ta = num >= 7 ? "Educación Física y Deportes" : "Desarrollo Corporal";
      const materiasNombres = [
        "Comunicación",
        "Números y Formas",
        "Ciencia y Tecnología",
        "Ciudadanía y Valores",
        "Artes",
        materia6ta,
        "Educación en la Fe",
      ];

      // Verificar si el grado ya existe
      const gradoExistente = await prisma.grado.findFirst({
        where: { numero: num, seccion: 'A' }
      });

      if (gradoExistente) {
        console.log(`  ⚠️  ${num}° "A" ya existe`);
        continue;
      }

      // Crear grado
      const grado = await prisma.grado.create({
        data: {
          numero: num,
          seccion: 'A',
          año: 2026
        }
      });

      console.log(`  ✅ Creado ${num}° "A"`);

      // Crear materias
      for (const nombre of materiasNombres) {
        const materia = await prisma.materia.create({
          data: {
            nombre,
            gradoId: grado.id
          }
        });

        // Crear configs para cada trimestre
        for (let trimestre = 1; trimestre <= 3; trimestre++) {
          await prisma.configActividad.create({
            data: {
              materiaId: materia.id,
              trimestre,
              numActividadesCotidianas: 4,
              numActividadesIntegradoras: 1,
              tieneExamen: true,
              porcentajeAC: 35.0,
              porcentajeAI: 35.0,
              porcentajeExamen: 30.0
            }
          });
        }
        console.log(`    📖 ${nombre}`);
      }
    }

    // 2. Crear directora
    console.log('\n👩‍💼 Creando directora...');
    const directPassword = await askQuestion('  Contraseña para la directora (monica.lissette.tobar@clases.edu.sv): ');
    
    let directUser = await prisma.usuario.findUnique({ 
      where: { email: 'monica.lissette.tobar@clases.edu.sv' } 
    });

    if (!directUser) {
      directUser = await prisma.usuario.create({
        data: {
          email: 'monica.lissette.tobar@clases.edu.sv',
          nombre: 'Mónica Lissette Tobar Gómez',
          password: directPassword,
          rol: 'admin-directora'
        }
      });
      console.log('  ✅ Directora creada');
    } else {
      await prisma.usuario.update({
        where: { id: directUser.id },
        data: { rol: 'admin-directora' }
      });
      console.log('  ✅ Directora actualizada');
    }

    // Configurar nombre de directora
    const config = await prisma.configuracionSistema.findFirst();
    if (config) {
      await prisma.configuracionSistema.update({
        where: { id: config.id },
        data: { nombreDirectora: 'Mónica Lissette Tobar Gómez' }
      });
    } else {
      await prisma.configuracionSistema.create({
        data: {
          añoEscolar: 2026,
          escuela: 'Centro Escolar Católico San José de la Montaña',
          nombreDirectora: 'Mónica Lissette Tobar Gómez'
        }
      });
    }
    console.log('  ✅ Nombre de directora configurado');

    // 3. Crear y asignar docentes orientadores
    const orientadores = [
      { grado: 2, email: 'deysi.elizabeth.umanzor@clases.edu.sv', nombre: 'Deysi Elizabeth Umanzor Cruz' },
      { grado: 3, email: '04876579-1@clases.edu.sv', nombre: 'Yency Yesenia Mejía Nerio' },
      { grado: 4, email: 'silverio.silverio.monico@clases.edu.sv', nombre: 'Silverio Mónico Mulato' },
      { grado: 5, email: 'emilia.peraza.publicos698@clases.edu.sv', nombre: 'Emilia Etel Peraza' },
      { grado: 6, email: 'yessenia.carmen.villafuerte@clases.edu.sv', nombre: 'Yessenia del Carmen Villafuerte Mejía' },
      { grado: 7, email: 'jaqueline.lissette.landaverde@clases.edu.sv', nombre: 'Jaqueline Lissette Landaverde de Gómez' },
      { grado: 8, email: 'ana.carmen.romero@clases.edu.sv', nombre: 'Ana del Carmen Romero González' },
      { grado: 9, email: 'claudia.jasmin.arce@clases.edu.sv', nombre: 'Claudia Jasmin Arce Castillo' },
    ];

    console.log('\n👨‍ Creando docentes orientadores...');
    for (const orientador of orientadores) {
      const password = await askQuestion(`  Contraseña para ${orientador.nombre.split(' ')[0]} (${orientador.email}): `);
      
      let user = await prisma.usuario.findUnique({ where: { email: orientador.email } });

      if (!user) {
        user = await prisma.usuario.create({
          data: {
            email: orientador.email,
            nombre: orientador.nombre,
            password: password,
            rol: 'docente-orientador'
          }
        });
        console.log(`  ✅ ${orientador.nombre.split(' ')[0]} creado`);
      } else {
        await prisma.usuario.update({
          where: { id: user.id },
          data: { rol: 'docente-orientador' }
        });
        console.log(`  ✅ ${orientador.nombre.split(' ')[0]} actualizado`);
      }

      // Asignar al grado
      const grado = await prisma.grado.findFirst({
        where: { numero: orientador.grado, seccion: 'A' }
      });

      if (grado) {
        await prisma.grado.update({
          where: { id: grado.id },
          data: { docenteId: user!.id }
        });
        console.log(`    📌 Asignado a ${orientador.grado}° "A"`);
      }
    }

    console.log('\n✅ ¡Inicialización completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('   • 8 grados creados (2° a 9° "A")');
    console.log('   • 56 materias con configuraciones');
    console.log('   • 1 directora (admin-directora)');
    console.log('   • 8 docentes orientadores (docente-orientador)');
    console.log('\n Ahora puedes hacer login con cualquier usuario creado.');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
