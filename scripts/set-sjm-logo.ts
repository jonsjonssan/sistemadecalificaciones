import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const logoPath = "/escuelas/cec-sjm-logo.png";
  const escuela = await prisma.escuela.updateMany({
    where: { codigo: "CEC-SJM" },
    data: { logo: logoPath },
  });

  if (escuela.count === 0) {
    console.log("[set-sjm-logo] No se encontró escuela con código CEC-SJM");
  } else {
    console.log(`[set-sjm-logo] Logo actualizado para CEC-SJM: ${logoPath}`);
  }
}

main()
  .catch((e) => {
    console.error("[set-sjm-logo] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
