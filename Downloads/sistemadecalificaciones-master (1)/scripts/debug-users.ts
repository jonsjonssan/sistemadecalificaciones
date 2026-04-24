import { sql } from "@/lib/neon";

async function main() {
  const usuarios = await sql`
    SELECT u.id, u.email, u.nombre, u.rol, u.activo
    FROM "Usuario" u
    ORDER BY u.nombre
  `;
  
  console.log("=== USUARIOS ===");
  console.log(JSON.stringify(usuarios, null, 2));
  
  for (const u of usuarios) {
    const gradosTutor = await sql`
      SELECT g.id, g.numero
      FROM "Grado" g
      WHERE g."docenteId" = ${u.id}
    `;
    
    const materiasAsignadas = await sql`
      SELECT m.id, m.nombre, m."gradoId"
      FROM "DocenteMateria" dm
      JOIN "Materia" m ON dm."materiaId" = m.id
      WHERE dm."docenteId" = ${u.id}
    `;
    
    console.log(`\n${u.nombre} (${u.email})`);
    console.log(`  Rol: ${u.rol}, Activo: ${u.activo}`);
    console.log(`  Grados como tutor: ${JSON.stringify(gradosTutor)}`);
    console.log(`  Materias asignadas: ${JSON.stringify(materiasAsignadas)}`);
  }
}

main().catch(console.error);