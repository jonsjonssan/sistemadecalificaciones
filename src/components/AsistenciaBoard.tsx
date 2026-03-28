"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Save, RefreshCw, CheckCircle2, XCircle, Clock, CalendarDays, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Grado { id: string; numero: number; seccion: string; }
interface Asignatura { id: string; nombre: string; gradoId: string; }
interface Estudiante { id: string; numero: number; nombre: string; activo: boolean; }
interface AsistenciaRecord { id?: string; estudianteId: string; estado: string; }
interface ResumenAsistencia { id: string; nombre: string; numero: number; ausencias: number; tardanzas: number; asistencias: number; total: number; }

interface AsistenciaBoardProps {
  grados: Grado[];
  asignaturas: Asignatura[];
  estudiantes: Estudiante[];
  gradoInicial?: string;
  asignaturaInicial?: string;
}

export default function AsistenciaBoard({ grados, asignaturas, estudiantes, gradoInicial = "", asignaturaInicial = "" }: AsistenciaBoardProps) {
  const { toast } = useToast();
  const [gradoId, setGradoId] = useState<string>(gradoInicial);
  const [asignaturaId, setAsignaturaId] = useState<string>(asignaturaInicial);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [asistencias, setAsistencias] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState<ResumenAsistencia[]>([]);
  const [view, setView] = useState<"pass" | "summary">("pass");
  const [summaryRange, setSummaryRange] = useState<"month" | "all">("all");
  const [saving, setSaving] = useState(false);

  // Initialize all active students to "presente" by default if not set
  const initializeAttendance = useCallback(() => {
    const initial: Record<string, string> = {};
    estudiantes.filter(e => e.activo).forEach(est => {
      initial[est.id] = "presente";
    });
    return initial;
  }, [estudiantes]);

  const loadAsistencia = useCallback(async () => {
    if (!gradoId || !fecha) return;
    setLoading(true);
    try {
      let url = `/api/asistencia?gradoId=${gradoId}&fecha=${fecha}T00:00:00.000Z`;
      if (asignaturaId) url += `&materiaId=${asignaturaId}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const loadedAsistencias: Record<string, string> = { ...initializeAttendance() };
        data.forEach((a: any) => {
          loadedAsistencias[a.estudianteId] = a.estado;
        });
        setAsistencias(loadedAsistencias);
      } else {
        setAsistencias(initializeAttendance());
      }
    } catch {
      toast({ title: "Error cargar asistencia", variant: "destructive" });
      setAsistencias(initializeAttendance());
    } finally {
      setLoading(false);
    }
  }, [gradoId, asignaturaId, fecha, initializeAttendance, toast]);

  const loadResumen = async () => {
    if (!gradoId) return;
    setLoading(true);
    try {
      let url = `/api/asistencia/resumen?gradoId=${gradoId}`;
      if (summaryRange === "month") {
        url += `&mes=${new Date().toISOString().slice(0, 7)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        setResumen(await res.json());
      }
    } catch (error) {
      console.error("Error loading summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!resumen.length) return;
    const grado = grados.find(g => g.id === gradoId);
    let csv = `Resumen de Asistencia - ${grado?.numero}° ${grado?.seccion}\n`;
    csv += "N°,Estudiante,Asistencias,Tardanzas,Ausencias,Total\n";
    resumen.forEach(r => {
      csv += `${r.numero},${r.nombre},${r.asistencias},${r.tardanzas},${r.ausencias},${r.total}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${grado?.numero}${grado?.seccion}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  useEffect(() => {
    if (view === "summary") loadResumen();
  }, [view, gradoId, summaryRange]);

  useEffect(() => {
    setGradoId(gradoInicial);
  }, [gradoInicial]);
  
  useEffect(() => {
    if (asignaturas.some(m => m.id === asignaturaInicial)) {
      setAsignaturaId(asignaturaInicial);
    } else if (asignaturas.length > 0) {
      setAsignaturaId(asignaturas[0].id);
    }
  }, [asignaturaInicial, asignaturas]);

  useEffect(() => {
    if (estudiantes.length > 0) {
      loadAsistencia();
    } else {
      setAsistencias({});
    }
  }, [estudiantes, loadAsistencia]);

  const handleEstadoChange = (estudianteId: string, estado: string) => {
    setAsistencias(prev => ({ ...prev, [estudianteId]: estado }));
  };

  const handleSave = async () => {
    if (!gradoId || !fecha) return;
    setSaving(true);
    
    // Convert object to array
    const records = Object.entries(asistencias).map(([estudianteId, estado]) => ({
      estudianteId,
      estado
    }));

    try {
      const res = await fetch("/api/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asistencias: records,
          fecha: `${fecha}T00:00:00.000Z`,
          gradoId,
          materiaId: asignaturaId || null
        })
      });
      
      if (res.ok) {
        toast({ title: "Asistencia guardada correctamente" });
      } else {
        const data = await res.json();
        toast({ title: data.error || "Error al guardar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de red al guardar asistencia", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const activeStudents = estudiantes.filter(e => e.activo);
  const presentCount = Object.values(asistencias).filter(e => e === "presente").length;
  const absentCount = Object.values(asistencias).filter(e => e === "ausente").length;
  const justifiedCount = Object.values(asistencias).filter(e => e === "justificada").length;

  return (
    <Card className="shadow-sm border-teal-100">
      <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-teal-600" />
            Control de Asistencia
          </CardTitle>
          <CardDescription className="text-xs">Registro y visualización histórica</CardDescription>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-lg gap-1">
          <Button 
            variant={view === "pass" ? "default" : "ghost"} 
            size="sm" 
            className={`h-7 text-[10px] ${view === "pass" ? "bg-white text-slate-800 shadow-sm hover:bg-white" : "text-slate-500"}`}
            onClick={() => setView("pass")}
          >
            Pasar Lista
          </Button>
          <Button 
            variant={view === "summary" ? "default" : "ghost"} 
            size="sm" 
            className={`h-7 text-[10px] ${view === "summary" ? "bg-white text-slate-800 shadow-sm hover:bg-white" : "text-slate-500"}`}
            onClick={() => setView("summary")}
          >
            Ver Resumen
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {view === "pass" ? (
          <>
            <div className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 rounded-xl border">
              <div className="flex-1 min-w-[200px]">
                 <Label className="text-xs mb-1 block">Grado</Label>
                 <Select value={gradoId} onValueChange={setGradoId}>
                   <SelectTrigger className="h-9 text-sm bg-white">
                     <SelectValue placeholder="Seleccione Grado" />
                   </SelectTrigger>
                   <SelectContent>
                     {grados.map(g => (
                       <SelectItem key={g.id} value={g.id} className="text-sm">
                         {g.numero}° "{g.seccion}"
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                 <Label className="text-xs mb-1 block text-slate-500">Asignatura (Opcional)</Label>
                 <Select value={asignaturaId || "ninguna"} onValueChange={(v) => setAsignaturaId(v === "ninguna" ? "" : v)}>
                   <SelectTrigger className="h-9 text-sm bg-white">
                     <SelectValue placeholder="General / Tutor" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value={"ninguna"} className="text-sm italic">Asistencia General</SelectItem>
                     {asignaturas.map(m => (
                       <SelectItem key={m.id} value={m.id} className="text-sm">
                         {m.nombre}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>

              <div className="w-[160px]">
                <Label className="text-xs mb-1 block">Fecha</Label>
                <input 
                  type="date" 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <Button 
                className="h-9 bg-teal-600 hover:bg-teal-700 text-white min-w-[120px]" 
                onClick={handleSave}
                disabled={saving || activeStudents.length === 0}
              >
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Guardando..." : "Guardar Lista"}
              </Button>
            </div>

            <div className="flex gap-2 text-xs font-medium">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Presentes: {presentCount}
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Ausentes: {absentCount}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Justificados: {justifiedCount}
              </Badge>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
                <span className="ml-2 text-sm text-slate-500">Cargando asistencia...</span>
              </div>
            ) : activeStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                Seleccione un grado con estudiantes para tomar asistencia.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table className="text-sm">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-12 text-center">N°</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead className="w-[300px] text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeStudents.map(est => {
                      const estado = asistencias[est.id] || "presente";
                      return (
                        <TableRow key={est.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-center font-medium text-slate-500">
                            {est.numero}
                          </TableCell>
                          <TableCell className="font-medium">
                            {est.nombre}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center p-1 rounded-lg bg-slate-100/50 w-full max-w-[280px] mx-auto border border-slate-200">
                              <button
                                onClick={() => handleEstadoChange(est.id, "presente")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all text-xs font-medium ${
                                  estado === "presente" 
                                    ? "bg-white text-green-700 shadow-sm ring-1 ring-green-200" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                              >
                                <CheckCircle2 className={`h-3.5 w-3.5 ${estado === "presente" ? "text-green-500" : ""}`} />
                                <span className="hidden sm:inline">Presente</span>
                                <span className="sm:hidden">P</span>
                              </button>
                              
                              <button
                                onClick={() => handleEstadoChange(est.id, "ausente")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all text-xs font-medium ${
                                  estado === "ausente" 
                                    ? "bg-white text-red-700 shadow-sm ring-1 ring-red-200" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                              >
                                <XCircle className={`h-3.5 w-3.5 ${estado === "ausente" ? "text-red-500" : ""}`} />
                                <span className="hidden sm:inline">Ausente</span>
                                <span className="sm:hidden">A</span>
                              </button>
                              
                              <button
                                onClick={() => handleEstadoChange(est.id, "justificada")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all text-xs font-medium ${
                                  estado === "justificada" 
                                    ? "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                }`}
                              >
                                <Clock className={`h-3.5 w-3.5 ${estado === "justificada" ? "text-amber-500" : ""}`} />
                                <span className="hidden sm:inline">Permiso</span>
                                <span className="sm:hidden">J</span>
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-500">Rango:</Label>
                <div className="flex bg-slate-100 p-0.5 rounded-md">
                  <Button 
                    size="sm" variant="ghost" 
                    className={`h-6 px-3 text-[10px] ${summaryRange === "all" ? "bg-white shadow-sm" : ""}`}
                    onClick={() => setSummaryRange("all")}
                  >
                    Todo el año
                  </Button>
                  <Button 
                    size="sm" variant="ghost" 
                    className={`h-6 px-3 text-[10px] ${summaryRange === "month" ? "bg-white shadow-sm" : ""}`}
                    onClick={() => setSummaryRange("month")}
                  >
                    Este mes
                  </Button>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50" onClick={exportCSV}>
                <Download className="h-3.5 w-3.5 mr-1" /> Exportar Reporte
              </Button>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-slate-50 h-8">
                    <TableHead className="w-10 text-center">N°</TableHead>
                    <TableHead>Estudiante</TableHead>
                    <TableHead className="text-center font-bold text-teal-600">Asistencias</TableHead>
                    <TableHead className="text-center font-bold text-amber-600">Tardanzas</TableHead>
                    <TableHead className="text-center font-bold text-red-600">Ausencias</TableHead>
                    <TableHead className="text-center">Total Días</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400 italic">
                        No hay registros para este período
                      </TableCell>
                    </TableRow>
                  ) : resumen.map(r => (
                    <TableRow key={r.id} className="h-8">
                      <TableCell className="text-center font-bold text-slate-400">{r.numero}</TableCell>
                      <TableCell className="font-medium">{r.nombre}</TableCell>
                      <TableCell className="text-center bg-teal-50/30">{r.asistencias}</TableCell>
                      <TableCell className="text-center bg-amber-50/30">{r.tardanzas}</TableCell>
                      <TableCell className="text-center bg-red-50/30">{r.ausencias}</TableCell>
                      <TableCell className="text-center font-bold">{r.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
