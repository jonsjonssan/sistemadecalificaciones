"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, TrendingDown, TrendingUp, Users, CheckCircle2, Clock,
  CalendarX, BookOpen, Target, Lightbulb, ChevronDown, ChevronUp,
  ArrowDownCircle, ArrowUpCircle, MinusCircle, BarChart3
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PredictiveAlertsProps {
  gradoId?: string;
  trimestre?: string;
  darkMode: boolean;
  umbralAprobado?: number;
}

export default function PredictiveAlerts({ gradoId, trimestre, darkMode, umbralAprobado }: PredictiveAlertsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("tendencias");

  useEffect(() => {
    if (!gradoId) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/alerts/predictive?gradoId=${gradoId}`, {
      credentials: "include"
    })
      .then(res => {
        if (!cancelled && res.ok) return res.json();
        return null;
      })
      .then(result => {
        if (!cancelled && result) setData(result);
      })
      .catch(error => {
        console.error("Error fetching predictive alerts:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [gradoId]);

  if (loading) {
    return (
      <Card className={`shadow-sm ${darkMode ? 'bg-[#0E1726] border-slate-700' : ''}`}>
        <CardHeader>
          <Skeleton className={`h-5 w-48 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={`h-20 w-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={`shadow-sm ${darkMode ? 'bg-[#0E1726] border-slate-700' : ''}`}>
        <CardContent className="p-6 text-center">
          <BarChart3 className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Selecciona un grado para ver el análisis predictivo
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-4">
      {/* Resumen General */}
      <Card className={`shadow-sm ${darkMode ? 'bg-[#0E1726] border-slate-700' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-base flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Análisis Predictivo Avanzado
          </CardTitle>
          <CardDescription className={`text-sm ${darkMode ? 'text-slate-400' : ''}`}>
            Diagnóstico inteligente del rendimiento estudiantil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total Estudiantes"
              value={data.resumen?.totalEstudiantes || 0}
              icon={Users}
              color="text-blue-600"
              darkMode={darkMode}
            />
            <StatCard
              label="Promedio General"
              value={data.resumen?.promedioGeneral?.toFixed(1) || "-"}
              icon={BarChart3}
              color="text-emerald-600"
              darkMode={darkMode}
            />
            <StatCard
              label="En Riesgo"
              value={data.resumen?.estudiantesEnRiesgo || 0}
              icon={AlertTriangle}
              color="text-red-600"
              darkMode={darkMode}
            />
            <StatCard
              label="Estado"
              value={Math.round(data.resumen?.promedioGeneral || 0) >= 5 ? "OK" : "Atención"}
              icon={CheckCircle2}
              color={Math.round(data.resumen?.promedioGeneral || 0) >= 5 ? "text-green-600" : "text-amber-600"}
              darkMode={darkMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Secciones Expandibles */}
      <div className="space-y-2">
        {/* 1. Tendencia de Rendimiento */}
        <SectionCard
          title="Tendencia de Rendimiento"
          subtitle="Evolución del rendimiento por estudiante entre trimestres"
          icon={TrendingUp}
          expanded={expandedSection === "tendencias"}
          onToggle={() => toggleSection("tendencias")}
          count={data.tendencias?.length || 0}
          darkMode={darkMode}
        >
          {data.tendencias && data.tendencias.length > 0 ? (
            <div className="space-y-2">
              {data.tendencias.slice(0, 10).map((t: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.tendencia === "mejorando" ? (
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      ) : t.tendencia === "empeorando" ? (
                        <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <MinusCircle className="h-4 w-4 text-blue-600" />
                      )}
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{t.nombre}</span>
                      <Badge variant="outline" className={`text-[10px] ${darkMode ? 'border-slate-600 text-slate-400' : ''}`}>
                        {t.grado}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t.primerPromedio?.toFixed(1)} → {t.ultimoPromedio?.toFixed(1)}
                      </span>
                      <span className={`text-xs font-semibold ${t.cambio > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.cambio > 0 ? '+' : ''}{t.cambio?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay datos suficientes para calcular tendencias" darkMode={darkMode} />
          )}
        </SectionCard>

        {/* 2. Correlación Ausencias-Notas */}
        <SectionCard
          title="Correlación Ausencias-Notas"
          subtitle="Relación entre inasistencias y rendimiento académico"
          icon={CalendarX}
          expanded={expandedSection === "ausencias"}
          onToggle={() => toggleSection("ausencias")}
          count={data.correlaciones?.length || 0}
          darkMode={darkMode}
        >
          {data.correlaciones && data.correlaciones.length > 0 ? (
            <div className="space-y-2">
              {data.correlaciones.slice(0, 10).map((c: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarX className="h-4 w-4 text-amber-600" />
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{c.nombre}</span>
                      <Badge variant={c.impacto === "alto" ? "destructive" : "outline"} className="text-[10px]">
                        {c.totalAusencias} ausencias
                      </Badge>
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Promedio: {c.promedio?.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay ausencias registradas" darkMode={darkMode} />
          )}
        </SectionCard>

        {/* 3. Asignaturas Críticas */}
        <SectionCard
          title="Asignaturas Críticas"
          subtitle="Materias con rendimiento bajo 7.0 que requieren atención"
          icon={BookOpen}
          expanded={expandedSection === "asignaturas"}
          onToggle={() => toggleSection("asignaturas")}
          count={data.asignaturasCriticas?.length || 0}
          darkMode={darkMode}
        >
          {data.asignaturasCriticas && data.asignaturasCriticas.length > 0 ? (
            <div className="space-y-2">
              {data.asignaturasCriticas.slice(0, 10).map((a: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${a.nivel === "critico" ? (darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200') :
                  a.nivel === "preocupante" ? (darkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200') :
                    (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200')
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className={`h-4 w-4 ${a.nivel === "critico" ? 'text-red-600' : a.nivel === "preocupante" ? 'text-amber-600' : 'text-blue-600'}`} />
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{a.materiaNombre}</span>
                      <Badge variant="outline" className={`text-[10px] ${darkMode ? 'border-slate-600 text-slate-400' : ''}`}>
                        {a.grado}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {a.estudiantesEnRiesgo}/{a.totalEstudiantes} en riesgo
                      </span>
                      <span className={`text-sm font-bold ${Math.round(a.promedioMateria) < 5 ? 'text-red-600' : 'text-amber-600'}`}>
                        {a.promedioMateria?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Todas las asignaturas tienen promedio aceptable" darkMode={darkMode} />
          )}
        </SectionCard>

        {/* 4. Predicción de Reprobación */}
        <SectionCard
          title="Predicción de Reprobación"
          subtitle="Probabilidad estimada de reprobación por estudiante"
          icon={Target}
          expanded={expandedSection === "prediccion"}
          onToggle={() => toggleSection("prediccion")}
          count={data.predicciones?.filter((p: any) => p.probabilidadReprobacion > 30).length || 0}
          darkMode={darkMode}
        >
          {data.predicciones && data.predicciones.length > 0 ? (
            <div className="space-y-2">
              {data.predicciones.filter((p: any) => p.probabilidadReprobacion > 30).slice(0, 10).map((p: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{p.nombre}</span>
                    <Badge variant={p.nivel === "muy_alto" || p.nivel === "alto" ? "destructive" : p.nivel === "medio" ? "outline" : "secondary"} className="text-[10px]">
                      {p.probabilidadReprobacion}% riesgo
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Prom: {p.promedioGeneral?.toFixed(1)}</span>
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>•</span>
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{p.materiasCriticas} materias críticas</span>
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>•</span>
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{p.materiasEnRiesgo} en riesgo</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay estudiantes con probabilidad significativa de reprobación" darkMode={darkMode} />
          )}
        </SectionCard>

        {/* 5. Comparación Histórica */}
        <SectionCard
          title="Comparación vs Umbral"
          subtitle={`Distancia del promedio general respecto al umbral de aprobación (${(umbralAprobado ?? 5.0).toFixed(2)})`}
          icon={BarChart3}
          expanded={expandedSection === "comparacion"}
          onToggle={() => toggleSection("comparacion")}
          count={data.comparacionHistorica ? 1 : 0}
          darkMode={darkMode}
        >
          {data.comparacionHistorica ? (
            <div className={`p-4 rounded-lg border ${data.comparacionHistorica.estado === "sobre_umbral"
              ? (darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200')
              : (darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200')
              }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Promedio Actual</p>
                  <p className={`text-2xl font-bold ${data.comparacionHistorica.estado === "sobre_umbral" ? 'text-green-600' : 'text-red-600'}`}>
                    {data.comparacionHistorica.promedioActual?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Umbral</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{(umbralAprobado ?? 5.0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Diferencia</p>
                  <p className={`text-2xl font-bold ${data.comparacionHistorica.distancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.comparacionHistorica.distancia >= 0 ? '+' : ''}{data.comparacionHistorica.distancia?.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className={`h-full rounded-full transition-all ${data.comparacionHistorica.estado === "sobre_umbral" ? 'bg-green-600' : 'bg-red-600'}`}
                  style={{ width: `${Math.min(100, Math.max(0, ((data.comparacionHistorica.promedioActual || 0) / 10) * 100))}%` }}
                />
              </div>
            </div>
          ) : (
            <EmptyState message="No hay datos disponibles" darkMode={darkMode} />
          )}
        </SectionCard>

        {/* 6. Recomendaciones Accionables */}
        <SectionCard
          title="Recomendaciones Accionables"
          subtitle="Sugerencias automáticas basadas en el análisis de datos"
          icon={Lightbulb}
          expanded={expandedSection === "recomendaciones"}
          onToggle={() => toggleSection("recomendaciones")}
          count={data.recomendaciones?.length || 0}
          darkMode={darkMode}
        >
          {data.recomendaciones && data.recomendaciones.length > 0 ? (
            <div className="space-y-3">
              {data.recomendaciones.map((r: any, i: number) => (
                <div key={i} className={`p-4 rounded-lg border ${r.tipo === "urgente" ? (darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200') :
                  r.tipo === "academica" ? (darkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200') :
                    r.tipo === "asistencia" ? (darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200') :
                      (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200')
                  }`}>
                  <div className="flex items-start gap-3">
                    <Lightbulb className={`h-5 w-5 mt-0.5 shrink-0 ${r.tipo === "urgente" ? 'text-red-600' :
                      r.tipo === "academica" ? 'text-amber-600' :
                        r.tipo === "asistencia" ? 'text-blue-600' :
                          'text-green-600'
                      }`} />
                    <div className="flex-1">
                      <h4 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{r.titulo}</h4>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{r.descripcion}</p>
                      {r.estudiantes && r.estudiantes.length > 0 && (
                        <p className={`text-[10px] mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          Estudiantes: {r.estudiantes.join(", ")}
                        </p>
                      )}
                      {r.materias && r.materias.length > 0 && (
                        <p className={`text-[10px] mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          Materias: {r.materias.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay recomendaciones pendientes" darkMode={darkMode} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, darkMode }: any) {
  return (
    <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className={`text-[10px] uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, expanded, onToggle, count, darkMode, children }: any) {
  return (
    <Card className={`shadow-sm ${darkMode ? 'bg-[#0E1726] border-slate-700' : ''}`}>
      <CardHeader
        className={`pb-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${darkMode ? 'border-slate-700' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <div>
              <CardTitle className={`text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>{title}</CardTitle>
              <CardDescription className={`text-xs ${darkMode ? 'text-slate-400' : ''}`}>{subtitle}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <Badge variant="outline" className={`text-[10px] ${darkMode ? 'border-slate-600 text-slate-400' : ''}`}>
                {count}
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            ) : (
              <ChevronDown className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function EmptyState({ message, darkMode }: any) {
  return (
    <div className="text-center py-4">
      <CheckCircle2 className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{message}</p>
    </div>
  );
}
