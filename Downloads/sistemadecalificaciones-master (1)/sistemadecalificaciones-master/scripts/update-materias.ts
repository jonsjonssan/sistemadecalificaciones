import { sql } from "../src/lib/neon";

async function main() {
  console.log("Actualizando materias...");
  
  const grados = await sql`SELECT id, numero FROM "Grado" WHERE numero >= 7`;
  console.log("Grados encontrados:", grados.length);
  
  for (const grado of grados) {
    const materia = await sql`SELECT id, nombre FROM "Materia" WHERE "gradoId" = ${grado.id} AND nombre = 'Desarrollo Corporal'`;
    
    if (materia.length > 0) {
      console.log(`Grado ${grado.numero}: ${materia[0].nombre} -> Educación Física y Deportes`);
      await sql`UPDATE "Materia" SET nombre = 'Educación Física y Deportes' WHERE id = ${materia[0].id}`;
    }
  }
  
  console.log("Done!");
}

main().catch(console.error);
