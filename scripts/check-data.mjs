import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const total = await prisma.calificacion.count();
  const conExamen = await prisma.calificacion.count({ where: { examenTrimestral: { not: null } } });
  const conAC = await prisma.calificacion.count({ where: { calificacionAC: { not: null } } });
  const conAI = await prisma.calificacion.count({ where: { calificacionAI: { not: null } } });
  console.log({ total, conExamen, conAC, conAI });
  const first5 = await prisma.calificacion.findMany({ take: 5, select: { id: true, estudianteId: true, materiaId: true, examenTrimestral: true, trimestre: true } });
  console.log('Sample:', JSON.stringify(first5, null, 2));
} catch(e) {
  console.error(e);
} finally {
  await prisma.$disconnect();
}
