"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, TrendingUp, Users, Eye, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertData {
  id: string;
  estudianteId: string;
  nombre: string;
  tipo: "bajo_rendimiento" | "riesgo_absentismo" | "mejora_reciente" | "caida_reciente";
  gravedad: "alta" | "media" | "baja";
  mensaje: string;
  promedio?: number;
  ausencias?: number;
  tendencia?: "subiendo" | "bajando" | "estable";
}

interface PredictiveAlertsProps {
  gradoId?: string;
  trimestre?: string;
  darkMode: boolean;
}

export default function PredictiveAlerts({ gradoId, trimestre, darkMode }: PredictiveAlertsProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (gradoId && trimestre) {
      fetchAlerts();
    }
  }, [gradoId, trimestre]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ss_dismissed_alerts");
      if (stored) setDismissed(JSON.parse(stored));
    }
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calificaciones?gradoId=${gradoId}&trimestre=${trimestre}`, {
        credentials: "include"
      });
      if (res.ok) {
        const calificaciones = await res.json();
        const generatedAlerts = generateAlerts(calificaciones);
        setAlerts(generatedAlerts);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = (calificaciones: any[]): AlertData[] => {
    const alerts: AlertData[] = [];

    calificaciones.forEach((calif: any) => {
      const estudianteNombre = calif.estudiante?.nombre || "Estudiante";
      const promedio = calif.promedioFinal;

      if (promedio !== null && promedio !== undefined) {
        if (promedio < 5.0) {
          alerts.push({
            id: `alert-${calif.estudianteId}-bajo`,
            estudianteId: calif.estudianteId,
            nombre: estudianteNombre,
            tipo: "bajo_rendimiento",
            gravedad: "alta",
            mensaje: `Rendimiento crítico: ${promedio.toFixed(1)}/10. Necesita atención inmediata.`,
            promedio
          });
        } else if (promedio < 6.0) {
          alerts.push({
            id: `alert-${calif.estudianteId}-riesgo`,
            estudianteId: calif.estudianteId,
            nombre: estudianteNombre,
            tipo: "bajo_rendimiento",
            gravedad: "media",
            mensaje: `En riesgo de reprobación: ${promedio.toFixed(1)}/10. Considerar apoyo adicional.`,
            promedio
          });
        } else if (promedio >= 8.5) {
          alerts.push({
            id: `alert-${calif.estudianteId}-excelente`,
            estudianteId: calif.estudianteId,
            nombre: estudianteNombre,
            tipo: "mejora_reciente",
            gravedad: "baja",
            mensaje: `Excelente rendimiento: ${promedio.toFixed(1)}/10. ¡Felicitaciones!`,
            promedio
          });
        }
      }

      if (calif.recuperacion !== null && calif.recuperacion !== undefined) {
        const mejora = calif.recuperacion - (promedio || 0);
        if (mejora > 1.5) {
          alerts.push({
            id: `alert-${calif.estudianteId}-mejora`,
            estudianteId: calif.estudianteId,
            nombre: estudianteNombre,
            tipo: "mejora_reciente",
            gravedad: "baja",
            mensaje: `Mejora notable en recuperación: +${mejora.toFixed(1)} puntos.`,
            tendencia: "subiendo"
          });
        }
      }
    });

    return alerts.sort((a, b) => {
      const gravedadOrder = { alta: 0, media: 1, baja: 2 };
      return gravedadOrder[a.gravedad] - gravedadOrder[b.gravedad];
    });
  };

  const dismissAlert = (alertId: string) => {
    const newDismissed = [...dismissed, alertId];
    setDismissed(newDismissed);
    if (typeof window !== "undefined") {
      localStorage.setItem("ss_dismissed_alerts", JSON.stringify(newDismissed));
    }
  };

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));
  const highPriority = visibleAlerts.filter(a => a.gravedad === "alta");
  const mediumPriority = visibleAlerts.filter(a => a.gravedad === "media");
  const lowPriority = visibleAlerts.filter(a => a.gravedad === "baja");

  if (loading) {
    return (
      <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
        <CardHeader className="pb-3">
          <Skeleton className={`h-5 w-48 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
          <Skeleton className={`h-4 w-64 mt-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={`h-16 w-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-base flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Alertas Predictivas
          </CardTitle>
          <CardDescription className={`text-sm ${darkMode ? 'text-slate-400' : ''}`}>
            No hay alertas activas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Todos los estudiantes muestran un rendimiento adecuado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-sm ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-base flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Alertas Predictivas
          {highPriority.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {highPriority.length} urgente{highPriority.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className={`text-sm ${darkMode ? 'text-slate-400' : ''}`}>
          Identificación temprana de estudiantes en riesgo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {highPriority.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">
              Atención Inmediata
            </h4>
            <div className="space-y-2">
              {highPriority.map(alert => (
                <AlertCard key={alert.id} alert={alert} darkMode={darkMode} onDismiss={() => dismissAlert(alert.id)} />
              ))}
            </div>
          </div>
        )}

        {mediumPriority.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wide">
              Seguimiento Recomendado
            </h4>
            <div className="space-y-2">
              {mediumPriority.map(alert => (
                <AlertCard key={alert.id} alert={alert} darkMode={darkMode} onDismiss={() => dismissAlert(alert.id)} />
              ))}
            </div>
          </div>
        )}

        {lowPriority.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
              Reconocimientos
            </h4>
            <div className="space-y-2">
              {lowPriority.map(alert => (
                <AlertCard key={alert.id} alert={alert} darkMode={darkMode} onDismiss={() => dismissAlert(alert.id)} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertCard({ alert, darkMode, onDismiss }: { alert: AlertData; darkMode: boolean; onDismiss: () => void }) {
  const getIcon = () => {
    switch (alert.tipo) {
      case "bajo_rendimiento":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "mejora_reciente":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBorderColor = () => {
    switch (alert.gravedad) {
      case "alta":
        return darkMode ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50/50';
      case "media":
        return darkMode ? 'border-amber-800 bg-amber-900/20' : 'border-amber-200 bg-amber-50/50';
      case "baja":
        return darkMode ? 'border-green-800 bg-green-900/20' : 'border-green-200 bg-green-50/50';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getBorderColor()} flex items-start gap-3`}>
      <div className="p-1.5 rounded-md shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{alert.nombre}</p>
        <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {alert.mensaje}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="h-6 w-6 p-0 shrink-0"
        title="Descartar alerta"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
