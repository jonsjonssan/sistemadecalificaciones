import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const asignaciones = [
    { grado: 2, email: 'deysi.elizabeth.umanzor@clases.edu.sv' },
    { grado: 3, email: '04876579-1@clases.edu.sv' },
    { grado: 4, email: 'silverio.silverio.monico@clases.edu.sv' },
    { grado: 5, email: 'emilia.peraza.publicos698@clases.edu.sv' },
    { grado: 6, email: 'yessenia.carmen.villafuerte@clases.edu.sv' },
    { grado: 7, email: 'jaqueline.lissette.landaverde@clases.edu.sv' },
    { grado: 8, email: 'ana.carmen.romero@clases.edu.sv' },
    { grado: 9, email: 'claudia.jasmin.arce@clases.edu.sv' }
  ];

  console.log('\n Asignando docentes a grados...\n');

  for (const asig of asignaciones) {
    const grado = await prisma.grado.findFirst({ where: { numero: asig.grado, seccion: 'A' } });
    const usuario = await prisma.usuario.findUnique({ where: { email: asig.email } });
    
    if (grado && usuario) {
      await prisma.grado.update({
        where: { id: grado.id },
        data: { docenteId: usuario.id }
      });
      console.log('✅ ' + asig.grado + '° A -> ' + usuario.nombre);
    } else {
      console.log('❌ Error: ' + asig.grado + '° A o usuario no encontrado');
    }
  }

  // Configurar directora
  const config = await prisma.configuracionSistema.findFirst();
  if (config) {
    await prisma.configuracionSistema.update({
      where: { id: config.id },
      data: { nombreDirectora: 'Mónica Lissette Tobar Gómez' }
    });
    console.log('\n✅ Directora configurada: Mónica Lissette Tobar Gómez');
  }

  await prisma.$disconnect();
  console.log('\n✅ Asignación completada!\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
