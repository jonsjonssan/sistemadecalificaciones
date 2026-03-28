"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, ClipboardList, School, GraduationCap, CalendarDays } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface UsuarioSesion { id: string; email: string; nombre: string; rol: string; }
interface Grado { id: string; numero: number; seccion: string; _count?: { estudiantes: number; asignaturas: number; }; }
interface AsignaturaConGrado { id: string; nombre: string; grado?: { numero: number; seccion: string; }; }

interface DashboardProps {
  usuario: UsuarioSesion;
  grados: Grado[];
  totalEstudiantes: number;
  totalAsignaturas: number;
  asignaturasAsignadas?: AsignaturaConGrado[]; // solo docentes
  totalDocentes: number;
  promediosAsignaturas?: any[];
}

export default function Dashboard({ usuario, grados, totalEstudiantes, totalAsignaturas, asignaturasAsignadas, totalDocentes, promediosAsignaturas = [] }: DashboardProps) {
  // Datos para gráfico de población
  const chartData = grados.map(g => ({
    name: `${g.numero}° ${g.seccion}`,
    estudiantes: g._count?.estudiantes || 0
  })).filter(g => g.estudiantes > 0);

  return (
    <div className="space-y-4">
      {/* Saludo */}
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
        Hola, {usuario.nombre} 👋
      </h2>
      <p className="text-slate-500 text-sm mb-6">
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
              <CardTitle className="text-sm font-medium text-slate-600">Total Estudiantes</CardTitle>
              <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-teal-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{totalEstudiantes}</div>
              <p className="text-xs text-slate-500 mt-1">Registrados en el sistema</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-emerald-100 overflow-hidden">
            <div className="h-1 bg-emerald-500 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Grados Activos</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <School className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{grados.length}</div>
              <p className="text-xs text-slate-500 mt-1">Secciones asignadas</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-blue-100 overflow-hidden">
            <div className="h-1 bg-blue-500 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Asignaturas impartidas</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{totalAsignaturas}</div>
              <p className="text-xs text-slate-500 mt-1">En todos los grados</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-amber-100 overflow-hidden">
            <div className="h-1 bg-amber-500 w-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Docentes</CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{totalDocentes}</div>
              <p className="text-xs text-slate-500 mt-1">Activos en el ciclo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-100">
          <CardHeader>
            <CardTitle className="text-base text-slate-700">Población Estudiantil por Grado</CardTitle>
            <CardDescription className="text-xs">Cantidad de estudiantes registrados por sección</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="estudiantes" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm italic">
                Sin datos de población
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-100">
          <CardHeader>
            <CardTitle className="text-base text-slate-700">Promedios por Asignatura</CardTitle>
            <CardDescription className="text-xs">Rendimiento académico actual del grado seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {promediosAsignaturas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={promediosAsignaturas} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 10]} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="Cotidiana" fill="#0d9488" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Integradora" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Examen" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm italic">
                Cargue un grado en "Calificaciones" para ver promedios
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(usuario.rol === "docente" || usuario.rol === "admin") && (
          <Card className="lg:col-span-1 shadow-sm border-slate-100">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-slate-700">Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              <div className="p-2.5 bg-teal-50/50 border border-teal-100 rounded-lg flex items-center gap-3 hover:bg-teal-50 transition-colors cursor-pointer" onClick={() => document.getElementById('tab-calificaciones')?.click()}>
                <div className="p-1.5 bg-teal-100 text-teal-700 rounded-md"><ClipboardList className="h-4 w-4" /></div>
                <div>
                  <h4 className="text-xs font-semibold text-teal-900">Pasar Calificaciones</h4>
                  <p className="text-[10px] text-teal-700/80">Notas por trimestre y asignatura.</p>
                </div>
              </div>
              <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-3 hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => document.getElementById('tab-asistencia')?.click()}>
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md"><CalendarDays className="h-4 w-4" /></div>
                <div>
                  <h4 className="text-xs font-semibold text-blue-900">Control de Asistencia</h4>
                  <p className="text-[10px] text-blue-700/80">Registro diario de asistencia.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {usuario.rol === "admin" && (
          <Card className="lg:col-span-2 shadow-sm border-slate-100">
            <CardHeader className="py-3 px-4">
               <CardTitle className="text-sm font-semibold text-slate-700">Resumen de Control</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
               <div className="text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg border italic">
                 El dashboard muestra promedios del grado consultado actualmente en la pestaña de Calificaciones. Use esta vista para monitorear el avance de las notas.
               </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
