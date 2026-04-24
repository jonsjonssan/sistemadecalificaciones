import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n📚 Configuración de Docentes Orientadores y Directora\n');
  console.log('Este script asignará los docentes orientadores a sus grados correspondientes');
  console.log('y configurará a la directora del sistema.\n');

  // Docentes orientadores por grado
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

  // Directora
  const directora = {
    email: 'monica.lissette.tobar@clases.edu.sv',
    nombre: 'Mónica Lissette Tobar Gómez'
  };

  try {
    // 1. Verificar/crear directora
    console.log('\n Verificando directora...');
    let directUser = await prisma.usuario.findUnique({ where: { email: directora.email } });

    if (!directUser) {
      console.log(`📝 Creando usuario para la directora: ${directora.nombre}`);
      const password = await askQuestion('Contraseña para la directora: ');
      directUser = await prisma.usuario.create({
        data: {
          email: directora.email,
          nombre: directora.nombre,
          password: password,
          rol: 'admin-directora'
        }
      });
    } else {
      console.log(`✅ Directora encontrada: ${directUser.nombre}`);
      // Actualizar rol si es necesario
      await prisma.usuario.update({
        where: { id: directUser.id },
        data: { rol: 'admin-directora' }
      });
    }

    // 2. Configurar nombre de directora en ConfiguracionSistema
    console.log('\n📝 Configurando nombre de directora en el sistema...');
    const config = await prisma.configuracionSistema.findFirst();
    if (config) {
      await prisma.configuracionSistema.update({
        where: { id: config.id },
        data: { nombreDirectora: directora.nombre }
      });
      console.log(`✅ Directora configurada: ${directora.nombre}`);
    } else {
      await prisma.configuracionSistema.create({
        data: {
          añoEscolar: 2026,
          escuela: 'Centro Escolar Católico San José de la Montaña',
          nombreDirectora: directora.nombre
        }
      });
      console.log(`✅ Configuración creada con directora: ${directora.nombre}`);
    }

    // 3. Asignar docentes orientadores a grados
    console.log('\n Asignando docentes orientadores a grados...');
    for (const orientador of orientadores) {
      console.log(`\n📋 Grado ${orientador.grado}° - ${orientador.nombre}`);
      
      // Buscar o crear usuario
      let user = await prisma.usuario.findUnique({ where: { email: orientador.email } });

      if (!user) {
        console.log(`   📝 Creando usuario...`);
        const password = await askQuestion(`   Contraseña para ${orientador.nombre}: `);
        user = await prisma.usuario.create({
          data: {
            email: orientador.email,
            nombre: orientador.nombre,
            password: password,
            rol: 'docente-orientador'
          }
        });
      } else {
        console.log(`   ✅ Usuario encontrado`);
        // Actualizar rol
        await prisma.usuario.update({
          where: { id: user.id },
          data: { rol: 'docente-orientador' }
        });
      }

      // Asignar al grado
      const grado = await prisma.grado.findFirst({
        where: { numero: orientador.grado, seccion: 'A' }
      });

      if (grado) {
        await prisma.grado.update({
          where: { id: grado.id },
          data: { docenteId: user.id }
        });
        console.log(`   ✅ ${orientador.nombre} asignado como orientador de ${orientador.grado}° "A"`);
      } else {
        console.log(`   ⚠️  Grado ${orientador.grado}° "A" no encontrado`);
      }
    }

    console.log('\n✅ ¡Configuración completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   Directora: ${directora.nombre}`);
    orientadores.forEach(o => {
      console.log(`   Grado ${o.grado}°: ${o.nombre}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
