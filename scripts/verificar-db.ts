import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando conexión a base de datos...\n');

  try {
    // 1. Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos\n');

    // 2. Mostrar URL de conexión (ocultando credenciales)
    const databaseUrl = process.env.DATABASE_URL || 'No configurada';
    const maskedUrl = databaseUrl.replace(/\/\/[^@]+@/, '//***:***@');
    console.log('📡 DATABASE_URL:', maskedUrl);

    // 3. Contar registros existentes
    console.log('\n📊 Estado actual de la base de datos:\n');

    const gradosCount = await prisma.grado.count();
    console.log(`  Grados: ${gradosCount}`);

    const usuariosCount = await prisma.usuario.count();
    console.log(`  Usuarios: ${usuariosCount}`);

    const materiasCount = await prisma.materia.count();
    console.log(`  Materias: ${materiasCount}`);

    const estudiantesCount = await prisma.estudiante.count();
    console.log(`  Estudiantes: ${estudiantesCount}`);

    const configCount = await prisma.configuracionSistema.count();
    console.log(`  Configuraciones: ${configCount}`);

    // 4. Si hay grados, mostrarlos
    if (gradosCount > 0) {
      console.log('\n📋 Grados existentes:');
      const grados = await prisma.grado.findMany({
        include: { docente: true },
        orderBy: { numero: 'asc' }
      });
      grados.forEach(g => {
        console.log(`  • ${g.numero}° "${g.seccion}" - Docente: ${g.docente?.nombre || 'Sin asignar'}`);
      });
    } else {
      console.log('\n⚠️  No hay grados en la base de datos');
      console.log('   Ejecuta: npx tsx scripts/init-sistema.ts\n');
    }

    // 5. Si hay usuarios, mostrar roles
    if (usuariosCount > 0) {
      console.log('\n👥 Usuarios existentes:');
      const usuarios = await prisma.usuario.findMany({
        select: { nombre: true, email: true, rol: true }
      });
      usuarios.forEach(u => {
        console.log(`  • ${u.nombre} (${u.email}) - Rol: ${u.rol}`);
      });
    }

    // 6. Verificar configuración del sistema
    if (configCount > 0) {
      const config = await prisma.configuracionSistema.findFirst();
      if (config) {
        console.log('\n⚙️  Configuración del sistema:');
        console.log(`  • Año escolar: ${config.añoEscolar}`);
        console.log(`  • Escuela: ${config.escuela}`);
        console.log(`  • Directora: ${config.nombreDirectora || 'No configurada'}`);
      }
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error: any) {
    console.error('\n❌ Error de conexión:\n');
    console.error(error.message || error);
    console.error('\n💡 Posibles causas:');
    console.error('  1. DATABASE_URL no configurada en .env');
    console.error('  2. Credenciales incorrectas');
    console.error('  3. Base de datos no accesible');
    console.error('  4. Firewall bloqueando conexión\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
