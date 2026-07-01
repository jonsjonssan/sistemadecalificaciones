"use client";

import { useState, useMemo } from "react";
import { Printer, Loader2, X, CheckSquare, Square, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CICLOS } from "@/lib/ciclos";

interface Grado {
  id: string;
  numero: number;
  seccion: string;
  año?: number;
}

interface Estudiante {
  id: string;
  numero: number;
  nombre: string;
  email?: string;
  activo?: boolean;
}

interface ImprimirEstudiantesLoteProps {
  grados: Grado[];
  darkMode: boolean;
  paperSize?: "letter" | "a4";
}

export function ImprimirEstudiantesLote({ grados, darkMode, paperSize = "letter" }: ImprimirEstudiantesLoteProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const gradosOrdenados = useMemo(() => {
    return [...grados].sort((a, b) => {
      if (a.numero !== b.numero) return a.numero - b.numero;
      return (a.seccion || "").localeCompare(b.seccion || "");
    });
  }, [grados]);

  const gradosPorCiclo = useMemo(() => {
    return CICLOS.map((ciclo) => ({
      ...ciclo,
      grados: gradosOrdenados.filter((g) => ciclo.grados.includes(g.numero)),
    })).filter((c) => c.grados.length > 0);
  }, [gradosOrdenados]);

  const toggleGrado = (gradoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(gradoId)) next.delete(gradoId);
      else next.add(gradoId);
      return next;
    });
  };

  const toggleCiclo = (cicloGrados: Grado[]) => {
    const gradosDelCiclo = cicloGrados.map((g) => g.id);
    const todosSeleccionados = gradosDelCiclo.every((id) => selected.has(id));

    setSelected((prev) => {
      const next = new Set(prev);
      gradosDelCiclo.forEach((id) => {
        if (todosSeleccionados) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const seleccionarTodos = () => {
    setSelected(new Set(gradosOrdenados.map((g) => g.id)));
  };

  const limpiarSeleccion = () => {
    setSelected(new Set());
  };

  const cicloTotalSeleccionado = (cicloGrados: Grado[]) => {
    const ids = cicloGrados.map((g) => g.id);
    if (ids.length === 0) return false;
    return ids.every((id) => selected.has(id));
  };

  const cicloParcialSeleccionado = (cicloGrados: Grado[]) => {
    const ids = cicloGrados.map((g) => g.id);
    return ids.some((id) => selected.has(id)) && !ids.every((id) => selected.has(id));
  };

  const fetchEstudiantesGrado = async (gradoId: string): Promise<Estudiante[]> => {
    try {
      const res = await fetch(`/api/estudiantes?gradoId=${gradoId}&activos=true&_=${Date.now()}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.estudiantes || [];
    } catch {
      return [];
    }
  };

  const generarPDF = async () => {
    if (selected.size === 0) return;

    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: paperSize === "a4" ? "a4" : "letter",
      });

      const gradosSeleccionados = gradosOrdenados.filter((g) => selected.has(g.id));
      const fecha = new Date().toLocaleDateString("es-SV", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      let primeraPagina = true;

      for (const grado of gradosSeleccionados) {
        const estudiantes = await fetchEstudiantesGrado(grado.id);
        if (estudiantes.length === 0) continue;

        estudiantes.sort((a, b) => a.numero - b.numero);

        if (!primeraPagina) {
          doc.addPage();
        }
        primeraPagina = false;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Centro Escolar Católico San José de la Montaña", 14, 14);
        doc.setFontSize(10);
        doc.text(`Listado de Estudiantes - ${grado.numero}° "${grado.seccion}"`, 14, 21);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Total: ${estudiantes.length} estudiantes | Fecha: ${fecha}`, 14, 27);

        autoTable(doc, {
          head: [["N°", "Nombre completo", "Correo electrónico"]],
          body: estudiantes.map((e) => [String(e.numero), e.nombre, e.email || "—"]),
          startY: 32,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 12, halign: "center" },
            1: { cellWidth: "auto" },
            2: { cellWidth: "auto" },
          },
          margin: { top: 14, left: 14, right: 14, bottom: 14 },
        });
      }

      if (primeraPagina) {
        doc.setFontSize(12);
        doc.text("No se encontraron estudiantes en los grados seleccionados.", 14, 20);
      }

      doc.save(`listado_estudiantes_lote_${new Date().toISOString().slice(0, 10)}.pdf`);
      setOpen(false);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Ocurrió un error al generar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`h-10 text-xs sm:text-sm ${darkMode ? "border-white/30 text-white hover-gradient-strong" : ""}`}
        >
          <Printer className="h-4 w-4 mr-1" />
          Imprimir por Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95vw] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Imprimir listado de estudiantes por lote
          </DialogTitle>
          <DialogDescription>
            Selecciona los ciclos completos o los grados específicos que deseas incluir en el PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Botones de acción rápida */}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={seleccionarTodos} className="h-8 text-xs">
              <CheckSquare className="h-3.5 w-3.5 mr-1" />
              Todos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={limpiarSeleccion} className="h-8 text-xs">
              <X className="h-3.5 w-3.5 mr-1" />
              Ninguno
            </Button>
          </div>

          {/* Ciclos */}
          {gradosPorCiclo.map((ciclo) => {
            const total = ciclo.grados.length;
            const seleccionados = ciclo.grados.filter((g) => selected.has(g.id)).length;
            const totalSeleccionado = cicloTotalSeleccionado(ciclo.grados);
            const parcial = cicloParcialSeleccionado(ciclo.grados);

            return (
              <div
                key={ciclo.nombre}
                className={`rounded-lg border p-3 ${darkMode ? "border-white/10 bg-slate-950/40" : "border-slate-200 bg-slate-50/50"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold">{ciclo.nombre}</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Grados {ciclo.grados[0]?.numero}° a {ciclo.grados[ciclo.grados.length - 1]?.numero}°
                      {seleccionados > 0 && ` · ${seleccionados} de ${total} seleccionados`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCiclo(ciclo.grados)}
                    className="h-8 text-xs gap-1 px-2"
                  >
                    {totalSeleccionado ? (
                      <>
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Desmarcar</span>
                      </>
                    ) : parcial ? (
                      <>
                        <Square className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Completar</span>
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4" />
                        <span className="hidden sm:inline">Seleccionar</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ciclo.grados.map((grado) => (
                    <label
                      key={grado.id}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer transition-colors ${
                        selected.has(grado.id)
                          ? darkMode
                            ? "border-primary/50 bg-primary/10"
                            : "border-primary/40 bg-primary/5"
                          : darkMode
                          ? "border-white/10 hover:border-white/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Checkbox
                        checked={selected.has(grado.id)}
                        onCheckedChange={() => toggleGrado(grado.id)}
                        id={`grado-${grado.id}`}
                        aria-label={`${grado.numero}° ${grado.seccion}`}
                      />
                      <span className="text-xs font-medium truncate">
                        {grado.numero}° "{grado.seccion}"
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {gradosOrdenados.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No hay grados disponibles para imprimir.
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="text-xs text-muted-foreground self-center sm:self-auto">
            {selectedCount === 0
              ? "No has seleccionado ningún grado"
              : `${selectedCount} grado${selectedCount === 1 ? "" : "s"} seleccionado${selectedCount === 1 ? "" : "s"}`}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={generarPDF}
              disabled={selectedCount === 0 || loading}
              className="gap-1"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {loading ? "Generando..." : "Imprimir PDF"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
