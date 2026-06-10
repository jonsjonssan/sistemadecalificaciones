"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar, Save, RotateCcw } from "lucide-react";

interface TrimestreDatesConfigProps {
  darkMode: boolean;
  fechas: {
    fechaInicioT1: string | null;
    fechaFinT1: string | null;
    fechaInicioT2: string | null;
    fechaFinT2: string | null;
    fechaInicioT3: string | null;
    fechaFinT3: string | null;
  };
  onFechasChange: (fechas: {
    fechaInicioT1: string | null;
    fechaFinT1: string | null;
    fechaInicioT2: string | null;
    fechaFinT2: string | null;
    fechaInicioT3: string | null;
    fechaFinT3: string | null;
  }) => void;
  onSave: () => void;
  onReset: () => void;
  loading: boolean;
}

export function TrimestreDatesConfig({
  darkMode,
  fechas,
  onFechasChange,
  onSave,
  onReset,
  loading,
}: TrimestreDatesConfigProps) {
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: keyof typeof fechas, value: string) => {
    onFechasChange({
      ...fechas,
      [field]: value || null,
    });
    setHasChanges(true);
  };

  const handleReset = () => {
    onReset();
    setHasChanges(false);
  };

  const formatFecha = (fecha: string | null): string => {
    if (!fecha) return "No configurada";
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const validateDates = (): boolean => {
    const t1Start = fechas.fechaInicioT1 ? new Date(fechas.fechaInicioT1) : null;
    const t1End = fechas.fechaFinT1 ? new Date(fechas.fechaFinT1) : null;
    const t2Start = fechas.fechaInicioT2 ? new Date(fechas.fechaInicioT2) : null;
    const t2End = fechas.fechaFinT2 ? new Date(fechas.fechaFinT2) : null;
    const t3Start = fechas.fechaInicioT3 ? new Date(fechas.fechaInicioT3) : null;
    const t3End = fechas.fechaFinT3 ? new Date(fechas.fechaFinT3) : null;

    if (t1Start && t1End && t1Start > t1End) return false;
    if (t2Start && t2End && t2Start > t2End) return false;
    if (t3Start && t3End && t3Start > t3End) return false;

    return true;
  };

  const isValid = validateDates();

  return (
    <Card className="shadow-md bg-card border-border module-card">
      <CardHeader className="py-3 px-4 border-border">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Fechas de Trimestres
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Configura las fechas de inicio y fin para cada trimestre. Si no se configuran, se usarán los rangos por defecto (T1: Ene-Abr, T2: May-Ago, T3: Sep-Dic).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-primary">Primer Trimestre</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Inicio</Label>
                <Input
                  type="date"
                  value={fechas.fechaInicioT1 || ""}
                  onChange={(e) => handleChange("fechaInicioT1", e.target.value)}
                  className={`h-9 text-xs ${darkMode ? "bg-card border-white/30 text-white" : ""}`}
                />
                {fechas.fechaInicioT1 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{formatFecha(fechas.fechaInicioT1)}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fin</Label>
                <Input
                  type="date"
                  value={fechas.fechaFinT1 || ""}
                  onChange={(e) => handleChange("fechaFinT1", e.target.value)}
                  className={`h-9 text-xs ${darkMode ? "bg-card border-white/30 text-white" : ""}`}
                />
                {fechas.fechaFinT1 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{formatFecha(fechas.fechaFinT1)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-primary">Segundo Trimestre</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Inicio</Label>
                <Input
                  type="date"
                  value={fechas.fechaInicioT2 || ""}
                  onChange={(e) => handleChange("fechaInicioT2", e.target.value)}
                  className={`h-9 text-xs ${darkMode ? "bg-card border-white/30 text-white" : ""}`}
                />
                {fechas.fechaInicioT2 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{formatFecha(fechas.fechaInicioT2)}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fin</Label>
                <Input
                  type="date"
                  value={fechas.fechaFinT2 || ""}
                  onChange={(e) => handleChange("fechaFinT2", e.target.value)}
                  className={`h-9 text-xs ${darkMode ? "bg-card border-white/30 text-white" : ""}`}
                />
                {fechas.fechaFinT2 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{formatFecha(fechas.fechaFinT2)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-primary">Tercer Trimestre</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Inicio</Label>
                <Input
                  type="date"
                  value={fechas.fechaInicioT3 || ""}
                  onChange={(e) => handleChange("fechaInicioT3", e.target.value)}
                  className={`h-9 text-xs ${darkMode ? "bg-card border-white/30 text-white" : ""}`}
                />
                {fechas.fechaInicioT3 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{formatFecha(fechas.fechaInicioT3)}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fin</Label>
                <Input
                  type="date"
                  value={fechas.fechaFinT3 || ""}
                  onChange={(e) => handleChange("fechaFinT3", e.target.value)}
                  className={`h-9 text-xs ${darkMode ? "bg-card border-white/30 text-white" : ""}`}
                />
                {fechas.fechaFinT3 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{formatFecha(fechas.fechaFinT3)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isValid && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50">
            <p className="text-xs text-red-500 font-medium">
              Error: Las fechas de inicio deben ser anteriores a las fechas de fin.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className={`border-t justify-end gap-2 py-3 px-4 ${darkMode ? "bg-card border-white/30" : "bg-slate-50"}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={loading || !hasChanges}
          className="h-8 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Restablecer
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={loading || !hasChanges || !isValid}
          className="h-8 text-xs bg-primary"
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
