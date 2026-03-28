"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, ClipboardList, School, GraduationCap, CalendarDays } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface UsuarioSesion { id: string; email: string; nombre: string; rol: string; }
interface Grado { id: string; numero: number; seccion: string; _count?: { estudiantes: number; materias: number; }; }
interface MateriaConGrado { id: string; nombre: string; grado?: { numero: number; seccion: string; }; }

interface DashboardProps {
  usuario: UsuarioSesion;
  grados: Grado[];
  totalEstudiantes: number;
  totalMaterias: number;
  materiasAsignadas?: MateriaConGrado[]; // solo docentes
  totalDocentes: number;
}

export default function Dashboard({ usuario, grados, totalEstudiantes, totalMaterias, materiasAsignadas, totalDocentes }: DashboardProps) {
  // Datos para gráfico (sólo ejemplo visual, idealmente se consultan del backend)
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
              <CardTitle className="text-sm font-medium text-slate-600">Materias impartidas</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{totalMaterias}</div>
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

      {/* Docs / Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
        {usuario.rol === "admin" && (
          <Card className="col-span-2 shadow-sm border-slate-100">
            <CardHeader>
              <CardTitle className="text-base text-slate-700">Población Estudiantil por Grado</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="estudiantes" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Sin datos suficientes para mostrar
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(usuario.rol === "docente" || usuario.rol === "admin") && (
          <Card className="lg:col-span-1 shadow-sm border-slate-100 h-full">
            <CardHeader>
              <CardTitle className="text-base text-slate-700">Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg flex items-start gap-3 flex-col sm:flex-row hover:bg-teal-50 transition-colors cursor-pointer" onClick={() => document.getElementById('tab-calificaciones')?.click()}>
                <div className="p-2 bg-teal-100 text-teal-700 rounded-md shrink-0"><ClipboardList className="h-5 w-5" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-teal-900">Calificaciones</h4>
                  <p className="text-xs text-teal-700/80 mt-0.5">Ingresar o modificar notas por trimestre.</p>
                </div>
              </div>
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-3 flex-col sm:flex-row hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => document.getElementById('tab-asistencia')?.click()}>
                <div className="p-2 bg-blue-100 text-blue-700 rounded-md shrink-0"><CalendarDays className="h-5 w-5" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">Control de Asistencia</h4>
                  <p className="text-xs text-blue-700/80 mt-0.5">Tomar asistencia diaria de tus secciones.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
