"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, ClipboardList, School, GraduationCap, CalendarDays, Trophy, AlertTriangle, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface UsuarioSesion { id: string; email: string; nombre: string; rol: string; }
interface Grado { id: string; numero: number; seccion: string; _count?: { estudiantes: number; materias: number; }; }
interface MateriaConGrado { id: string; nombre: string; grado?: { numero: number; seccion: string; }; }

interface DashboardProps {
  usuario: UsuarioSesion;
  grados: Grado[];
  totalEstudiantes: number;
  totalAsignaturas: number;
  asignaturasAsignadas?: MateriaConGrado[]; // solo docentes
  totalDocentes: number;
}

interface GradeStats {
  gradoId: string;
  nombre: string;
  promedios: {
    cotidiana: number;
    integradora: number;
    examen: number;
  };
  topEstudiantes: { id: string, nombre: string, numero: number, promedio: number }[];
  alertas: { id: string, nombre: string, numero: number, promedio: number }[];
}

export default function Dashboard({ usuario, grados, totalEstudiantes, totalAsignaturas, asignaturasAsignadas, totalDocentes }: DashboardProps) {
  const [stats, setStats] = useState<GradeStats[]>([]);
  const [selectedGradoId, setSelectedGradoId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats/dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          if (data.length > 0 && selectedGradoId === "all") {
            // No cambiar el default "all" pero tener los datos listos
          }
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedGradoId]);

  const selectedStats = selectedGradoId === "all" ? null : stats.find(s => s.gradoId === selectedGradoId);

  // Datos para gráfico de población
  const popChartData = grados.map(g => ({
    name: `${g.numero}° ${g.seccion}`,
    estudiantes: g._count?.estudiantes || 0
  })).filter(g => g.estudiantes > 0);

  // Datos para gráfico de promedios por categoría
  const categoryChartData = selectedStats ? [
    { name: "Cotidianas", valor: selectedStats.promedios.cotidiana, color: "#0d9488" },
    { name: "Integradoras", valor: selectedStats.promedios.integradora, color: "#0891b2" },
    { name: "Exámenes", valor: selectedStats.promedios.examen, color: "#4f46e5" }
  ] : [];

  return (
    <div className="space-y-4">
      {/* Saludo */}
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
        Hola, {usuario.nombre} 👋
      </h2>
      <p className="text-slate-500 text-lg font-medium mb-6">
        {usuario.rol === "admin" 
          ? "Bienvenido al panel de administración del sistema." 
          : "Te damos la bienvenida al ciclo escolar."}
      </p>

      {/* Cards de Métricas (Admin) */}
      {usuario.rol === "admin" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-teal-100 overflow-hidden">
            <div className="h-1 bg-teal-500 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium font-medium text-slate-600">Total Estudiantes</CardTitle>
              <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center">
                <Users className="h-8 w-8 text-teal-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{totalEstudiantes}</div>
              <p className="text-base font-medium text-slate-500 mt-1">Registrados en el sistema</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-emerald-100 overflow-hidden">
            <div className="h-1 bg-emerald-500 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium font-medium text-slate-600">Grados Activos</CardTitle>
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <School className="h-8 w-8 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{grados.length}</div>
              <p className="text-base font-medium text-slate-500 mt-1">Secciones asignadas</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-blue-100 overflow-hidden">
            <div className="h-1 bg-blue-500 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium font-medium text-slate-600">Asignaturas impartidas</CardTitle>
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{totalAsignaturas}</div>
              <p className="text-base font-medium text-slate-500 mt-1">En todos los grados</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-amber-100 overflow-hidden">
            <div className="h-1 bg-amber-500 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium font-medium text-slate-600">Docentes</CardTitle>
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{totalDocentes}</div>
              <p className="text-base font-medium text-slate-500 mt-1">Activos en el ciclo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analíticas Avanzadas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 shadow-sm border-slate-100 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b bg-slate-50/50">
            <div>
              <CardTitle className="text-base text-slate-700 flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-teal-600" />
                Rendimiento Académico por Grado
              </CardTitle>
              <CardDescription className="text-base font-medium">Promedios por categoría evaluativa</CardDescription>
            </div>
            <Select value={selectedGradoId} onValueChange={setSelectedGradoId}>
              <SelectTrigger className="w-[180px] h-8 text-base font-medium bg-white">
                <SelectValue placeholder="Seleccionar grado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base font-medium">Vista General</SelectItem>
                {stats.map(s => (
                  <SelectItem key={s.gradoId} value={s.gradoId} className="text-base font-medium">
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-6">
            {selectedGradoId === "all" ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Bar dataKey="estudiantes" name="N° Estudiantes" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : selectedStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                      <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                      <Bar dataKey="valor" name="Promedio" radius={[0, 4, 4, 0]} barSize={35}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                    <h4 className="text-base font-medium font-bold text-teal-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                       <Trophy className="h-6 w-6 text-amber-500" /> Cuadro de Honor
                    </h4>
                    <div className="space-y-2">
                      {selectedStats.topEstudiantes.length > 0 ? selectedStats.topEstudiantes.map((est, i) => (
                        <div key={est.id} className="flex items-center justify-between text-lg font-medium">
                          <span className="text-slate-700 truncate max-w-[180px]">{i+1}. {est.nombre}</span>
                          <Badge variant="outline" className="bg-white text-teal-700 border-teal-200 font-bold ml-2">
                            {est.promedio.toFixed(1)}
                          </Badge>
                        </div>
                      )) : <p className="text-base text-slate-400">Sin promedios calculados</p>}
                    </div>
                  </div>
                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                    <h4 className="text-base font-medium font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6 text-red-500" /> Alertas Académicas
                    </h4>
                    <div className="space-y-2">
                      {selectedStats.alertas.length > 0 ? selectedStats.alertas.map((est, i) => (
                        <div key={est.id} className="flex items-center justify-between text-lg font-medium">
                          <span className="text-slate-700 truncate max-w-[180px]">{est.nombre}</span>
                          <Badge variant="destructive" className="bg-red-500 text-white font-bold ml-2">
                            {est.promedio.toFixed(1)}
                          </Badge>
                        </div>
                      )) : <p className="text-base text-slate-400">Sin alertas detectadas</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 italic">
                Cargando estadísticas...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accesos y Otros */}
        <div className="flex flex-col gap-4">
           {/* Info Docente si aplica */}
          {usuario.rol === "docente" && asignaturasAsignadas && (
             <Card className="shadow-sm border-slate-100">
               <CardHeader className="py-3 px-4 border-b">
                 <CardTitle className="text-base font-medium font-bold text-slate-500 uppercase">Mis Asignaturas</CardTitle>
               </CardHeader>
               <CardContent className="p-3 max-h-[300px] overflow-y-auto">
                 <div className="space-y-2">
                   {asignaturasAsignadas.map(m => (
                     <div key={m.id} className="p-2 bg-slate-50 rounded border text-base font-medium flex justify-between items-center">
                       <span className="font-medium text-slate-700">{m.nombre}</span>
                       <Badge variant="secondary" className="text-sm">{m.grado?.numero}°{m.grado?.seccion}</Badge>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
          )}

          <Card className="shadow-sm border-slate-100 flex-1">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-base font-medium font-bold text-slate-500 uppercase">Gestión Rápida</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg flex items-center gap-3 hover:bg-teal-50 transition-colors cursor-pointer group" onClick={() => document.getElementById('tab-calificaciones')?.click()}>
                <div className="p-2 bg-teal-100 text-teal-700 rounded-md shrink-0 group-hover:scale-110 transition-transform"><ClipboardList className="h-8 w-8" /></div>
                <div>
                  <h4 className="text-base font-medium font-bold text-teal-900">Pasar Notas</h4>
                  <p className="text-base text-teal-700/70">Ingreso rápido de calificaciones</p>
                </div>
              </div>
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-3 hover:bg-blue-50 transition-colors cursor-pointer group" onClick={() => document.getElementById('tab-asistencia')?.click()}>
                <div className="p-2 bg-blue-100 text-blue-700 rounded-md shrink-0 group-hover:scale-110 transition-transform"><CalendarDays className="h-8 w-8" /></div>
                <div>
                  <h4 className="text-base font-medium font-bold text-blue-900">Asistencia</h4>
                  <p className="text-base text-blue-700/70">Control diario de alumnos</p>
                </div>
              </div>
              {usuario.rol === "admin" && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg flex items-center gap-3 hover:bg-amber-50 transition-colors cursor-pointer group">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-md shrink-0 group-hover:scale-110 transition-transform"><GraduationCap className="h-8 w-8" /></div>
                  <div>
                    <h4 className="text-base font-medium font-bold text-amber-900">Docentes</h4>
                    <p className="text-base text-amber-700/70">Administrar personal académico</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
