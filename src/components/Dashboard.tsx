"use client";

import { useState, useEffect, useRef, memo } from "react";
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
import { MathInfoButton, mathExplanations } from "./MathInfoButton";
import { CiclosSection } from "./CiclosSection";
import { PromedioCircular } from "./PromedioCircular";

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
  configuracion?: { añoEscolar: number; escuela: string; umbralAprobado?: number };
}

interface GradeStats {
  gradoId: string;
  nombre: string;
  promedios: {
    cotidiana: number;
    integradora: number;
    examen: number;
  };
  topEstudiantes: { id: string, nombre: string, numero: number, promedio: number, estado?: string }[];
  alertas: { id: string, nombre: string, numero: number, promedio: number, estado?: string }[];
  materias?: { id: string; nombre: string; promedio: number | null }[];
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

/**
 * Calcula el promedio de un grado respetando la formula original (categorias)
 * pero permitiendo filtrar por materias seleccionadas.
 * Cuando todas las materias con datos estan seleccionadas, devuelve exactamente
 * el mismo resultado que el calculo historico por categorias.
 */
function calcularPromedioGradoAjustado(
  stat: GradeStats | undefined,
  selectedMaterias: Set<string>
): number | null {
  if (!stat) return null;

  // Promedio original por categorias (metodo historico)
  const tieneDatos =
    stat.promedios?.cotidiana != null ||
    stat.promedios?.integradora != null ||
    stat.promedios?.examen != null;
  if (!tieneDatos) return null;

  const promOriginal =
    ((stat.promedios.cotidiana ?? 0) +
      (stat.promedios.integradora ?? 0) +
      (stat.promedios.examen ?? 0)) /
    3;

  const allMaterias = stat.materias || [];
  const materiasConDatos = allMaterias.filter(m => m.promedio != null);
  const selectedConDatos = materiasConDatos.filter(m => selectedMaterias.has(m.id));

  if (selectedConDatos.length === 0) return null;

  // Si todas las materias con datos estan seleccionadas, devolver el original
  if (selectedConDatos.length === materiasConDatos.length) {
    return Math.round(promOriginal * 100) / 100;
  }

  // Ajuste proporcional segun las materias seleccionadas
  const promTodas =
    materiasConDatos.reduce((a, m) => a + (m.promedio ?? 0), 0) /
    materiasConDatos.length;

  const promSeleccionadas =
    selectedConDatos.reduce((a, m) => a + (m.promedio ?? 0), 0) /
    selectedConDatos.length;

  if (promTodas === 0) return null;

  return Math.round(promOriginal * (promSeleccionadas / promTodas) * 100) / 100;
}





const Dashboard = memo(function Dashboard({ usuario, grados, totalEstudiantes, totalAsignaturas, asignaturasAsignadas, totalDocentes, configuracion }: DashboardProps) {
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
  const [stats, setStats] = useState<GradeStats[]>([]);
  const [selectedGradoId, setSelectedGradoId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [informeOpen, setInformeOpen] = useState(false);
  const [selectedMaterias, setSelectedMaterias] = useState<Set<string>>(new Set());

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
        const res = await fetch(url, { credentials: "include" });
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

  // Promedio por ciclo para la tarjeta institucional — basado en materias seleccionadas
  const promPorCiclo = CICLOS.map(ciclo => {
    const gradosDelCiclo = grados.filter(g => ciclo.grados.includes(g.numero));
    const promsGrado = gradosDelCiclo
      .map(g => calcularPromedioGradoAjustado(stats.find(s => s.gradoId === g.id), selectedMaterias))
      .filter((p): p is number => p !== null);

    const prom = promsGrado.length > 0
      ? Math.round((promsGrado.reduce((a, b) => a + b, 0) / promsGrado.length) * 100) / 100
      : null;

    return { nombre: ciclo.nombre, prom, color: ciclo.ringColor };
  });

  // Promedio institucional: promedio de los promedios de ciclo validos
  const promsCicloValidos = promPorCiclo.map(c => c.prom).filter((p): p is number => p !== null);
  const promInstitucional = promsCicloValidos.length > 0
    ? Math.round((promsCicloValidos.reduce((a, b) => a + b, 0) / promsCicloValidos.length) * 100) / 100
    : null;

  const todasAsignaturasList = asignaturasAsignadas || [];

  // Inicializar seleccion de materias con todas las disponibles
  // Nota: usamos useEffect con ref de guarda para evitar cascadas innecesarias.
  const materiasInitRef = useRef(false);
  useEffect(() => {
    if (!materiasInitRef.current && todasAsignaturasList.length > 0) {
      materiasInitRef.current = true;
       
      setSelectedMaterias(new Set(todasAsignaturasList.map(m => m.id)));
    }
  }, [todasAsignaturasList]);

  // Datos para gráfico de evolución por categoría - solo contar datos no nulos
  const statsConAC = stats.filter(s => s.promedios?.cotidiana != null);
  const statsConAI = stats.filter(s => s.promedios?.integradora != null);
  const statsConEx = stats.filter(s => s.promedios?.examen != null);
  const evolutionChartData: Array<{ name: string; value: number; target: number }> = [];
  if (statsConAC.length > 0) {
    evolutionChartData.push({ name: "Cotidianas", value: Math.round(statsConAC.reduce((a, s) => a + (s.promedios?.cotidiana ?? 0), 0) / statsConAC.length * 100) / 100, target: 6.0 });
  }
  if (statsConAI.length > 0) {
    evolutionChartData.push({ name: "Integradoras", value: Math.round(statsConAI.reduce((a, s) => a + (s.promedios?.integradora ?? 0), 0) / statsConAI.length * 100) / 100, target: 7.0 });
  }
  if (statsConEx.length > 0) {
    evolutionChartData.push({ name: "Exámenes", value: Math.round(statsConEx.reduce((a, s) => a + (s.promedios?.examen ?? 0), 0) / statsConEx.length * 100) / 100, target: 7.0 });
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="animate-fade-slide-up">
        <h2 className="font-display text-xl sm:text-2xl tracking-tight text-foreground">
          Hola, {usuario.nombre}
        </h2>
        <p className="text-sm sm:text-base mt-1 text-muted-foreground">
          {usuario.rol === "admin"
            ? "Bienvenido al panel de administración del sistema."
            : "Te damos la bienvenida al ciclo escolar."}
        </p>
      </div>

      {usuario.rol === "admin" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            <>
              <StatCard loading title="Total Estudiantes" value={0} subtitle="" icon={Users} iconColor="text-accent" iconBg="bg-accent" accentColor="bg-accent" darkMode />
              <StatCard loading title="Grados Activos" value={0} subtitle="" icon={School} iconColor="text-accent" iconBg="bg-accent" accentColor="bg-accent" darkMode />
              <StatCard loading title="Asignaturas" value={0} subtitle="" icon={BookOpen} iconColor="text-accent" iconBg="bg-accent" accentColor="bg-accent" darkMode />
              <StatCard loading title="Docentes" value={0} subtitle="" icon={GraduationCap} iconColor="text-accent" iconBg="bg-accent" accentColor="bg-accent" darkMode />
            </>
          ) : (
            <>
              <div className="animate-fade-slide-up" style={{ animationDelay: '0s' }}>
                <StatCard
                  title="Total Estudiantes"
                  value={totalEstudiantesVisibles}
                  subtitle="Registrados"
                  icon={Users}
                  iconColor="text-accent"
                  iconBg="bg-accent"
                  accentColor="bg-accent"
                  darkMode={darkMode}
                  delay={0}
                  action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.totalEstudiantes} />}
                />
              </div>

              <div className="animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
                <StatCard
                  title="Grados Activos"
                  value={gradosVisibles.length}
                  subtitle="Secciones"
                  icon={School}
                  iconColor="text-accent"
                  iconBg="bg-accent"
                  accentColor="bg-accent"
                  darkMode={darkMode}
                  delay={0.1}
                  action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.gradosActivos} />}
                />
              </div>

              <div className="animate-fade-slide-up" style={{ animationDelay: '0.2s' }}>
                <StatCard
                  title="Asignaturas"
                  value={totalAsignaturasVisibles}
                  subtitle="Impartidas"
                  icon={BookOpen}
                  iconColor="text-accent"
                  iconBg="bg-accent"
                  accentColor="bg-accent"
                  darkMode={darkMode}
                  delay={0.2}
                  action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.asignaturas} />}
                />
              </div>

              <div className="animate-fade-slide-up" style={{ animationDelay: '0.3s' }}>
                <StatCard
                  title="Docentes"
                  value={totalDocentes}
                  subtitle="Activos"
                  icon={GraduationCap}
                  iconColor="text-accent"
                  iconBg="bg-accent"
                  accentColor="bg-accent"
                  darkMode={darkMode}
                  delay={0.3}
                  action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.docentes} />}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Promedio Institucional */}
      {esDirectiva && (
        <div className="animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
          <Card className="shadow-sm overflow-hidden bg-card border-border">
            <div className="h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent w-full" />
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-display text-sm sm:text-base flex items-center gap-2 text-card-foreground">
                <Target className="h-4 w-4 text-accent" />
                Rendimiento Institucional
              </CardTitle>
              <MathInfoButton darkMode={darkMode} explanation={mathExplanations.rendimientoInstitucional} />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <div className="flex justify-center">
                  <PromedioCircular valor={promInstitucional} darkMode={darkMode} />
                </div>
                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {promPorCiclo.map(c => (
                    <div key={c.nombre} className="rounded-sm border border-border p-3 text-center bg-muted/30">
                      <p className="font-display text-xs mb-1 text-muted-foreground/70">{c.nombre}</p>
                      <p className={`text-2xl font-semibold font-mono ${c.prom != null && Math.round(c.prom) >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {c.prom != null ? c.prom.toFixed(2) : "—"}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground/50">
                        {c.prom != null && Math.round(c.prom) >= 5 ? 'Sobre umbral' : c.prom != null ? 'Bajo umbral' : 'Sin datos'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Promedio por Categoría */}
      {esDirectiva && evolutionChartData.length > 0 && (
        <div className="animate-fade-slide-up" style={{ animationDelay: '0.2s' }}>
          <GradeChart
            data={evolutionChartData}
            title="Promedio por Categoría"
            description="Promedio institucional por tipo de actividad"
            icon={TrendingUp}
            showArea
            showTarget
            darkMode={darkMode}
            height={280}
            action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.promedioPorCategoria} />}
          />
        </div>
      )}

      {/* Asignaturas por Ciclo */}
      {esDirectiva && todasAsignaturasList.length > 0 && (
        <div className="animate-fade-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display text-base text-foreground">
              <BookOpen className="h-4 w-4 inline mr-2 text-accent" />
              Asignaturas por Ciclo
            </h3>
            <MathInfoButton darkMode={darkMode} explanation={mathExplanations.asignaturasPorCiclo} />
          </div>
          <CiclosSection asignaturas={todasAsignaturasList} stats={stats} grados={grados} darkMode={darkMode} selectedMaterias={selectedMaterias} setSelectedMaterias={setSelectedMaterias} />
          {esDirectiva && (
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => setInformeOpen(true)}
                className={`w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm`}
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
        <Card className="lg:col-span-2 xl:col-span-3 shadow-sm overflow-hidden flex flex-col bg-card border-border">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-4 bg-muted/30">
            <div>
              <CardTitle className="font-display text-sm sm:text-base flex items-center gap-2 text-card-foreground">
                <TrendingUp className="h-4 w-4 text-accent" />
                Rendimiento Académico
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                {esDocente ? `Estadísticas de ${gradosVisibles[0]?.numero}° ${gradosVisibles[0]?.seccion}` : 'Promedios por categoría'}
              </CardDescription>
            </div>
            {!esDocente && (
              <Select value={selectedGradoId} onValueChange={setSelectedGradoId}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs sm:text-sm font-medium bg-background border-border text-foreground">
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
                    <Tooltip cursor={{ fill: darkMode ? '#334155' : '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', backgroundColor: darkMode ? '#1a1a1a' : '#fff', color: darkMode ? '#e8e8e8' : '#111' }} />
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
                    <Tooltip cursor={{ fill: darkMode ? '#334155' : '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', backgroundColor: darkMode ? '#1a1a1a' : '#fff', color: darkMode ? '#e8e8e8' : '#111' }} />
                      <Bar dataKey="valor" name="Promedio" radius={[0, 4, 4, 0]} barSize={25}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4">
                  <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-teal-900/20 border-teal-800/60' : 'bg-teal-50/50 border-teal-100'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>
                      <Trophy className="h-4 w-4 text-amber-500" /> Cuadro de Honor
                    </h4>
                    <div className="space-y-2">
                      {selectedStats.topEstudiantes.length > 0 ? selectedStats.topEstudiantes.map((est, i) => (
                        <div key={est.id} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                          <span className={`flex-1 truncate ${darkMode ? 'text-slate-400' : 'text-slate-700'}`} title={`${i + 1}. ${est.nombre}`}>{i + 1}. {est.nombre}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {est.estado === "CONDICIONADO" && (
                              <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700">C</Badge>
                            )}
                            {est.estado === "REPROBADO" && (
                              <Badge variant="destructive" className="text-[9px] py-0 h-4 px-1">R</Badge>
                            )}
                            <Badge variant="outline" className={`shrink-0 py-0 h-5 text-xs ${darkMode ? 'bg-slate-800 text-teal-400 border-teal-700' : 'bg-white text-teal-700 border-teal-200'}`}>
                              {est.promedio.toFixed(1)}
                            </Badge>
                          </div>
                        </div>
                        )) : <p className="text-xs text-muted-foreground">Sin datos</p>}
                    </div>
                  </div>
                  <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-red-900/20 border-red-800/60' : 'bg-red-50/50 border-red-100'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                      <AlertTriangle className="h-4 w-4 text-red-500" /> Alertas
                    </h4>
                    <div className="space-y-2">
                      {selectedStats.alertas.length > 0 ? selectedStats.alertas.map((est, i) => (
                        <div key={est.id} className="flex items-center justify-between text-xs sm:text-sm gap-2">
                          <span className={`flex-1 truncate ${darkMode ? 'text-slate-400' : 'text-slate-700'}`} title={est.nombre}>{est.nombre}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {est.estado === "CONDICIONADO" && (
                              <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700">C</Badge>
                            )}
                            {est.estado === "REPROBADO" && (
                              <Badge variant="destructive" className="text-[9px] py-0 h-4 px-1">R</Badge>
                            )}
                            <Badge variant={est.estado === "REPROBADO" ? "destructive" : "secondary"} className={`shrink-0 font-bold py-0 h-5 text-xs ${est.estado === "CONDICIONADO" ? 'bg-amber-500 text-white' : est.estado === "REPROBADO" ? 'bg-red-500 text-white' : 'bg-red-500 text-white'}`}>
                              {est.promedio.toFixed(1)}
                            </Badge>
                          </div>
                        </div>
                        )) : <p className="text-xs text-muted-foreground">Sin alertas</p>}
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
            <Card className="shadow-sm bg-card border-border">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Mis Asignaturas</CardTitle>
              </CardHeader>
              <CardContent className="p-3 max-h-[200px] overflow-y-auto">
                <div className="space-y-1.5">
                  {asignaturasAsignadas.map(m => (
                    <div key={m.id} className="p-2 text-xs flex justify-between items-center bg-muted/30 border border-border rounded-sm">
                      <span className="font-medium truncate mr-2 text-foreground/80">{m.nombre}</span>
                      <span className="font-mono text-[10px] text-muted-foreground/60">{m.grado?.numero}°{m.grado?.seccion}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm flex-1 bg-card border-border">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Gestión Rápida</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2">
              <div className="p-3 flex items-center gap-3 cursor-pointer group transition-all bg-muted/20 border border-border hover:bg-muted/40 rounded-sm" onClick={() => (window as any).setActiveTab?.('calificaciones')}>
                <div className="p-2 shrink-0 group-hover:scale-105 transition-transform bg-accent text-accent-foreground rounded-sm"><ClipboardList className="h-5 w-5" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Pasar Notas</h4>
                  <p className="text-[11px] text-muted-foreground/60">Calificaciones</p>
                </div>
              </div>
              <div className="p-3 flex items-center gap-3 cursor-pointer group transition-all bg-muted/20 border border-border hover:bg-muted/40 rounded-sm" onClick={() => (window as any).setActiveTab?.('asistencia')}>
                <div className="p-2 shrink-0 group-hover:scale-105 transition-transform bg-accent text-accent-foreground rounded-sm"><CalendarDays className="h-5 w-5" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Asistencia</h4>
                  <p className="text-[11px] text-muted-foreground/60">Control diario</p>
                </div>
              </div>
              {usuario.rol === "admin" && (
                <div className="p-3 flex items-center gap-3 cursor-pointer group transition-all bg-muted/20 border border-border hover:bg-muted/40 rounded-sm" onClick={() => (window as any).setActiveTab?.('admin')}>
                  <div className="p-2 shrink-0 group-hover:scale-105 transition-transform bg-accent text-accent-foreground rounded-sm"><GraduationCap className="h-5 w-5" /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Docentes</h4>
                    <p className="text-[11px] text-muted-foreground/60">Administración</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
