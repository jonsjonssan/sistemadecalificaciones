"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Save, RefreshCw, CheckCircle2, XCircle, Clock, FileDown, LayoutGrid, ListTodo, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface Grado { id: string; numero: number; seccion: string; }
interface Asignatura { id: string; nombre: string; gradoId: string; }
interface Estudiante { id: string; numero: number; nombre: string; activo: boolean; }
interface AsistenciaRecord { id?: string; estudianteId: string; estado: string; fecha: string; }

interface AsistenciaBoardProps {
  grados: Grado[];
  asignaturas: Asignatura[];
  estudiantes: Estudiante[];
  gradoInicial?: string;
  asignaturaInicial?: string;
}

export default function AsistenciaBoard({ grados, asignaturas, estudiantes, gradoInicial = "", asignaturaInicial = "" }: AsistenciaBoardProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"diaria" | "calendario">("diaria");
  const [gradoId, setGradoId] = useState<string>(gradoInicial);
  const [materiaId, setMateriaId] = useState<string>(asignaturaInicial);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [mesActual, setMesActual] = useState<Date>(new Date());
  const [historico, setHistorico] = useState<AsistenciaRecord[]>([]);

  const [asistencias, setAsistencias] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      if (materiaId) url += `&materiaId=${materiaId}`;
      
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
  }, [gradoId, materiaId, fecha, initializeAttendance, toast]);

  const loadHistorico = useCallback(async () => {
    if (!gradoId) return;
    setLoading(true);
    try {
      const inicio = startOfMonth(mesActual).toISOString();
      const fin = endOfMonth(mesActual).toISOString();
      let url = `/api/asistencia?gradoId=${gradoId}&fechaInicio=${inicio}&fechaFin=${fin}`;
      if (materiaId) url += `&materiaId=${materiaId}`;
      
      const res = await fetch(url);
      if (res.ok) {
        setHistorico(await res.json());
      }
    } catch {
      toast({ title: "Error cargar historial", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [gradoId, materiaId, mesActual, toast]);

  useEffect(() => {
    if (view === "diaria" && estudiantes.length > 0) loadAsistencia();
    if (view === "calendario" && gradoId) loadHistorico();
  }, [view, loadAsistencia, loadHistorico, estudiantes.length, gradoId]);

  useEffect(() => {
    if (asignaturas.some(m => m.id === asignaturaInicial)) {
      setMateriaId(asignaturaInicial);
    } else if (asignaturas.length > 0 && !materiaId) {
      setMateriaId(asignaturas[0].id);
    }
  }, [asignaturaInicial, asignaturas, materiaId]);

  const handleSave = async () => {
    if (!gradoId || !fecha) return;
    setSaving(true);
    const records = Object.entries(asistencias).map(([estudianteId, estado]) => ({ estudianteId, estado }));
    try {
      const res = await fetch("/api/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asistencias: records, fecha: `${fecha}T00:00:00.000Z`, gradoId, materiaId: materiaId || null })
      });
      if (res.ok) toast({ title: "Asistencia guardada" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportarCSV = () => {
    if (!historico.length) return;
    const dias = eachDayOfInterval({ start: startOfMonth(mesActual), end: endOfMonth(mesActual) })
      .filter(d => !isWeekend(d));
    
    let csv = "Estudiante," + dias.map(d => format(d, 'dd/MM')).join(",") + ",Total Faltas\n";
    estudiantes.filter(e => e.activo).forEach(est => {
      let line = `${est.nombre}`;
      let faltas = 0;
      dias.forEach(d => {
        const record = historico.find(h => h.estudianteId === est.id && isSameDay(new Date(h.fecha), d));
        const estado = record?.estado || "-";
        if (estado === "ausente") faltas++;
        line += `,${estado}`;
      });
      line += `,${faltas}\n`;
      csv += line;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Asistencia_${format(mesActual, 'MMMM_yyyy', { locale: es })}.csv`);
    link.click();
  };

  const activeStudents = estudiantes.filter(e => e.activo);
  const diasMes = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(mesActual), end: endOfMonth(mesActual) })
      .filter(d => !isWeekend(d));
  }, [mesActual]);

  return (
    <Card className="shadow-sm border-teal-100">
      <CardHeader className="py-3 px-4 bg-teal-50/50 border-b border-teal-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base text-teal-800 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" /> 
              Control de Asistencia
            </CardTitle>
            <CardDescription className="text-xs">
              {view === "diaria" 
                ? format(new Date(fecha + 'T12:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                : "Calendario Mensual Detallado"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="diaria" className="text-[10px] gap-1"><ListTodo className="h-3 w-3" /> Diario</TabsTrigger>
                <TabsTrigger value="calendario" className="text-[10px] gap-1"><LayoutGrid className="h-3 w-3" /> Mensual</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex-1 min-w-[150px]">
             <Label className="text-[10px] mb-1 block uppercase text-slate-500 font-bold">Grado / Sección</Label>
             <Select value={gradoId} onValueChange={setGradoId}>
                <SelectTrigger className="h-9 text-sm bg-white">
                  <SelectValue placeholder="Seleccione Grado" />
                </SelectTrigger>
                <SelectContent>
                  {grados.map(g => <SelectItem key={g.id} value={g.id}>{g.numero}° "{g.seccion}"</SelectItem>)}
                </SelectContent>
             </Select>
          </div>
          
          <div className="flex-1 min-w-[150px]">
             <Label className="text-[10px] mb-1 block uppercase text-slate-500 font-bold">Asignatura</Label>
             <Select value={materiaId || "ninguna"} onValueChange={(v) => setMateriaId(v === "ninguna" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm bg-white">
                  <SelectValue placeholder="General" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguna">Registro General</SelectItem>
                  {asignaturas.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                </SelectContent>
             </Select>
          </div>

          {view === "diaria" ? (
            <div className="w-[150px]">
              <Label className="text-[10px] mb-1 block uppercase text-slate-500 font-bold">Fecha</Label>
              <input type="date" className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm" value={fecha} onChange={e => setFecha(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white border rounded-md h-9 px-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMesActual(subMonths(mesActual, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-xs font-semibold min-w-[100px] text-center uppercase">{format(mesActual, 'MMMM yyyy', { locale: es })}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMesActual(new Date(mesActual.setMonth(mesActual.getMonth() + 1)))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}

          <div className="flex gap-2">
            {view === "diaria" ? (
              <Button className="h-9 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={saving || activeStudents.length === 0}>
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "..." : "Guardar"}
              </Button>
            ) : (
              <Button variant="outline" className="h-9 border-teal-200 text-teal-700 hover:bg-teal-50" onClick={exportarCSV} disabled={loading || !historico.length}>
                <FileDown className="h-4 w-4 mr-2" />
                Informe CSV
              </Button>
            )}
          </div>
        </div>

        {view === "diaria" && (
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
                     <TableRow key={est.id}>
                       <TableCell className="text-center font-medium text-slate-400">{est.numero}</TableCell>
                       <TableCell className="font-medium text-slate-700">{est.nombre}</TableCell>
                       <TableCell>
                          <div className="flex gap-1 justify-center p-1 rounded-md bg-slate-100/50">
                            {[
                              { id: "presente", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", ring: "ring-green-200", label: "P" },
                              { id: "ausente", icon: XCircle, color: "text-red-500", bg: "bg-red-50", ring: "ring-red-200", label: "A" },
                              { id: "justificada", icon: Clock, color: "text-amber-500", bg: "bg-amber-50", ring: "ring-amber-200", label: "J" }
                            ].map(opt => (
                              <button key={opt.id} onClick={() => setAsistencias(p => ({ ...p, [est.id]: opt.id }))} className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded transition-all text-[10px] font-bold ${estado === opt.id ? `bg-white ${opt.color} shadow-sm ring-1 ${opt.ring}` : "text-slate-400 hover:bg-slate-200"}`}>
                                <opt.icon className="h-3 w-3" /> {opt.label}
                              </button>
                            ))}
                          </div>
                       </TableCell>
                     </TableRow>
                   );
                 })}
               </TableBody>
             </Table>
           </div>
        )}

        {view === "calendario" && (
          <div className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table className="text-[10px] border-collapse min-w-[800px]">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="sticky left-0 bg-slate-50 z-20 w-32 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Estudiante</TableHead>
                    {diasMes.map(d => (
                      <TableHead key={d.toISOString()} className={`text-center p-1 w-8 border-r ${isWeekend(d) ? "bg-slate-100" : ""}`}>
                        <div className="font-bold text-slate-600">{format(d, 'dd')}</div>
                        <div className="text-[8px] text-slate-400 uppercase font-medium">{format(d, 'EEE', { locale: es }).substring(0, 2)}</div>
                      </TableHead>
                    ))}
                    <TableHead className="w-12 text-center bg-red-50 text-red-600 font-bold">F</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeStudents.map(est => {
                    let totalFaltas = 0;
                    return (
                      <TableRow key={est.id} className="hover:bg-slate-50">
                        <TableCell className="sticky left-0 bg-white z-10 font-bold text-slate-700 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-xs truncate max-w-[150px]">
                          {est.nombre}
                        </TableCell>
                        {diasMes.map(d => {
                          const record = historico.find(h => h.estudianteId === est.id && isSameDay(new Date(h.fecha), d));
                          const estado = record?.estado;
                          if (estado === "ausente") totalFaltas++;
                          
                          let cellBg = "";
                          let cellIcon: React.ReactNode = null;
                          if (estado === "ausente") { cellBg = "bg-red-100"; cellIcon = <XCircle className="h-2 w-2 text-red-600" />; }
                          if (estado === "justificada") { cellBg = "bg-amber-100"; cellIcon = <Clock className="h-2 w-2 text-amber-600" />; }
                          if (estado === "presente") { cellIcon = <div className="h-1 w-1 rounded-full bg-green-400" />; }

                          return (
                            <TableCell key={d.toISOString()} className={`p-0 border-r text-center ${cellBg}`}>
                              <div className="h-8 flex items-center justify-center">
                                {cellIcon}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-bold text-red-700 bg-red-50/30 border-l">{totalFaltas}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[10px]">
              <div className="flex items-center gap-1.5 font-bold text-slate-600"><div className="h-2 w-2 rounded-full bg-green-400" /> Presente</div>
              <div className="flex items-center gap-1.5 font-bold text-red-600 bg-red-100 px-1 rounded"><XCircle className="h-2 w-2" /> Ausente</div>
              <div className="flex items-center gap-1.5 font-bold text-amber-600 bg-amber-100 px-1 rounded"><Clock className="h-2 w-2" /> Permiso</div>
              <div className="ml-auto text-slate-400 italic font-medium">* No incluye fines de semana</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
             <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
