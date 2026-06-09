"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, CheckCircle, TrendingDown, Clock, XCircle } from "lucide-react";

interface AlertaEstudiante {
  id: string;
  tipo: string;
  puntajeRiesgo: number;
  estudiante: { id: string; nombre: string; numero: number };
  grado: { id: string; numero: number; seccion: string };
  materia: { id: string; nombre: string } | null;
  factores: string[];
  recomendacion: string;
  leido: boolean;
  createdAt: string;
}

interface AgentAlertsPanelProps {
  darkMode: boolean;
  onNavigate?: (tab: string) => void;
}

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  riesgo_alto: { label: "Riesgo Alto", color: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-400 dark:border-red-700", icon: XCircle },
  riesgo_medio: { label: "Riesgo Medio", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-700", icon: AlertTriangle },
  bajo_rendimiento: { label: "Bajo Rendimiento", color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-700", icon: TrendingDown },
  asistencia_critica: { label: "Asistencia Crítica", color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-700", icon: Clock },
};

export function AgentAlertsPanel({ darkMode, onNavigate }: AgentAlertsPanelProps) {
  const [alertas, setAlertas] = useState<AlertaEstudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarAlertas = async () => {
    try {
      const res = await fetch("/api/agent/monitor?leidas=no&limit=20", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAlertas(data.alertas || []);
      }
    } catch (error) {
      console.error("Error cargando alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, []);

  const ejecutarAnalisis = async () => {
    setEjecutando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/agent/monitor", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ año: new Date().getFullYear(), guardarAlertas: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setMensaje(`✅ Análisis completado: ${data.resumen.riesgoAlto} riesgo alto, ${data.resumen.riesgoMedio} riesgo medio`);
        await cargarAlertas();
      } else {
        setMensaje("❌ Error al ejecutar el análisis");
      }
    } catch (error) {
      setMensaje("❌ Error de conexión");
    } finally {
      setEjecutando(false);
      setTimeout(() => setMensaje(null), 5000);
    }
  };

  const marcarLeida = async (alertaId: string) => {
    try {
      await fetch(`/api/agent/monitor/${alertaId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leido: true }),
      });
      setAlertas((prev) => prev.filter((a) => a.id !== alertaId));
    } catch (error) {
      console.error("Error marcando alerta:", error);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm bg-card border-border">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm bg-card border-border">
      <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground/90 flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          Alertas del Agente Monitor
          {alertas.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
              {alertas.length}
            </Badge>
          )}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={ejecutarAnalisis}
          disabled={ejecutando}
          className="h-7 text-xs"
        >
          {ejecutando ? "Analizando..." : "Ejecutar Análisis"}
        </Button>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {mensaje && (
          <div className="p-2 text-xs bg-muted/50 rounded-sm border border-border">
            {mensaje}
          </div>
        )}

        {alertas.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p>No hay alertas pendientes</p>
            <p className="text-[10px] mt-1">El último análisis no detectó estudiantes en riesgo</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {alertas.map((alerta) => {
              const config = TIPO_CONFIG[alerta.tipo] || TIPO_CONFIG.bajo_rendimiento;
              const Icon = config.icon;
              return (
                <div
                  key={alerta.id}
                  className={`p-2.5 rounded-sm border ${darkMode ? "bg-muted/20 border-border" : "bg-muted/30 border-border"} hover:shadow-sm transition-all`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-sm shrink-0 ${darkMode ? "bg-muted" : "bg-white"}`}>
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {alerta.estudiante.nombre}
                          </span>
                          <Badge variant="outline" className={`text-[9px] h-4 px-1 ${config.color}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {alerta.grado.numero}° "{alerta.grado.seccion}"
                          {alerta.materia && ` · ${alerta.materia.nombre}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                alerta.puntajeRiesgo >= 0.6
                                  ? "bg-red-500"
                                  : alerta.puntajeRiesgo >= 0.4
                                  ? "bg-amber-500"
                                  : "bg-orange-400"
                              }`}
                              style={{ width: `${alerta.puntajeRiesgo * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {(alerta.puntajeRiesgo * 100).toFixed(0)}%
                          </span>
                        </div>
                        {alerta.factores.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {alerta.factores.slice(0, 2).map((factor, i) => (
                              <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 rounded-sm bg-muted/50 text-muted-foreground"
                              >
                                {factor}
                              </span>
                            ))}
                            {alerta.factores.length > 2 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{alerta.factores.length - 2} más
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => marcarLeida(alerta.id)}
                      className="shrink-0 p-1 rounded-sm hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Marcar como leída"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {alertas.length > 0 && (
          <div className="pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.("reportes")}
              className="w-full text-xs h-7"
            >
              Ver todas las alertas en Reportes →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
