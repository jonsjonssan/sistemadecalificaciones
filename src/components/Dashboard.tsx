"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, School, GraduationCap, Book, FileText, Target, TrendingUp, ChevronDown, ChevronRight, Trophy, AlertTriangle, ClipboardList, CalendarDays } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { GradeChart } from "@/components/ui/grade-chart";
import InformeTecnicoDialog from "./InformeTecnicoDialog";

interface UsuarioSesion { id: string; email: string; nombre: string; rol: string; asignaturasAsignadas?: Array<{ gradoId: string }>; }
interface Grado { id: string; numero: number; seccion: string; _count?: { estudiantes: number; materias: number; }; }
interface MateriaConGrado { id: string; nombre: string; gradoId?: string; grado?: { id: string; numero: number; seccion: string; }; }

interface DashboardProps {
  usuario: UsuarioSesion;
  grados: Grado[];
  totalEstudiantes: number;
  totalAsignaturas: number;
  asignaturasAsignadas?: MateriaConGrado[];
  totalDocentes: number;
  configuracion?: { añoEscolar: number; escuela: string };
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

interface CicloAsignaturas {
  nombre: string;
  grados: number[];
  color: string;
  colorBg: string;
  colorBorder: string;
  iconColor: string;
  ringColor: string;
}

const CICLOS: CicloAsignaturas[] = [
  { nombre: "Primer Ciclo", grados: [2, 3], color: "text-teal-600", colorBg: "bg-teal-50", colorBorder: "border-teal-200", iconColor: "text-teal-500", ringColor: "#14b8a6" },
  { nombre: "Segundo Ciclo", grados: [4, 5, 6], color: "text-blue-600", colorBg: "bg-blue-50", colorBorder: "border-blue-200", iconColor: "text-blue-500", ringColor: "#3b82f6" },
  { nombre: "Tercer Ciclo", grados: [7, 8, 9], color: "text-violet-600", colorBg: "bg-violet-50", colorBorder: "border-violet-200", iconColor: "text-violet-500", ringColor: "#8b5cf6" },
];

function getCicloDark(ciclo: CicloAsignaturas) {
  const map: Record<string, { bg: string; border: string; icon: string }> = {
    "Primer Ciclo": { bg: "bg-teal-900/20", border: "border-teal-800", icon: "text-teal-400" },
    "Segundo Ciclo": { bg: "bg-blue-900/20", border: "border-blue-800", icon: "text-blue-400" },
    "Tercer Ciclo": { bg: "bg-violet-900/20", border: "border-violet-800", icon: "text-violet-400" },
  };
  return map[ciclo.nombre] || { bg: "bg-slate-800", border: "border-slate-700", icon: "text-slate-400" };
}

function CiclosSection({ asignaturas, stats, grados, darkMode }: { asignaturas: MateriaConGrado[]; stats: GradeStats[]; grados: Grado[]; darkMode: boolean }) {
  const [expandedCiclo, setExpandedCiclo] = useState<string | null>(null);

  const toggleCiclo = (nombre: string) => {
    setExpandedCiclo(expandedCiclo === nombre ? null : nombre);
  };

  return (
    <div className="space-y-3">
      {CICLOS.map(ciclo => {
        const d = getCicloDark(ciclo);

        // Materias del ciclo
        const materiasDelCiclo = asignaturas.filter(m => m.grado?.numero && ciclo.grados.includes(m.grado.numero));

        // Agrupar materias por grado
        const porGrado = ciclo.grados.map(num => {
          const gradoMaterias = materiasDelCiclo.filter(m => m.grado?.numero === num).map(m => m.nombre);
          const mat = materiasDelCiclo.find(m => m.grado?.numero === num);
          const seccion = mat?.grado?.seccion ?? "A";
          const gradoInfo = grados.find(g => g.numero === num);
          return { grado: num, seccion, materias: gradoMaterias, estudianteCount: gradoInfo?._count?.estudiantes ?? 0 };
        }).filter(g => g.materias.length > 0);

        if (porGrado.length === 0) return null;

        const totalMaterias = porGrado.reduce((a, g) => a + g.materias.length, 0);
        const totalEstudiantesCiclo = porGrado.reduce((a, g) => a + g.estudianteCount, 0);
        const isOpen = expandedCiclo === ciclo.nombre;

        // Stats de este ciclo
        const statsDelCiclo = stats.filter(s => {
          const num = parseInt(s.nombre?.match(/\d+/)?.[0] || "0");
          return ciclo.grados.includes(num);
        });

        // Promedio del ciclo - solo promediar grados que tengan al menos un tipo con datos
        const statsConDatos = statsDelCiclo.filter(s =>
          s.promedios?.cotidiana != null || s.promedios?.integradora != null || s.promedios?.examen != null
        );
        const promCiclo = statsConDatos.length > 0
          ? Math.round((statsConDatos.reduce((a, s) => a + (((s.promedios?.cotidiana ?? 0) + (s.promedios?.integradora ?? 0) + (s.promedios?.examen ?? 0)) / 3), 0) / statsConDatos.length) * 100) / 100
          : null;

        // Promedio por grado - null sin datos
        const promPorGrado = porGrado.map(g => {
          const stat = stats.find(s => s.nombre?.includes(`${g.grado}°`));
          const tieneDatos = stat && (stat.promedios?.cotidiana != null || stat.promedios?.integradora != null || stat.promedios?.examen != null);
          const prom = tieneDatos && stat
            ? Math.round(((stat.promedios?.cotidiana ?? 0) + (stat.promedios?.integradora ?? 0) + (stat.promedios?.examen ?? 0)) / 3 * 100) / 100
            : null;
          return { ...g, promedio: prom };
        });

        return (
          <Card key={ciclo.nombre} className={`shadow-sm overflow-hidden ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'border-slate-100'}`}>
            <div className={`h-1 w-full ${darkMode ? d.bg.replace('/20', '') : ciclo.colorBg}`} />
            <CardHeader
              className={`flex flex-row items-center justify-between cursor-pointer py-3 px-4 ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}
              onClick={() => toggleCiclo(ciclo.nombre)}
            >
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${darkMode ? d.bg : ciclo.colorBg}`}>
                  <Book className={`h-4 w-4 ${darkMode ? d.icon : ciclo.iconColor}`} />
                </div>
                <div>
                  <CardTitle className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{ciclo.nombre}</CardTitle>
                  <CardDescription className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {porGrado.map(g => `${g.grado}°${g.seccion}`).join(", ")} · {totalMaterias} asignaturas · {totalEstudiantesCiclo} estudiantes
                  </CardDescription>
                </div>
              </div>
              {isOpen
                ? <ChevronDown className={`h-5 w-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                : <ChevronRight className={`h-5 w-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
            </CardHeader>

            {isOpen && (
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                {/* Resumen del ciclo */}
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="text-center">
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Estudiantes</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{totalEstudiantesCiclo}</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Asignaturas</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{totalMaterias}</p>
                  </div>
                  <div className="text-center col-span-2 sm:col-span-1">
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Promedio Ciclo</p>
                    <p className={`text-lg font-bold ${promCiclo != null && Math.round(promCiclo) >= 5 ? (darkMode ? 'text-teal-400' : 'text-teal-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                      {promCiclo != null ? promCiclo.toFixed(2) : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Detalle por grado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {promPorGrado.map(grupo => (
                    <div key={grupo.grado} className={`rounded-lg border p-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {grupo.grado}° "{grupo.seccion}"
                        </h4>
                        <Badge variant={grupo.promedio != null && Math.round(grupo.promedio) >= 5 ? "default" : "destructive"} className={`text-[10px] h-5 ${grupo.promedio != null && Math.round(grupo.promedio) >= 5 ? (darkMode ? 'bg-teal-600' : 'bg-teal-600') : ''}`}>
                          {grupo.promedio != null ? grupo.promedio.toFixed(1) : "N/A"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <Users className={`h-3 w-3 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                        <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{grupo.estudianteCount} estudiantes</span>
                      </div>
                      <ul className="space-y-1">
                        {grupo.materias.sort().map((mat, i) => (
                          <li key={i} className={`text-xs flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${darkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
                            {mat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// Componente de progreso circular para promedio institucional
function PromedioCircular({ valor, darkMode }: { valor: number | null; darkMode: boolean }) {
  const radius = 54;
  const stroke = 8;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = valor != null ? circumference - (valor / 10) * circumference : circumference;
  const color = valor != null && Math.round(valor) >= 5 ? "#14b8a6" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={radius * 2} height={radius * 2} className="-rotate-90">
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={darkMode ? "#334155" : "#e2e8f0"}
            strokeWidth={stroke}
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={valor != null ? color : "transparent"}
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {valor != null ? valor.toFixed(2) : "—"}
          </span>
          <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>de 10</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className={`text-xs font-medium ${valor != null && Math.round(valor) >= 5 ? 'text-teal-500' : valor != null ? 'text-red-500' : ''}`}>
          {valor != null && Math.round(valor) >= 5 ? '✓ Aprobado' : valor != null ? '⚠ En riesgo' : 'Sin datos'}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard({ usuario, grados, totalEstudiantes, totalAsignaturas, asignaturasAsignadas, totalDocentes, configuracion }: DashboardProps) {
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
  const [stats, setStats] = useState<GradeStats[]>([]);
  const [selectedGradoId, setSelectedGradoId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [informeOpen, setInformeOpen] = useState(false);

  const esDirectiva = ["admin", "admin-directora", "admin-codirectora"].includes(usuario.rol);
  const esDocente = ["docente", "docente-orientador"].includes(usuario.rol);

  // Para docentes, obtener solo su grado asignado
  const gradoAsignado = esDocente ? (usuario.asignaturasAsignadas?.[0]?.gradoId || null) : null;

  // Filtrar grados según rol
  const gradosVisibles = esDirectiva
    ? grados
    : grados.filter(g => gradoAsignado ? g.id === gradoAsignado : false);

  // Calcular totales visibles
  const totalEstudiantesVisibles = gradosVisibles.reduce((sum, g) => sum + (g._count?.estudiantes || 0), 0);
  const totalAsignaturasVisibles = esDirectiva ? totalAsignaturas : asignaturasAsignadas?.length || 0;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Si es docente, pasar el gradoId asignado para filtrar
        const url = gradoAsignado
          ? `/api/stats/dashboard?gradoId=${gradoAsignado}`
          : "/api/stats/dashboard";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [gradoAsignado]);

  // Si es docente, seleccionar automáticamente su grado
  const selectedGradoIdEfectivo = esDocente && gradoAsignado ? gradoAsignado : selectedGradoId;
  const selectedStats = selectedGradoIdEfectivo === "all" ? null : stats.find(s => s.gradoId === selectedGradoIdEfectivo);

  const popChartData = gradosVisibles.map(g => ({
    name: `${g.numero}° ${g.seccion}`,
    estudiantes: g._count?.estudiantes || 0
  })).filter(g => g.estudiantes > 0);

  const categoryChartData = selectedStats ? [
    { name: "Cotidianas", valor: selectedStats.promedios.cotidiana, color: "#0d9488" },
    { name: "Integradoras", valor: selectedStats.promedios.integradora, color: "#0891b2" },
    { name: "Exámenes", valor: selectedStats.promedios.examen, color: "#4f46e5" }
  ] : [];

  // Promedio institucional - solo promediar grados con datos
  const gradosConDatos = stats.filter(s =>
    s.promedios?.cotidiana != null || s.promedios?.integradora != null || s.promedios?.examen != null
  );
  const promInstitucional = gradosConDatos.length > 0
    ? Math.round((gradosConDatos.reduce((a, s) => a + (((s.promedios?.cotidiana ?? 0) + (s.promedios?.integradora ?? 0) + (s.promedios?.examen ?? 0)) / 3), 0) / gradosConDatos.length) * 100) / 100
    : null;

  // Promedio por ciclo para la tarjeta institucional
  const promPorCiclo = CICLOS.map(ciclo => {
    const statsDelCiclo = stats.filter(s => {
      const num = parseInt(s.nombre?.match(/\d+/)?.[0] || "0");
      return ciclo.grados.includes(num);
    });
    const statsConDatos = statsDelCiclo.filter(s =>
      s.promedios?.cotidiana != null || s.promedios?.integradora != null || s.promedios?.examen != null
    );
    const prom = statsConDatos.length > 0
      ? Math.round((statsConDatos.reduce((a, s) => a + (((s.promedios?.cotidiana ?? 0) + (s.promedios?.integradora ?? 0) + (s.promedios?.examen ?? 0)) / 3), 0) / statsConDatos.length) * 100) / 100
      : null;
    return { nombre: ciclo.nombre, prom, color: ciclo.ringColor };
  });

  const todasAsignaturasList = asignaturasAsignadas || [];

  // Datos para gráfico de evolución por trimestre - solo contar datos no nulos
  const statsConAC = stats.filter(s => s.promedios?.cotidiana != null);
  const statsConAI = stats.filter(s => s.promedios?.integradora != null);
  const statsConEx = stats.filter(s => s.promedios?.examen != null);
  const trimesterChartData: Array<{ name: string; value: number; target: number }> = [];
  if (statsConAC.length > 0) {
    trimesterChartData.push({ name: "T1", value: Math.round(statsConAC.reduce((a, s) => a + (s.promedios?.cotidiana ?? 0), 0) / statsConAC.length * 100) / 100, target: 6.0 });
  }
  if (statsConAI.length > 0) {
    trimesterChartData.push({ name: "T2", value: Math.round(statsConAI.reduce((a, s) => a + (s.promedios?.integradora ?? 0), 0) / statsConAI.length * 100) / 100, target: 7.0 });
  }
  if (statsConEx.length > 0) {
    trimesterChartData.push({ name: "T3", value: Math.round(statsConEx.reduce((a, s) => a + (s.promedios?.examen ?? 0), 0) / statsConEx.length * 100) / 100, target: 7.0 });
  }

  return (
    <div className="space-y-4 pb-8">
      <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
        Hola, {usuario.nombre} 👋
      </h2>
      <p className={`text-base sm:text-lg font-medium mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {usuario.rol === "admin"
          ? "Bienvenido al panel de administración del sistema."
          : "Te damos la bienvenida al ciclo escolar."}
      </p>

      {usuario.rol === "admin" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {loading ? (
            <>
              <StatCard loading title="Total Estudiantes" value={0} subtitle="" icon={Users} iconColor="" iconBg="" accentColor="" darkMode />
              <StatCard loading title="Grados Activos" value={0} subtitle="" icon={School} iconColor="" iconBg="" accentColor="" darkMode />
              <StatCard loading title="Asignaturas" value={0} subtitle="" icon={BookOpen} iconColor="" iconBg="" accentColor="" darkMode />
              <StatCard loading title="Docentes" value={0} subtitle="" icon={GraduationCap} iconColor="" iconBg="" accentColor="" darkMode />
            </>
          ) : (
            <>
              <StatCard
                title="Total Estudiantes"
                value={totalEstudiantesVisibles}
                subtitle="Registrados"
                icon={Users}
                iconColor={darkMode ? "text-teal-400" : "text-teal-600"}
                iconBg={darkMode ? "bg-teal-900/50" : "bg-teal-50"}
                accentColor="bg-teal-500"
                darkMode={darkMode}
                delay={0}
              />

              <StatCard
                title="Grados Activos"
                value={gradosVisibles.length}
                subtitle="Secciones"
                icon={School}
                iconColor={darkMode ? "text-emerald-400" : "text-emerald-600"}
                iconBg={darkMode ? "bg-emerald-900/50" : "bg-emerald-50"}
                accentColor="bg-emerald-500"
                darkMode={darkMode}
                delay={0.1}
              />

              <StatCard
                title="Asignaturas"
                value={totalAsignaturasVisibles}
                subtitle="Impartidas"
                icon={BookOpen}
                iconColor={darkMode ? "text-blue-400" : "text-blue-600"}
                iconBg={darkMode ? "bg-blue-900/50" : "bg-blue-50"}
                accentColor="bg-blue-500"
                darkMode={darkMode}
                delay={0.2}
              />

              <StatCard
                title="Docentes"
                value={totalDocentes}
                subtitle="Activos"
                icon={GraduationCap}
                iconColor={darkMode ? "text-amber-400" : "text-amber-600"}
                iconBg={darkMode ? "bg-amber-900/50" : "bg-amber-50"}
                accentColor="bg-amber-500"
                darkMode={darkMode}
                delay={0.3}
              />
            </>
          )}
        </motion.div>
      )}

      {/* Promedio Institucional */}
      {esDirectiva && (
        <Card className={`shadow-sm overflow-hidden ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'border-slate-100'}`}>
          <div className="h-1 bg-gradient-to-r from-teal-500 via-blue-500 to-violet-500 w-full" />
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm sm:text-base flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              <Target className="h-5 w-5 text-teal-600" />
              Rendimiento Institucional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              {/* Promedio principal */}
              <div className="flex justify-center">
                <PromedioCircular valor={promInstitucional} darkMode={darkMode} />
              </div>

              {/* Promedios por ciclo */}
              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {promPorCiclo.map(c => {
                  const d = getCicloDark({ nombre: c.nombre } as CicloAsignaturas);
                  return (
                    <div key={c.nombre} className={`rounded-lg border p-3 text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{c.nombre}</p>
                      <p className={`text-2xl font-bold ${c.prom != null && Math.round(c.prom) >= 5 ? (darkMode ? 'text-teal-400' : 'text-teal-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                        {c.prom != null ? c.prom.toFixed(2) : "—"}
                      </p>
                      <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {c.prom != null && Math.round(c.prom) >= 5 ? '✓ Sobre umbral' : c.prom != null ? '⚠ Bajo umbral' : 'Sin datos'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolución por Trimestre */}
      {esDirectiva && trimesterChartData.length > 0 && (
        <GradeChart
          data={trimesterChartData}
          title="Evolución por Trimestres"
          description="Promedio institucional en cada período"
          icon={TrendingUp}
          showArea
          showTarget
          darkMode={darkMode}
          height={280}
        />
      )}

      {/* Asignaturas por Ciclo */}
      {esDirectiva && todasAsignaturasList.length > 0 && (
        <div>
          <h3 className={`text-base font-semibold mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <BookOpen className="h-5 w-5 inline mr-2 text-teal-600" />
            Asignaturas por Ciclo
          </h3>
          <CiclosSection asignaturas={todasAsignaturasList} stats={stats} grados={grados} darkMode={darkMode} />
          {esDirectiva && (
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => setInformeOpen(true)}
                className={`w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-sm`}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generar Informe Técnico Pedagógico-Didáctico
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialog de Informe */}
      {esDirectiva && configuracion && (
        <InformeTecnicoDialog
          open={informeOpen}
          onOpenChange={setInformeOpen}
          darkMode={darkMode}
          usuario={{ nombre: usuario.nombre, rol: usuario.rol }}
          configuracion={configuracion}
          stats={stats}
          grados={grados}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card className={`lg:col-span-2 xl:col-span-3 shadow-sm overflow-hidden flex flex-col ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'border-slate-100'}`}>
          <CardHeader className={`flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-4 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50'}`}>
            <div>
              <CardTitle className={`text-sm sm:text-base flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                <TrendingUp className="h-5 w-5 text-teal-600" />
                Rendimiento Académico
              </CardTitle>
              <CardDescription className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-slate-400' : ''}`}>
                {esDocente ? `Estadísticas de ${gradosVisibles[0]?.numero}° ${gradosVisibles[0]?.seccion}` : 'Promedios por categoría'}
              </CardDescription>
            </div>
            {/* Selector de grado solo para admins/directivos */}
            {!esDocente && (
              <Select value={selectedGradoId} onValueChange={setSelectedGradoId}>
                <SelectTrigger className={`w-full sm:w-[180px] h-9 text-xs sm:text-sm font-medium ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white'}`}>
                  <SelectValue placeholder="Seleccionar grado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm font-medium">Vista General</SelectItem>
                  {stats.map(s => (
                    <SelectItem key={s.gradoId} value={s.gradoId} className="text-xs sm:text-sm font-medium">
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 flex-1">
            {selectedGradoIdEfectivo === "all" ? (
              <div className="h-[200px] sm:h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#E2E8F0"} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                    <Tooltip cursor={{ fill: darkMode ? '#334155' : '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#333' }} />
                    <Bar dataKey="estudiantes" name="N° Estudiantes" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : selectedStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-start h-full">
                <div className="h-[200px] sm:h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#334155" : "#E2E8F0"} />
                      <XAxis type="number" domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} width={80} />
                      <Tooltip cursor={{ fill: darkMode ? '#334155' : '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', backgroundColor: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#333' }} />
                      <Bar dataKey="valor" name="Promedio" radius={[0, 4, 4, 0]} barSize={25}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
                  <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-teal-900/30 border-teal-800' : 'bg-teal-50/50 border-teal-100'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${darkMode ? 'text-teal-300' : 'text-teal-800'}`}>
                      <Trophy className="h-4 w-4 text-amber-500" /> Cuadro de Honor
                    </h4>
                    <div className="space-y-2">
                      {selectedStats.topEstudiantes.length > 0 ? selectedStats.topEstudiantes.map((est, i) => (
                        <div key={est.id} className="flex items-center justify-between text-xs sm:text-sm">
                          <span className={`truncate max-w-[100px] sm:max-w-[150px] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{i + 1}. {est.nombre}</span>
                          <Badge variant="outline" className={`py-0 h-5 text-xs ${darkMode ? 'bg-slate-800 text-teal-400 border-teal-700' : 'bg-white text-teal-700 border-teal-200'}`}>
                            {est.promedio.toFixed(1)}
                          </Badge>
                        </div>
                      )) : <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Sin datos</p>}
                    </div>
                  </div>
                  <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50/50 border-red-100'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                      <AlertTriangle className="h-4 w-4 text-red-500" /> Alertas
                    </h4>
                    <div className="space-y-2">
                      {selectedStats.alertas.length > 0 ? selectedStats.alertas.map((est, i) => (
                        <div key={est.id} className="flex items-center justify-between text-xs sm:text-sm">
                          <span className={`truncate max-w-[100px] sm:max-w-[150px] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{est.nombre}</span>
                          <Badge variant="destructive" className="bg-red-500 text-white font-bold py-0 h-5 text-xs">
                            {est.promedio.toFixed(1)}
                          </Badge>
                        </div>
                      )) : <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Sin alertas</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`h-[200px] sm:h-[250px] flex items-center justify-center`}>
                <Skeleton className={`h-32 w-3/4 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:gap-4 lg:col-span-1 xl:col-span-1">
          {(usuario.rol === "docente" || usuario.rol === "docente-orientador") && asignaturasAsignadas && asignaturasAsignadas.length > 0 && (
            <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'border-slate-100'}`}>
              <CardHeader className={`py-3 px-4 border-b ${darkMode ? 'border-slate-700' : ''}`}>
                <CardTitle className={`text-xs font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mis Asignaturas</CardTitle>
              </CardHeader>
              <CardContent className="p-3 max-h-[200px] overflow-y-auto">
                <div className="space-y-2">
                  {asignaturasAsignadas.map(m => (
                    <div key={m.id} className={`p-2 rounded border text-xs flex justify-between items-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border'}`}>
                      <span className={`font-medium truncate mr-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.nombre}</span>
                      <Badge variant="secondary" className={`text-[10px] whitespace-nowrap ${darkMode ? 'bg-slate-700 text-slate-300' : ''}`}>{m.grado?.numero}°{m.grado?.seccion}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={`shadow-sm flex-1 ${darkMode ? 'bg-[#1e293b] border-slate-700' : 'border-slate-100'}`}>
            <CardHeader className={`py-3 px-4 border-b ${darkMode ? 'border-slate-700' : ''}`}>
              <CardTitle className={`text-xs font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gestión Rápida</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div className={`p-3 border rounded-lg flex items-center gap-3 hover:bg-teal-50 transition-colors cursor-pointer group ${darkMode ? 'bg-teal-900/30 border-teal-800 hover:bg-teal-900/50' : 'bg-teal-50/50 border-teal-100'}`} onClick={() => (window as any).setActiveTab?.('calificaciones')}>
                <div className={`p-2 rounded-md shrink-0 group-hover:scale-110 transition-transform ${darkMode ? 'bg-teal-800 text-teal-300' : 'bg-teal-100 text-teal-700'}`}><ClipboardList className="h-5 w-5" /></div>
                <div>
                  <h4 className={`text-sm font-bold ${darkMode ? 'text-teal-200' : 'text-teal-900'}`}>Pasar Notas</h4>
                  <p className={`text-[11px] ${darkMode ? 'text-teal-400' : 'text-teal-700/70'}`}>Calificaciones</p>
                </div>
              </div>
              <div className={`p-3 border rounded-lg flex items-center gap-3 hover:bg-blue-50 transition-colors cursor-pointer group ${darkMode ? 'bg-blue-900/30 border-blue-800 hover:bg-blue-900/50' : 'bg-blue-50/50 border-blue-100'}`} onClick={() => (window as any).setActiveTab?.('asistencia')}>
                <div className={`p-2 rounded-md shrink-0 group-hover:scale-110 transition-transform ${darkMode ? 'bg-blue-800 text-blue-300' : 'bg-blue-100 text-blue-700'}`}><CalendarDays className="h-5 w-5" /></div>
                <div>
                  <h4 className={`text-sm font-bold ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>Asistencia</h4>
                  <p className={`text-[11px] ${darkMode ? 'text-blue-400' : 'text-blue-700/70'}`}>Control diario</p>
                </div>
              </div>
              {usuario.rol === "admin" && (
                <div className={`p-3 border rounded-lg flex items-center gap-3 hover:bg-amber-50 transition-colors cursor-pointer group ${darkMode ? 'bg-amber-900/30 border-amber-800 hover:bg-amber-900/50' : 'bg-amber-50/50 border-amber-100'}`} onClick={() => (window as any).setActiveTab?.('admin')}>
                  <div className={`p-2 rounded-md shrink-0 group-hover:scale-110 transition-transform ${darkMode ? 'bg-amber-800 text-amber-300' : 'bg-amber-100 text-amber-700'}`}><GraduationCap className="h-5 w-5" /></div>
                  <div>
                    <h4 className={`text-sm font-bold ${darkMode ? 'text-amber-200' : 'text-amber-900'}`}>Docentes</h4>
                    <p className={`text-[11px] ${darkMode ? 'text-amber-400' : 'text-amber-700/70'}`}>Administración</p>
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
