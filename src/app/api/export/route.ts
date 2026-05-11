import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

async function getUsuarioSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifySession(session.value);
}

function canAccessGrado(session: any, gradoId: string): boolean {
  if (["admin", "admin-directora", "admin-codirectora"].includes(session.rol)) return true;
  return session.asignaturasAsignadas?.some((m: any) => m.gradoId === gradoId) ?? false;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUsuarioSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const formato = searchParams.get("formato") || "pdf";
    const gradoId = searchParams.get("gradoId");
    const materiaId = searchParams.get("materiaId");
    const trimestre = searchParams.get("trimestre");

    if (gradoId && !canAccessGrado(session, gradoId)) {
      return NextResponse.json({ error: "No tiene acceso a este grado" }, { status: 403 });
    }

    if (tipo === "estudiantes" && gradoId) {
      const estudiantes = await sql`
        SELECT e.id, e.numero, e.nombre, g.numero as grado_numero, g.seccion
        FROM "Estudiante" e
        JOIN "Grado" g ON e."gradoId" = g.id
        WHERE e."gradoId" = ${gradoId} AND e.activo = true
        ORDER BY e.numero
      `;

      if (formato === "excel") {
        return exportEstudiantesExcel(estudiantes);
      }
      return exportEstudiantesPDF(estudiantes);
    }

    if (tipo === "calificaciones") {
      const calificaciones = await sql`
        SELECT 
          e.nombre as estudiante,
          e.numero,
          m.nombre as materia,
          c.trimestre,
          c."calificacionAC",
          c."calificacionAI",
          c."examenTrimestral",
          c."promedioFinal",
          c.recuperacion
        FROM "Calificacion" c
        JOIN "Estudiante" e ON c."estudianteId" = e.id
        JOIN "Materia" m ON c."materiaId" = m.id
        WHERE e."gradoId" = ${gradoId || ""}
          AND (${materiaId} IS NULL OR c."materiaId" = ${materiaId})
          AND (${trimestre} IS NULL OR c.trimestre = ${trimestre})
        ORDER BY e.numero, m.nombre
      `;

      if (formato === "excel") {
        return exportCalificacionesExcel(calificaciones);
      }
      return exportCalificacionesPDF(calificaciones);
    }

    if (tipo === "asistencia" && gradoId) {
      const asistencia = await sql`
        SELECT 
          e.nombre as estudiante,
          e.numero,
          COUNT(*) FILTER (WHERE a.estado = 'presente') as total_presentes,
          COUNT(*) FILTER (WHERE a.estado = 'ausente') as total_ausentes,
          COUNT(*) FILTER (WHERE a.estado = 'justificada') as total_justificadas,
          COUNT(*) FILTER (WHERE a.estado = 'tarde') as total_tardes
        FROM "Asistencia" a
        JOIN "Estudiante" e ON a."estudianteId" = e.id
        WHERE e."gradoId" = ${gradoId}
        GROUP BY e.id, e.nombre, e.numero
        ORDER BY e.numero
      `;

      if (formato === "excel") {
        return exportAsistenciaExcel(asistencia);
      }
      return exportAsistenciaPDF(asistencia);
    }

    if (tipo === "boleta" && gradoId) {
      const boleta = await getBoletaData(gradoId);
      const paperSize = searchParams.get("paperSize") || "letter";
      return exportBoletaPDF(boleta, paperSize === "a4" ? "a4" : "letter");
    }

    return NextResponse.json({ error: "Tipo de exportación inválido" }, { status: 400 });
  } catch (error) {
    console.error("Error al exportar:", error);
    return NextResponse.json({ error: "Error al generar exportación" }, { status: 500 });
  }
}

async function getBoletaData(gradoId: string) {
  const estudiantes = await sql`
    SELECT e.id, e.numero, e.nombre, g.numero as grado_numero, g.seccion
    FROM "Estudiante" e
    JOIN "Grado" g ON e."gradoId" = g.id
    WHERE e."gradoId" = ${gradoId} AND e.activo = true
    ORDER BY e.numero
  `;

  const materias = await sql`
    SELECT id, nombre FROM "Materia" WHERE "gradoId" = ${gradoId}
  `;

  if (estudiantes.length === 0) {
    return { estudiantes, materias, calificaciones: [] };
  }

  const estudianteIds = estudiantes.map((e: any) => e.id);
  const calificaciones = await sql`
    SELECT c."estudianteId", c."materiaId", c.trimestre, c."promedioFinal", c.recuperacion
    FROM "Calificacion" c
    WHERE c."estudianteId" = ANY(${estudianteIds})
  `;

  return { estudiantes, materias, calificaciones };
}

function exportEstudiantesPDF(estudiantes: any[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Lista de Estudiantes", 14, 22);
  
  autoTable(doc, {
    head: [["#", "Nombre", "Grado", "Sección"]],
    body: estudiantes.map((e: any) => [e.numero, e.nombre, `${e.grado_numero}to`, e.seccion]),
    startY: 30,
  });

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=estudiantes.pdf",
    },
  });
}

function exportEstudiantesExcel(estudiantes: any[]) {
  const data = estudiantes.map((e: any) => ({
    "#": e.numero,
    "Nombre": e.nombre,
    "Grado": `${e.grado_numero}to`,
    "Sección": e.seccion,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Estudiantes");
  
  const buffer = Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }));
  
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=estudiantes.xlsx",
    },
  });
}

function exportCalificacionesPDF(calificaciones: any[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Reporte de Calificaciones", 14, 22);
  
  autoTable(doc, {
    head: [["Estudiante", "Materia", "Trim.", "AC", "AI", "Examen", "Promedio", "Recup."]],
    body: calificaciones.map((c: any) => [
      c.estudiante,
      c.materia,
      c.trimestre,
      c.calificacionAC?.toFixed(1) || "-",
      c.calificacionAI?.toFixed(1) || "-",
      c.examenTrimestral?.toFixed(1) || "-",
      c.promedioFinal?.toFixed(1) || "-",
      c.recuperacion?.toFixed(1) || "-",
    ]),
    startY: 30,
  });

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=calificaciones.pdf",
    },
  });
}

function exportCalificacionesExcel(calificaciones: any[]) {
  const data = calificaciones.map((c: any) => ({
    "Estudiante": c.estudiante,
    "Materia": c.materia,
    "Trimestre": c.trimestre,
    "Actividades Cotidianas": c.calificacionAC?.toFixed(1) || "-",
    "Actividades Integradoras": c.calificacionAI?.toFixed(1) || "-",
    "Examen": c.examenTrimestral?.toFixed(1) || "-",
    "Promedio Final": c.promedioFinal?.toFixed(1) || "-",
    "Recuperación": c.recuperacion?.toFixed(1) || "-",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
  
  const buffer = Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }));
  
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=calificaciones.xlsx",
    },
  });
}

function exportAsistenciaPDF(asistencia: any[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Reporte de Asistencia", 14, 22);
  
  autoTable(doc, {
    head: [["Estudiante", "#", "Presentes", "Ausentes", "Justificadas", "Tardes"]],
    body: asistencia.map((a: any) => [
      a.estudiante,
      a.numero,
      a.total_presentes,
      a.total_ausentes,
      a.total_justificadas,
      a.total_tardes,
    ]),
    startY: 30,
  });

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=asistencia.pdf",
    },
  });
}

function exportAsistenciaExcel(asistencia: any[]) {
  const data = asistencia.map((a: any) => ({
    "Estudiante": a.estudiante,
    "#": a.numero,
    "Presentes": a.total_presentes,
    "Ausentes": a.total_ausentes,
    "Justificadas": a.total_justificadas,
    "Tardes": a.total_tardes,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
  
  const buffer = Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }));
  
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=asistencia.xlsx",
    },
  });
}

function exportBoletaPDF(data: any, format: "letter" | "a4" = "letter") {
  const doc = new jsPDF({ format });
  const { estudiantes, materias, calificaciones } = data;

  for (const estudiante of estudiantes) {
    if (estudiante.numero > 1) {
      doc.addPage();
    }

    doc.setFontSize(16);
    doc.text("BOLETA DE CALIFICACIONES", 70, 20);
    
    doc.setFontSize(12);
    doc.text(`Estudiante: ${estudiante.nombre}`, 14, 35);
    doc.text(`Grado: ${estudiante.grado_numero}to "${estudiante.seccion}"`, 14, 42);

    const estudianteCalificaciones = calificaciones.filter(
      (c: any) => c.estudianteId === estudiante.id
    );

    const rows: any[] = [];
    for (const materia of materias) {
      const trim1 = estudianteCalificaciones.find(
        (c: any) => c.materiaId === materia.id && c.trimestre === 1
      );
      const trim2 = estudianteCalificaciones.find(
        (c: any) => c.materiaId === materia.id && c.trimestre === 2
      );
      const trim3 = estudianteCalificaciones.find(
        (c: any) => c.materiaId === materia.id && c.trimestre === 3
      );

      const prom1 = trim1?.recuperacion != null && trim1.recuperacion > (trim1.promedioFinal || 0)
        ? trim1.recuperacion : trim1?.promedioFinal;
      const prom2 = trim2?.recuperacion != null && trim2.recuperacion > (trim2.promedioFinal || 0)
        ? trim2.recuperacion : trim2?.promedioFinal;
      const prom3 = trim3?.recuperacion != null && trim3.recuperacion > (trim3.promedioFinal || 0)
        ? trim3.recuperacion : trim3?.promedioFinal;

      const promFinal = prom1 != null && prom2 != null && prom3 != null
        ? ((prom1 + prom2 + prom3) / 3).toFixed(1)
        : "-";

      rows.push([
        materia.nombre,
        prom1?.toFixed(1) || "-",
        prom2?.toFixed(1) || "-",
        prom3?.toFixed(1) || "-",
        promFinal,
      ]);
    }

    autoTable(doc, {
      head: [["Materia", "Trim. 1", "Trim. 2", "Trim. 3", "Promedio"]],
      body: rows,
      startY: 50,
    });
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=boleta-${estudiantes[0]?.nombre || "calificaciones"}.pdf`,
    },
  });
}
