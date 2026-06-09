"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type LucideIcon, Users, BookOpen, School, GraduationCap, Book, Target, TrendingUp, ChevronDown, ChevronRight, Trophy, AlertTriangle, ClipboardList, CalendarDays } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { GradeChart } from "@/components/ui/grade-chart";
import { MathInfoButton, mathExplanations } from "./MathInfoButton";
import { CiclosSection } from "./CiclosSection";
import { PromedioCircular } from "./PromedioCircular";
import { EscalaDesempeno } from "./EscalaDesempeno";
import { CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import { CICLOS, getCicloDark, CicloAsignaturas } from "@/lib/ciclos";
import { AgentAlertsPanel } from "./AgentAlertsPanel";

interface UsuarioSesion { id: string; email: string; nombre: string; rol: string; asignaturasAsignadas?: Array<{ gradoId: string }>; }
interface Grado { id: string; numero: number; seccion: string; _count?: { estudiantes: number; materias: number; }; }

interface MateriaConGrado {
  id: string;
  nombre: string;
  gradoId?: string;
  grado?: { id: string; numero: number; seccion: string };
}

interface DashboardProps {
  usuario: UsuarioSesion;
  grados: Grado[];
  totalEstudiantes: number;
  totalAsignaturas: number;
  asignaturasAsignadas?: MateriaConGrado[];
  totalDocentes: number;
  configuracion?: { añoEscolar: number; escuela: string; umbralAprobado?: number };
  onNavigate?: (tab: string) => void;
}

interface TrimestreStats {
  promedios: {
    cotidiana: number | null;
    integradora: number | null;
    examen: number | null;
  };
  topEstudiantes: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[];
  alertas: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[];
  materias?: { id: string; nombre: string; promedio: number | null; topEstudiantes?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[]; alertas?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[] }[];
}

interface GradeStats {
  gradoId: string;
  nombre: string;
  numero: number;
  seccion: string;
  promedios?: {
    cotidiana: number;
    integradora: number;
    examen: number;
  };
  topEstudiantes?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[];
  alertas?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[];
  materias?: { id: string; nombre: string; promedio: number | null; topEstudiantes?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[]; alertas?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[] }[];
  trimestres?: {
    1: TrimestreStats;
    2: TrimestreStats;
    3: TrimestreStats;
  };
}

function calcularPromedioGradoAjustado(
  stat: GradeStats | undefined,
  selectedMaterias: Set<string>,
  trimestreKey?: 1 | 2 | 3
): number | null {
  if (!stat) return null;

  const tStats = trimestreKey && stat.trimestres ? stat.trimestres[trimestreKey] : undefined;
  const promedios = tStats ? tStats.promedios : stat.promedios;
  const materias = tStats ? tStats.materias : stat.materias;

  const tieneDatos =
    promedios?.cotidiana != null ||
    promedios?.integradora != null ||
    promedios?.examen != null;
  if (!tieneDatos) return null;

  const promOriginal =
    ((promedios?.cotidiana ?? 0) +
      (promedios?.integradora ?? 0) +
      (promedios?.examen ?? 0)) / 3;

  const allMaterias = materias || [];
  const materiasConDatos = allMaterias.filter(m => m.promedio != null);
  const selectedConDatos = materiasConDatos.filter(m => selectedMaterias.has(m.id));

  if (selectedConDatos.length === 0) return null;

  if (selectedConDatos.length === materiasConDatos.length) {
    return Math.round(promOriginal * 100) / 100;
  }

  const promTodas =
    materiasConDatos.reduce((a, m) => a + (m.promedio ?? 0), 0) /
    materiasConDatos.length;

  const promSeleccionadas =
    selectedConDatos.reduce((a, m) => a + (m.promedio ?? 0), 0) /
    selectedConDatos.length;

  if (promTodas === 0) return null;

  return Math.round(promOriginal * (promSeleccionadas / promTodas) * 100) / 100;
}

function StatBadge({ icon: Icon, label, value, note, darkMode, action }: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  note: string;
  darkMode: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="group relative p-3 rounded-md border border-border bg-card hover:shadow-sm transition-all overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent/70 via-accent/30 to-transparent" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-sm bg-accent/10 text-accent shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">{label}</p>
          <p className="text-lg font-bold font-mono text-foreground tabular-nums leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground/60">{note}</p>
        </div>
        {action && (
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionRow({ icon: Icon, label, sub, onClick }: {
  icon: LucideIcon;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button className="flex items-center gap-3 p-2.5 rounded-sm cursor-pointer group transition-all w-full text-left bg-muted/10 border border-border hover:bg-muted/25 hover:border-accent/20" onClick={onClick}>
      <div className="p-1.5 shrink-0 rounded-sm bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h4 className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">{label}</h4>
        <p className="text-[10px] text-muted-foreground/70">{sub}</p>
      </div>
    </button>
  );
}

const Dashboard = memo(function Dashboard({ usuario, grados, totalEstudiantes, totalAsignaturas, asignaturasAsignadas, totalDocentes, configuracion, onNavigate }: DashboardProps) {
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
  const [stats, setStats] = useState<GradeStats[]>([]);
  const [selectedGradoId, setSelectedGradoId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedMaterias, setSelectedMaterias] = useState<Set<string>>(new Set());
  const [selectedTrimestre, setSelectedTrimestre] = useState<'anual' | 1 | 2 | 3>('anual');
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>('all');
  const [miAvance, setMiAvance] = useState<{
    porcentajeGlobal: number;
    globalCompleto: number;
    globalParcial: number;
    globalVacio: number;
    globalEsperado: number;
    materias: Array<{
      materiaNombre: string;
      gradoNumero: number;
      gradoSeccion: string;
      porcentaje: number;
    }>;
  } | null>(null);

  const esDirectiva = ["admin", "admin-directora", "admin-codirectora"].includes(usuario.rol);
  const esDocente = ["docente", "docente-orientador"].includes(usuario.rol);

  const gradoAsignado = esDocente ? (usuario.asignaturasAsignadas?.[0]?.gradoId || null) : null;

  const gradosVisibles = esDirectiva
    ? grados
    : grados.filter(g => gradoAsignado ? g.id === gradoAsignado : false);

  const totalEstudiantesVisibles = gradosVisibles.reduce((sum, g) => sum + (g._count?.estudiantes || 0), 0);
  const totalAsignaturasVisibles = esDirectiva ? totalAsignaturas : asignaturasAsignadas?.length || 0;

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const url = gradoAsignado
          ? `/api/stats/dashboard?gradoId=${gradoAsignado}&trimestre=all`
          : "/api/stats/dashboard?trimestre=all";
        const res = await fetch(url, { credentials: "include" });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching stats:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStats();

    if (esDocente && !cancelled) {
      fetch("/api/stats/avance-docentes", { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!cancelled && data && data.length > 0) {
            setMiAvance(data[0]);
          }
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [gradoAsignado, esDocente]);

  const selectedGradoIdEfectivo = esDocente && gradoAsignado ? gradoAsignado : selectedGradoId;
  const selectedStats = selectedGradoIdEfectivo === "all" ? null : stats.find(s => s.gradoId === selectedGradoIdEfectivo);

  // Effective stats based on selected trimester and subject
  const effectiveStats = useMemo(() => {
    if (!selectedStats) return null;

    let baseStats: {
      promedios?: { cotidiana: number | null; integradora: number | null; examen: number | null };
      topEstudiantes?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[];
      alertas?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[];
      materias?: { id: string; nombre: string; promedio: number | null; topEstudiantes?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[]; alertas?: { id: string; nombre: string; numero: number; promedio: number; estado?: string }[] }[];
    };

    if (selectedTrimestre === 'anual') {
      baseStats = selectedStats;
    } else {
      baseStats = selectedStats.trimestres?.[selectedTrimestre] || selectedStats;
    }

    if (selectedMateriaId === 'all') {
      return baseStats;
    }

    // Per-subject view
    const materia = baseStats.materias?.find(m => m.id === selectedMateriaId);
    if (!materia) return baseStats;

    return {
      promedios: baseStats.promedios,
      topEstudiantes: materia.topEstudiantes || [],
      alertas: materia.alertas || [],
      materias: baseStats.materias
    };
  }, [selectedStats, selectedTrimestre, selectedMateriaId]);

  const popChartData = gradosVisibles.map(g => ({
    name: `${g.numero}° ${g.seccion}`,
    estudiantes: g._count?.estudiantes || 0
  })).filter(g => g.estudiantes > 0);

  const categoryChartData = effectiveStats && effectiveStats.promedios ? [
    { name: "Cotidianas", valor: effectiveStats.promedios.cotidiana, color: darkMode ? "oklch(0.56 0.15 155)" : "oklch(0.44 0.13 155)" },
    { name: "Integradoras", valor: effectiveStats.promedios.integradora, color: darkMode ? "oklch(0.65 0.12 85)" : "oklch(0.60 0.10 85)" },
    { name: "Exámenes", valor: effectiveStats.promedios.examen, color: darkMode ? "oklch(0.28 0.055 160)" : "oklch(0.28 0.055 160)" }
  ] : [];

  // ====== NUEVO: Indicadores por trimestre ======
  function calcularPromedioCiclo(trimestreKey?: 1 | 2 | 3): { nombre: string; prom: number | null; color: string }[] {
    return CICLOS.map(ciclo => {
      const gradosDelCiclo = grados.filter(g => ciclo.grados.includes(g.numero));
      const promsGrado = gradosDelCiclo
        .map(g => calcularPromedioGradoAjustado(stats.find(s => s.gradoId === g.id), selectedMaterias, trimestreKey))
        .filter((p): p is number => p !== null);

      const prom = promsGrado.length > 0
        ? Math.round((promsGrado.reduce((a, b) => a + b, 0) / promsGrado.length) * 100) / 100
        : null;

      return { nombre: ciclo.nombre, prom, color: ciclo.ringColor };
    });
  }

  function calcularPromedioInstitucional(trimestreKey?: 1 | 2 | 3): number | null {
    const proms = calcularPromedioCiclo(trimestreKey);
    const validos = proms.map(c => c.prom).filter((p): p is number => p !== null);
    if (validos.length === 0) return null;
    return Math.round((validos.reduce((a, b) => a + b, 0) / validos.length) * 100) / 100;
  }

  const promPorCicloT1 = calcularPromedioCiclo(1);
  const promPorCicloT2 = calcularPromedioCiclo(2);
  const promPorCicloT3 = calcularPromedioCiclo(3);

  const promInstitucionalT1 = calcularPromedioInstitucional(1);
  const promInstitucionalT2 = calcularPromedioInstitucional(2);
  const promInstitucionalT3 = calcularPromedioInstitucional(3);

  // Promedio anual institucional: promedio simple de T1, T2, T3 (equivalente al promedio global anual)
  const promsTrimestresValidos = [promInstitucionalT1, promInstitucionalT2, promInstitucionalT3].filter((p): p is number => p !== null);
  const promAnual = promsTrimestresValidos.length > 0
    ? Math.round((promsTrimestresValidos.reduce((a, b) => a + b, 0) / promsTrimestresValidos.length) * 100) / 100
    : null;

  // Promedio anual por ciclo (fuente única de verdad para la columna "Anual" de la tabla)
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

  const todasAsignaturasList = asignaturasAsignadas || [];

  const materiasInitRef = useRef(false);
  useEffect(() => {
    if (!materiasInitRef.current && todasAsignaturasList.length > 0) {
      materiasInitRef.current = true;
      setSelectedMaterias(new Set(todasAsignaturasList.map(m => m.id)));
    }
  }, [todasAsignaturasList]);

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
    <div className="pb-6 space-y-5">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between animate-fade-slide-up">
        <div>
          <h2 className="font-display text-xl sm:text-2xl tracking-tight text-foreground">
            Hola, {usuario.nombre}
          </h2>
          <p className="text-sm mt-0.5 text-muted-foreground/70">
            {usuario.rol === "admin"
              ? "Panel de administración del sistema."
              : "Bienvenido al ciclo escolar."}
          </p>
        </div>
        {esDirectiva && configuracion && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            Año Escolar {configuracion.añoEscolar}
          </div>
        )}
      </div>

      {/* ===== STATS ROW (compact horizontal) ===== */}
      {esDirectiva && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-slide-up" style={{ animationDelay: '0.05s' }}>
          {loading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[72px] rounded-md border border-border bg-card animate-pulse" />
              ))}
            </>
          ) : (
            <>
              <StatBadge icon={Users} label="Estudiantes" value={totalEstudiantesVisibles} note="Registrados" darkMode={darkMode} action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.totalEstudiantes} />} />
              <StatBadge icon={School} label="Grados" value={gradosVisibles.length} note="Secciones" darkMode={darkMode} action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.gradosActivos} />} />
              <StatBadge icon={BookOpen} label="Asignaturas" value={totalAsignaturasVisibles} note="Impartidas" darkMode={darkMode} action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.asignaturas} />} />
              <StatBadge icon={GraduationCap} label="Docentes" value={totalDocentes} note="Activos" darkMode={darkMode} action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.docentes} />} />
            </>
          )}
        </div>
      )}

      {/* ===== TWO-COLUMN LAYOUT: Main + Sidebar ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* ----- LEFT COLUMN: Performance ----- */}
        <div className="space-y-5 min-w-0">

          {/* Rendimiento Institucional por Trimestre */}
          {esDirectiva && (
            <div className="animate-fade-slide-up" style={{ animationDelay: '0.1s' }}>
              <Card className="shadow-sm overflow-hidden bg-card border-border module-card">
                <div className="h-px bg-primary/20 w-full" />
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-sm flex items-center gap-2 text-card-foreground">
                    <Target className="h-4 w-4 text-accent" />
                    Rendimiento Institucional
                  </CardTitle>
                  <MathInfoButton darkMode={darkMode} explanation={mathExplanations.rendimientoInstitucional} />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-4">
                    <div className="flex justify-center">
                      <PromedioCircular valor={promAnual} darkMode={darkMode} />
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">Promedio Anual</p>
                      {promPorCiclo.map(c => (
                        <div key={c.nombre} className="flex items-center justify-between rounded-sm border border-border p-2.5 bg-muted/20">
                          <span className="font-display text-xs text-muted-foreground/70">{c.nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-semibold font-mono tabular-nums ${c.prom != null && Math.round(c.prom) >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {c.prom != null ? c.prom.toFixed(1) : "—"}
                            </span>
                            <span className={`text-[10px] font-medium ${c.prom != null && Math.round(c.prom) >= 5 ? 'text-emerald-500' : c.prom != null ? 'text-red-400' : ''}`}>
                              {c.prom != null && Math.round(c.prom) >= 5 ? '✓' : c.prom != null ? '⚠' : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabla de evolución T1 T2 T3 */}
                  <div className="border border-border rounded-sm overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border">
                          <th className="text-left p-2 font-semibold text-muted-foreground/80">Ciclo</th>
                          <th className="text-center p-2 font-semibold text-muted-foreground/80">I Trimestre</th>
                          <th className="text-center p-2 font-semibold text-muted-foreground/80">II Trimestre</th>
                          <th className="text-center p-2 font-semibold text-muted-foreground/80">III Trimestre</th>
                          <th className="text-center p-2 font-semibold text-muted-foreground/80">Anual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CICLOS.map((ciclo, idx) => {
                          const t1 = promPorCicloT1[idx];
                          const t2 = promPorCicloT2[idx];
                          const t3 = promPorCicloT3[idx];
                          const anual = promPorCiclo[idx]?.prom ?? null;
                          return (
                            <tr key={ciclo.nombre} className="border-b border-border last:border-b-0">
                              <td className="p-2 font-medium text-foreground/80">{ciclo.nombre}</td>
                              {[t1, t2, t3].map((t, i) => (
                                <td key={i} className="text-center p-2">
                                  {t?.prom != null ? (
                                    <span className={`font-mono font-semibold ${Math.round(t.prom) >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {t.prom.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/40">—</span>
                                  )}
                                </td>
                              ))}
                              <td className="text-center p-2">
                                {anual != null ? (
                                  <span className={`font-mono font-bold ${Math.round(anual) >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {anual.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/20 border-t border-border font-semibold">
                          <td className="p-2 text-foreground/90">Institucional</td>
                          {[promInstitucionalT1, promInstitucionalT2, promInstitucionalT3].map((p, i) => (
                            <td key={i} className="text-center p-2">
                              {p != null ? (
                                <span className={`font-mono font-bold ${Math.round(p) >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {p.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          ))}
                          <td className="text-center p-2">
                            {promAnual != null ? (
                              <span className={`font-mono font-bold text-base ${Math.round(promAnual) >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {promAnual.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Promedio por Categoría */}
          {esDirectiva && evolutionChartData.length > 0 && (
            <div className="animate-fade-slide-up" style={{ animationDelay: '0.15s' }}>
              <GradeChart data={evolutionChartData} title="Promedio por Categoría" description="Promedio institucional por tipo de actividad" icon={TrendingUp} showArea showTarget darkMode={darkMode} height={240} action={<MathInfoButton darkMode={darkMode} explanation={mathExplanations.promedioPorCategoria} />} />
            </div>
          )}

          {/* Rendimiento Académico */}
          <Card className="shadow-sm overflow-hidden bg-card border-border module-card">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-3 bg-muted/20">
              <div>
                <CardTitle className="font-display text-sm flex items-center gap-2 text-card-foreground">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Rendimiento Académico
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {esDocente ? `Estadísticas de ${gradosVisibles[0]?.numero}° ${gradosVisibles[0]?.seccion}` : selectedMateriaId === 'all' ? 'Promedios por categoría' : 'Promedios por asignatura'}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {!esDocente && (
                  <Select value={selectedGradoId} onValueChange={(v) => { setSelectedGradoId(v); setSelectedMateriaId('all'); }}>
                    <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs bg-background border-border text-foreground">
                      <SelectValue placeholder="Seleccionar grado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Vista General</SelectItem>
                      {stats.map(s => (
                        <SelectItem key={s.gradoId} value={s.gradoId} className="text-xs">{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedGradoIdEfectivo !== "all" && (
                  <>
                    <Select value={String(selectedTrimestre)} onValueChange={(v) => setSelectedTrimestre(v === 'anual' ? 'anual' : parseInt(v) as 1 | 2 | 3)}>
                      <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs bg-background border-border text-foreground">
                        <SelectValue placeholder="Trimestre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anual" className="text-xs">Anual</SelectItem>
                        <SelectItem value="1" className="text-xs">I Trimestre</SelectItem>
                        <SelectItem value="2" className="text-xs">II Trimestre</SelectItem>
                        <SelectItem value="3" className="text-xs">III Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedMateriaId} onValueChange={setSelectedMateriaId}>
                      <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs bg-background border-border text-foreground">
                        <SelectValue placeholder="Asignatura" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">Todas las asignaturas</SelectItem>
                        {(effectiveStats?.materias || []).map(m => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">{m.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {selectedGradoIdEfectivo === "all" ? (
                <div className="h-[200px] sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={popChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1a3a2a" : "#E2E8F0"} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                      <Tooltip cursor={{ fill: darkMode ? '#1a3a2a' : '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', backgroundColor: darkMode ? '#0a1a10' : '#fff', color: darkMode ? '#e8e8e8' : '#111' }} />
                      <Bar dataKey="estudiantes" name="N° Estudiantes" fill="var(--color-primary, oklch(0.28 0.055 160))" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : effectiveStats ? (
                <div className="space-y-4">
                  <div className="h-[160px] sm:h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? "#1a3a2a" : "#E2E8F0"} />
                        <XAxis type="number" domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} width={70} />
                        <Tooltip cursor={{ fill: darkMode ? '#1a3a2a' : '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', backgroundColor: darkMode ? '#0a1a10' : '#fff', color: darkMode ? '#e8e8e8' : '#111' }} />
                        <Bar dataKey="valor" name="Promedio" radius={[0, 4, 4, 0]} barSize={20}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`p-3 rounded-md border ${darkMode ? 'bg-emerald-900/20 border-emerald-800/60' : 'bg-emerald-50/50 border-emerald-100'}`}>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        <Trophy className="h-3.5 w-3.5 text-amber-500" /> Cuadro de Honor
                        {selectedMateriaId !== 'all' && effectiveStats.materias && (
                          <span className="text-[10px] font-normal normal-case ml-1">
                            — {effectiveStats.materias.find(m => m.id === selectedMateriaId)?.nombre || ''}
                          </span>
                        )}
                        {selectedTrimestre !== 'anual' && (
                          <span className="text-[10px] font-normal normal-case ml-1">
                            ({selectedTrimestre}° Trimestre)
                          </span>
                        )}
                      </h4>
                      <div className="space-y-1.5">
                        {effectiveStats.topEstudiantes && effectiveStats.topEstudiantes.length > 0 ? effectiveStats.topEstudiantes.slice(0, 10).map((est, i) => (
                          <div key={est.id} className="flex items-center justify-between text-xs gap-2">
                            <span className="flex items-center gap-1.5 truncate">
                              <span className={`font-mono text-[10px] w-4 text-right shrink-0 ${i === 0 ? 'text-amber-500' : 'text-muted-foreground/50'}`}>{i + 1}.</span>
                              <span className="truncate text-foreground/80">{est.nombre}</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {est.estado === "CONDICIONADO" && (
                                <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-700">C</Badge>
                              )}
                              {est.estado === "REPROBADO" && (
                                <Badge variant="destructive" className="text-[9px] py-0 h-4 px-1">R</Badge>
                              )}
                              <Badge variant="outline" className={`shrink-0 py-0 h-5 text-xs font-mono ${darkMode ? 'bg-slate-800 text-emerald-400 border-emerald-700' : 'bg-white text-emerald-700 border-emerald-200'}`}>
                                {est.promedio.toFixed(1)}
                              </Badge>
                            </div>
                          </div>
                        )) : <p className="text-xs text-muted-foreground">Sin datos</p>}
                      </div>
                    </div>
                    <div className={`p-3 rounded-md border ${darkMode ? 'bg-red-900/20 border-red-800/60' : 'bg-red-50/50 border-red-100'}`}>
                      <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Alertas
                        {selectedMateriaId !== 'all' && effectiveStats.materias && (
                          <span className="text-[10px] font-normal normal-case ml-1">
                            — {effectiveStats.materias.find(m => m.id === selectedMateriaId)?.nombre || ''}
                          </span>
                        )}
                        {selectedTrimestre !== 'anual' && (
                          <span className="text-[10px] font-normal normal-case ml-1">
                            ({selectedTrimestre}° Trimestre)
                          </span>
                        )}
                      </h4>
                      <div className="space-y-1.5">
                        {effectiveStats.alertas && effectiveStats.alertas.length > 0 ? effectiveStats.alertas.slice(0, 10).map((est, i) => (
                          <div key={est.id} className="flex items-center justify-between text-xs gap-2">
                            <span className="truncate text-foreground/80">{est.nombre}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {est.estado === "CONDICIONADO" && (
                                <Badge variant="secondary" className="text-[9px] py-0 h-4 px-1 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-700">C</Badge>
                              )}
                              {est.estado === "REPROBADO" && (
                                <Badge variant="destructive" className="text-[9px] py-0 h-4 px-1">R</Badge>
                              )}
                              <Badge variant={est.estado === "REPROBADO" ? "destructive" : "secondary"} className={`shrink-0 font-bold py-0 h-5 text-xs font-mono ${est.estado === "CONDICIONADO" ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
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
                <div className="h-[200px] flex items-center justify-center">
                  <Skeleton className={`h-32 w-3/4 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Escala de Desempeño */}
          <div className="animate-fade-slide-up" style={{ animationDelay: '0.18s' }}>
            <EscalaDesempeno gradoId={esDocente ? gradoAsignado || undefined : undefined} esAdmin={esDirectiva} />
          </div>
        </div>

        {/* ----- RIGHT COLUMN: Sidebar ----- */}
        <div className="space-y-4">

          {/* Gestión Rápida */}
          <Card className="shadow-sm bg-card border-border module-card">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">Gestión Rápida</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 space-y-1.5">
              <QuickActionRow icon={ClipboardList} label="Pasar Notas" sub="Calificaciones" onClick={() => onNavigate?.('calificaciones')} />
              <QuickActionRow icon={CalendarDays} label="Asistencia" sub="Control diario" onClick={() => onNavigate?.('asistencia')} />
              {usuario.rol === "admin" && (
                <QuickActionRow icon={GraduationCap} label="Docentes" sub="Administración" onClick={() => onNavigate?.('admin')} />
              )}
            </CardContent>
          </Card>

          {/* Agent Monitor Alerts */}
          <AgentAlertsPanel darkMode={darkMode} onNavigate={onNavigate} />

          {/* Mis Asignaturas (docente only) */}
          {esDocente && asignaturasAsignadas && asignaturasAsignadas.length > 0 && (
            <Card className="shadow-sm bg-card border-border module-card">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">Mis Asignaturas</CardTitle>
              </CardHeader>
              <CardContent className="p-2.5 max-h-[200px] overflow-y-auto space-y-1" tabIndex={0} role="region" aria-label="Mis asignaturas">
                {asignaturasAsignadas.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 text-xs bg-muted/20 border border-border rounded-sm">
                    <span className="font-medium truncate mr-2 text-foreground">{m.nombre}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/80 shrink-0">{m.grado?.numero}°{m.grado?.seccion}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Mi Avance (docente only) */}
          {esDocente && miAvance && (
            <Card className="shadow-sm bg-card border-border module-card">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">
                  <CheckCircle2 className="h-3 w-3 inline mr-1 text-accent" />
                  Mi Avance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div className="text-center">
                  <span className={`text-2xl font-bold font-mono tabular-nums ${
                    miAvance.porcentajeGlobal >= 100
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : miAvance.porcentajeGlobal >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {miAvance.porcentajeGlobal}%
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Completado</p>
                  <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mt-1.5">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      miAvance.porcentajeGlobal >= 100
                        ? 'bg-emerald-500'
                        : miAvance.porcentajeGlobal >= 50
                        ? 'bg-amber-400'
                        : 'bg-red-500'
                    }`} style={{ width: `${miAvance.porcentajeGlobal}%` }} />
                  </div>
                </div>
                <div className="flex justify-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> {miAvance.globalCompleto}
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" /> {miAvance.globalParcial}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <MinusCircle className="h-3 w-3" /> {miAvance.globalVacio}
                  </span>
                </div>
                {miAvance.materias.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-border">
                    {miAvance.materias.map((m, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="truncate text-foreground/70 flex-1">{m.materiaNombre}</span>
                        <span className="text-muted-foreground/60 shrink-0">{m.gradoNumero}°{m.gradoSeccion}</span>
                        <span className={`font-mono font-bold shrink-0 ${
                          m.porcentaje >= 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : m.porcentaje >= 50
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {m.porcentaje}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Información */}
          <Card className="shadow-sm bg-card border-border">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">Información</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="p-2.5 text-xs bg-muted/20 border border-border rounded-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground/80">Rol</span>
                  <span className="font-semibold text-foreground capitalize">{usuario.rol === "admin" ? "Administrador" : usuario.rol === "docente-orientador" ? "Docente Orientador" : "Docente"}</span>
                </div>
                {configuracion && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/80">Año Escolar</span>
                    <span className="font-semibold text-foreground">{configuracion.añoEscolar}</span>
                  </div>
                )}
                {configuracion?.umbralAprobado && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/80">Umbral Aprobado</span>
                    <span className="font-semibold text-foreground">{configuracion.umbralAprobado}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats rápidos para docentes */}
          {esDocente && (
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2.5 rounded-sm border text-center ${darkMode ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <Users className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">{totalEstudiantesVisibles}</p>
                <p className="text-[10px] text-muted-foreground/80">Estudiantes</p>
              </div>
              <div className={`p-2.5 rounded-sm border text-center ${darkMode ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <BookOpen className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">{totalAsignaturasVisibles}</p>
                <p className="text-[10px] text-muted-foreground/80">Asignaturas</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== ASIGNATURAS POR CICLO (full width) ===== */}
      {esDirectiva && todasAsignaturasList.length > 0 && (
        <div className="animate-fade-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display text-base text-foreground">
              <BookOpen className="h-4 w-4 inline mr-2 text-accent" />
              Asignaturas por Ciclo
            </h3>
            <MathInfoButton darkMode={darkMode} explanation={mathExplanations.asignaturasPorCiclo} />
          </div>
          <CiclosSection asignaturas={todasAsignaturasList} stats={stats} grados={grados} darkMode={darkMode} selectedMaterias={selectedMaterias} setSelectedMaterias={setSelectedMaterias} />
        </div>
      )}

    </div>
  );
});

export default Dashboard;
