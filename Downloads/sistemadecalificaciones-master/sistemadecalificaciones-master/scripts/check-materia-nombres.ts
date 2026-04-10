import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const materias = await db.materia.findMany({
    where: {
      grado: {
        numero: { in: [2, 3, 4, 5, 6] }
      }
    },
    include: { grado: true },
    orderBy: { grado: { numero: 'asc' } }
  });

  for (const m of materias) {
    const lower = m.nombre.toLowerCase();
    if (lower.includes('lengua') || lower.includes('lenguaje') || lower.includes('comunicaci')) {
      console.log(`Grado ${m.grado.numero}: "${m.nombre}"`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
