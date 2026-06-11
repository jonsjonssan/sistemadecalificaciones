"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";

interface MateriaEscala {
  materiaId: string;
  materiaNombre: string;
  reprobado: number;
  condicionado: number;
  aprobado: number;
  total: number;
  sinNotas: number;
}

interface GradoEscala {
  gradoId: string;
  gradoNombre: string;
  grado: { id: string; numero: number; seccion: string };
  escala: {
    reprobado: number;
    condicionado: number;
    aprobado: number;
    total: number;
    sinNotas: number;
  };
  materias: MateriaEscala[];
}

interface EscalaDesempenoProps {
  gradoId?: string;
  esAdmin?: boolean;
}

const COLORS = {
  reprobado: "oklch(0.44 0.05 28)",
  condicionado: "oklch(0.52 0.04 85)",
  aprobado: "oklch(0.38 0.09 155)",
};

export function EscalaDesempeno({ gradoId, esAdmin = false }: EscalaDesempenoProps) {
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === "dark";
  const [data, setData] = useState<GradoEscala[]>([]);
  const [loading, setLoading] = useState(true);
  const [trimestre, setTrimestre] = useState<string>("all");
  const [selectedGradoId, setSelectedGradoId] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchData = async () => {
      try {
        const url = gradoId
          ? `/api/stats/escala-desempeno?trimestre=${trimestre}&gradoId=${gradoId}`
          : `/api/stats/escala-desempeno?trimestre=${trimestre}`;
        const res = await fetch(url, { credentials: "include" });
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData(Array.isArray(json) ? json : []);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching escala-desempeno:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [trimestre, gradoId]);

  const gradosVisibles = useMemo(() => {
    if (!data.length) return [];
    if (gradoId) return data.filter((g) => g.gradoId === gradoId);
    if (selectedGradoId === "all") return data;
    return data.filter((g) => g.gradoId === selectedGradoId);
  }, [data, gradoId, selectedGradoId]);

  const chartData = useMemo(() => {
    return gradosVisibles.map((g) => ({
      name: g.gradoNombre,
      Reprobado: g.escala.reprobado,
      Condicionado: g.escala.condicionado,
      Aprobado: g.escala.aprobado,
      total: g.escala.total,
    }));
  }, [gradosVisibles]);

  const materiasData = useMemo(() => {
    if (gradosVisibles.length !== 1) return [];
    return gradosVisibles[0].materias.map((m) => ({
      name: m.materiaNombre,
      Reprobado: m.reprobado,
      Condicionado: m.condicionado,
      Aprobado: m.aprobado,
      total: m.total,
    }));
  }, [gradosVisibles]);

  return (
    <Card className="shadow-sm overflow-hidden bg-card border-border module-card">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-3 bg-muted/20">
        <div>
          <CardTitle className="font-display text-sm flex items-center gap-2 text-card-foreground">
            <BarChart3 className="h-4 w-4 text-accent" />
            Escala de Desempeño
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Distribución de estudiantes por escala de rendimiento
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={trimestre} onValueChange={setTrimestre}>
            <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs bg-background border-border text-foreground">
              <SelectValue placeholder="Trimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Anual</SelectItem>
              <SelectItem value="1" className="text-xs">I Trimestre</SelectItem>
              <SelectItem value="2" className="text-xs">II Trimestre</SelectItem>
              <SelectItem value="3" className="text-xs">III Trimestre</SelectItem>
            </SelectContent>
          </Select>
          {!gradoId && data.length > 1 && (
            <Select value={selectedGradoId} onValueChange={setSelectedGradoId}>
              <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs bg-background border-border text-foreground">
                <SelectValue placeholder="Grado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos los grados</SelectItem>
                {data.map((g) => (
                  <SelectItem key={g.gradoId} value={g.gradoId} className="text-xs">
                    {g.gradoNombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-4">
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Skeleton className={`h-32 w-3/4 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
          </div>
        ) : gradosVisibles.length === 0 ? (
          <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
          <>
            {/* Chart by Grade */}
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Por Grado
              </h4>
              <div className="h-[180px] sm:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "oklch(0.24 0.015 155)" : "oklch(0.91 0.008 155)"} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: darkMode ? "oklch(0.58 0.015 155)" : "oklch(0.48 0.015 155)" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: darkMode ? "oklch(0.58 0.015 155)" : "oklch(0.48 0.015 155)" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: darkMode ? "oklch(0.20 0.015 155)" : "oklch(0.955 0.006 155)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "11px",
                        backgroundColor: darkMode ? "oklch(0.18 0.015 155)" : "oklch(0.995 0.002 155)",
                        color: darkMode ? "oklch(0.90 0.008 155)" : "oklch(0.18 0.025 155)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px" }}
                      iconType="circle"
                    />
                    <Bar dataKey="Reprobado" stackId="a" fill={COLORS.reprobado} radius={[0, 0, 0, 0]} barSize={28} />
                    <Bar dataKey="Condicionado" stackId="a" fill={COLORS.condicionado} radius={[0, 0, 0, 0]} barSize={28} />
                    <Bar dataKey="Aprobado" stackId="a" fill={COLORS.aprobado} radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart by Subject (when single grade selected) */}
            {materiasData.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Por Asignatura
                </h4>
                <div className="h-[200px] sm:h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={materiasData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "oklch(0.24 0.015 155)" : "oklch(0.91 0.008 155)"} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: darkMode ? "oklch(0.58 0.015 155)" : "oklch(0.48 0.015 155)" }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: darkMode ? "oklch(0.58 0.015 155)" : "oklch(0.48 0.015 155)" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: darkMode ? "oklch(0.20 0.015 155)" : "oklch(0.955 0.006 155)" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          fontSize: "11px",
                          backgroundColor: darkMode ? "oklch(0.18 0.015 155)" : "oklch(0.995 0.002 155)",
                          color: darkMode ? "oklch(0.90 0.008 155)" : "oklch(0.18 0.025 155)",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "11px" }}
                        iconType="circle"
                      />
                      <Bar dataKey="Reprobado" stackId="a" fill={COLORS.reprobado} radius={[0, 0, 0, 0]} barSize={20} />
                      <Bar dataKey="Condicionado" stackId="a" fill={COLORS.condicionado} radius={[0, 0, 0, 0]} barSize={20} />
                      <Bar dataKey="Aprobado" stackId="a" fill={COLORS.aprobado} radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Summary Table */}
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left p-2 font-semibold text-muted-foreground/80">Grado / Asignatura</th>
                    <th className="text-center p-2 font-semibold text-status-error">Reprobado</th>
                    <th className="text-center p-2 font-semibold text-status-warning">Condicionado</th>
                    <th className="text-center p-2 font-semibold text-status-success">Aprobado</th>
                    <th className="text-center p-2 font-semibold text-muted-foreground/80">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gradosVisibles.map((g) => (
                    <>
                      <tr key={g.gradoId} className="border-b border-border bg-muted/10 font-semibold">
                        <td className="p-2 text-foreground/90">{g.gradoNombre}</td>
                        <td className="text-center p-2 text-status-error">{g.escala.reprobado}</td>
                        <td className="text-center p-2 text-status-warning">{g.escala.condicionado}</td>
                        <td className="text-center p-2 text-status-success">{g.escala.aprobado}</td>
                        <td className="text-center p-2 text-muted-foreground/70">{g.escala.total}</td>
                      </tr>
                      {gradosVisibles.length === 1 &&
                        g.materias.map((m) => (
                          <tr key={m.materiaId} className="border-b border-border last:border-b-0">
                            <td className="p-2 pl-6 text-muted-foreground/80">{m.materiaNombre}</td>
                            <td className="text-center p-2 text-status-error/70">{m.reprobado}</td>
                            <td className="text-center p-2 text-status-warning/70">{m.condicionado}</td>
                            <td className="text-center p-2 text-status-success/70">{m.aprobado}</td>
                            <td className="text-center p-2 text-muted-foreground/50">{m.total}</td>
                          </tr>
                        ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend / Info */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/70">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.reprobado }} />
                Reprobado (0–4.49)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.condicionado }} />
                Condicionado (4.50–6.49)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.aprobado }} />
                Aprobado (≥6.50)
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
