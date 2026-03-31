"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Save, RefreshCw, CheckCircle2, XCircle, Clock, CalendarDays, Download, Trash2 } from "lucide-react";
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
  isAdmin?: boolean;
}

export default function AsistenciaBoard({ grados, asignaturas, estudiantes, gradoInicial = "", asignaturaInicial = "", isAdmin = false }: AsistenciaBoardProps) {
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
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
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!gradoId || !fecha) return;
    if (!confirm(`¿Eliminar la asistencia del ${fecha} para este grado? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({ fecha: `${fecha}T00:00:00.000Z`, gradoId });
      if (asignaturaId) params.set("materiaId", asignaturaId);
      const res = await fetch(`/api/asistencia?${params.toString()}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        toast({ title: `${data.eliminados} registros eliminados` });
        setAsistencias(initializeAttendance());
        loadAsistencia();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Error al eliminar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error de red al eliminar asistencia", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const activeStudents = estudiantes.filter(e => e.activo);
  const presentCount = Object.values(asistencias).filter(e => e === "presente").length;
  const absentCount = Object.values(asistencias).filter(e => e === "ausente").length;
  const justifiedCount = Object.values(asistencias).filter(e => e === "justificada").length;

  return (
    <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'border-teal-100'}`}>
      <CardHeader className={`pb-3 border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              <CalendarDays className="h-5 w-5 text-teal-600" />
              Control de Asistencia
            </CardTitle>
            <CardDescription className={`text-sm font-medium ${darkMode ? 'text-slate-400' : ''}`}>Registro y visualización histórica</CardDescription>
          </div>
          <div className={`flex p-1 rounded-lg gap-1 self-start sm:self-center ${darkMode ? 'bg-slate-700' : 'bg-slate-200/50'}`}>
            <Button 
              variant={view === "pass" ? "default" : "ghost"} 
              size="sm" 
              className={`h-9 text-sm px-4 ${view === "pass" ? (darkMode ? "bg-slate-600 text-white shadow-sm hover:bg-slate-500" : "bg-white text-slate-800 shadow-sm hover:bg-white") : (darkMode ? "text-slate-400" : "text-slate-500")}`}
              onClick={() => setView("pass")}
            >
              Pasar Lista
            </Button>
            <Button 
              variant={view === "summary" ? "default" : "ghost"} 
              size="sm" 
              className={`h-9 text-sm px-4 ${view === "summary" ? (darkMode ? "bg-slate-600 text-white shadow-sm hover:bg-slate-500" : "bg-white text-slate-800 shadow-sm hover:bg-white") : (darkMode ? "text-slate-400" : "text-slate-500")}`}
              onClick={() => setView("summary")}
            >
              Resumen
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {view === "pass" ? (
          <>
            <div className={`flex flex-wrap items-end gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50'}`}>
              <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                 <Label className={`text-xs sm:text-sm font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Grado</Label>
                 <Select value={gradoId} onValueChange={setGradoId}>
                   <SelectTrigger className={`h-10 text-xs sm:text-sm font-medium ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white'}`}>
                     <SelectValue placeholder="Seleccione Grado" />
                   </SelectTrigger>
                   <SelectContent>
                     {grados.map(g => (
                       <SelectItem key={g.id} value={g.id} className="text-xs sm:text-sm font-medium">
                         {g.numero}° "{g.seccion}"
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
              
              <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                 <Label className={`text-xs sm:text-sm font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Asignatura (Opcional)</Label>
                 <Select value={asignaturaId || "ninguna"} onValueChange={(v) => setAsignaturaId(v === "ninguna" ? "" : v)}>
                   <SelectTrigger className={`h-10 text-xs sm:text-sm font-medium ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white'}`}>
                     <SelectValue placeholder="General / Tutor" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value={"ninguna"} className="text-xs sm:text-sm font-medium italic">Asistencia General</SelectItem>
                     {asignaturas.map(m => (
                       <SelectItem key={m.id} value={m.id} className="text-xs sm:text-sm font-medium">
                         {m.nombre}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>

              <div className="min-w-[100px] sm:min-w-[120px] flex-1 sm:flex-none">
                <Label className={`text-xs sm:text-sm font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Fecha</Label>
                <input 
                  type="date" 
                  className={`flex h-10 w-full rounded-md border px-3 py-1 text-xs sm:text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 ${darkMode ? 'bg-slate-800 border-slate-600 text-white focus-visible:ring-slate-400' : 'bg-white border-slate-200 focus-visible:ring-slate-950'}`}
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <Button 
                className={`h-10 text-white w-full sm:w-auto px-6 font-bold text-xs sm:text-sm ${darkMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-600 hover:bg-teal-700'}`} 
                onClick={handleSave}
                disabled={saving || activeStudents.length === 0}
              >
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Guardando..." : "Guardar Lista"}
              </Button>
              {isAdmin && (
                <Button 
                  className={`h-10 text-white w-full sm:w-auto px-4 font-bold text-xs sm:text-sm ${darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'}`} 
                  onClick={handleDelete}
                  disabled={deleting || activeStudents.length === 0}
                >
                  {deleting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  {deleting ? "Eliminando..." : "Borrar"}
                </Button>
              )}
            </div>

            <div className="flex gap-2 text-xs sm:text-sm font-medium flex-wrap">
              <Badge variant="outline" className={`py-0.5 ${darkMode ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200'}`}>
                Presentes: {presentCount}
              </Badge>
              <Badge variant="outline" className={`py-0.5 ${darkMode ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200'}`}>
                Ausentes: {absentCount}
              </Badge>
              <Badge variant="outline" className={`py-0.5 ${darkMode ? 'bg-amber-900/40 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                Justificados: {justifiedCount}
              </Badge>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cargando...</span>
              </div>
            ) : activeStudents.length === 0 ? (
              <div className={`py-12 text-center ${darkMode ? 'text-slate-400 bg-slate-800/50' : 'text-slate-500 bg-slate-50'} rounded-lg border border-dashed ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                Seleccione un grado para tomar asistencia.
              </div>
            ) : (
              <div className={`rounded-md border overflow-hidden table-scroll-container relative ${darkMode ? 'border-slate-700' : ''}`}>
                <Table className="text-xs sm:text-sm font-medium">
                  <TableHeader className={darkMode ? 'bg-slate-800' : 'bg-slate-50'}>
                    <TableRow>
                      <TableHead className="w-10 text-center sticky-col left-0 z-20 shadow-right">N°</TableHead>
                      <TableHead className="sticky-col left-10 z-20 shadow-right min-w-[120px] sm:min-w-[150px]">Estudiante</TableHead>
                      <TableHead className="w-[160px] sm:w-[300px] text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeStudents.map((est, idx) => {
                      const estado = asistencias[est.id] || "presente";
                      const evenRow = idx % 2 === 0;
                      const rowBg = evenRow ? (darkMode ? 'bg-[#1e293b]' : '') : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50');
                      const stickyBg = evenRow ? (darkMode ? 'bg-[#1e293b]' : 'bg-white') : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50');
                      
                      return (
                        <TableRow key={est.id} className={`${rowBg} ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100/50'} transition-colors`}>
                          <TableCell className={`text-center font-bold sticky-col left-0 z-10 shadow-right ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} style={{ backgroundColor: stickyBg }}>
                            {est.numero}
                          </TableCell>
                          <TableCell className={`font-semibold sticky-col left-10 z-10 shadow-right whitespace-nowrap ${darkMode ? 'text-white' : ''}`} style={{ backgroundColor: stickyBg }}>
                            {est.nombre}
                          </TableCell>
                          <TableCell>
                            <div className={`flex justify-center p-1 rounded-lg w-full max-w-[160px] sm:max-w-[280px] mx-auto border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100/50 border-slate-200'}`}>
                              <button
                                onClick={() => handleEstadoChange(est.id, "presente")}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all text-[10px] sm:text-sm font-bold ${
                                  estado === "presente" 
                                    ? (darkMode ? "bg-slate-700 text-green-400 shadow-sm ring-1 ring-green-700" : "bg-white text-green-700 shadow-sm ring-1 ring-green-200") 
                                    : (darkMode ? "text-slate-500 hover:text-slate-300 hover:bg-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")
                                }`}
                              >
                                <CheckCircle2 className={`h-4 w-4 sm:h-5 sm:w-5 ${estado === "presente" ? "text-green-500" : ""}`} />
                                <span className="hidden sm:inline">Presente</span>
                                <span className="sm:hidden">P</span>
                              </button>
                              
                              <button
                                onClick={() => handleEstadoChange(est.id, "ausente")}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all text-[10px] sm:text-sm font-bold ${
                                  estado === "ausente" 
                                    ? (darkMode ? "bg-slate-700 text-red-400 shadow-sm ring-1 ring-red-700" : "bg-white text-red-700 shadow-sm ring-1 ring-red-200") 
                                    : (darkMode ? "text-slate-500 hover:text-slate-300 hover:bg-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")
                                }`}
                              >
                                <XCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${estado === "ausente" ? "text-red-500" : ""}`} />
                                <span className="hidden sm:inline">Ausente</span>
                                <span className="sm:hidden">A</span>
                              </button>
                              
                              <button
                                onClick={() => handleEstadoChange(est.id, "justificada")}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md transition-all text-[10px] sm:text-sm font-bold ${
                                  estado === "justificada" 
                                    ? (darkMode ? "bg-slate-700 text-amber-400 shadow-sm ring-1 ring-amber-700" : "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200") 
                                    : (darkMode ? "text-slate-500 hover:text-slate-300 hover:bg-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")
                                }`}
                              >
                                <Clock className={`h-4 w-4 sm:h-5 sm:w-5 ${estado === "justificada" ? "text-amber-500" : ""}`} />
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className={`text-xs sm:text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rango:</Label>
                <div className={`flex p-0.5 rounded-md ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Button 
                    size="sm" variant="ghost" 
                    className={`h-7 px-3 text-xs ${summaryRange === "all" ? (darkMode ? "bg-slate-700 shadow-sm font-bold text-white" : "bg-white shadow-sm font-bold") : (darkMode ? "text-slate-400" : "")}`}
                    onClick={() => setSummaryRange("all")}
                  >
                    Año
                  </Button>
                  <Button 
                    size="sm" variant="ghost" 
                    className={`h-7 px-3 text-xs ${summaryRange === "month" ? (darkMode ? "bg-slate-700 shadow-sm font-bold text-white" : "bg-white shadow-sm font-bold") : (darkMode ? "text-slate-400" : "")}`}
                    onClick={() => setSummaryRange("month")}
                  >
                    Mes
                  </Button>
                </div>
              </div>
              <Button size="sm" variant="outline" className={`h-9 text-xs font-bold w-full sm:w-auto ${darkMode ? 'border-teal-700 text-teal-400 hover:bg-teal-900/30' : 'border-teal-200 text-teal-700 hover:bg-teal-50'}`} onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" /> Reporte CSV
              </Button>
            </div>

            <div className={`rounded-xl border overflow-hidden table-scroll-container ${darkMode ? 'border-slate-700' : ''}`}>
              <Table className="text-xs sm:text-sm font-medium">
                <TableHeader>
                  <TableRow className={darkMode ? 'bg-slate-800' : 'bg-slate-50'}>
                    <TableHead className="w-10 text-center">N°</TableHead>
                    <TableHead className="min-w-[120px] sm:min-w-[140px]">Estudiante</TableHead>
                    <TableHead className="text-center font-bold text-teal-600">Asist.</TableHead>
                    <TableHead className="text-center font-bold text-amber-600">Tard.</TableHead>
                    <TableHead className="text-center font-bold text-red-600">Aus.</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className={`text-center py-8 italic text-xs sm:text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Sin registros
                      </TableCell>
                    </TableRow>
                  ) : resumen.map((r, idx) => (
                    <TableRow key={r.id} className={`h-10 ${idx % 2 === 0 ? '' : (darkMode ? 'bg-slate-800/30' : 'bg-slate-50/30')} ${darkMode ? 'hover:bg-slate-700/50' : ''}`}>
                      <TableCell className={`text-center font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{r.numero}</TableCell>
                      <TableCell className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-700'}`}>{r.nombre}</TableCell>
                      <TableCell className="text-center text-teal-700 font-medium">{r.asistencias}</TableCell>
                      <TableCell className="text-center text-amber-700 font-medium">{r.tardanzas}</TableCell>
                      <TableCell className="text-center text-red-700 font-medium">{r.ausencias}</TableCell>
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
