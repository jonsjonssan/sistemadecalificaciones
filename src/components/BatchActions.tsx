"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Save, 
  Trash2, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from "lucide-react";

interface BatchActionsProps {
  gradoId: string;
  materiaId: string;
  trimestre: string;
  estudiantes: { id: string; nombre: string; numero: number }[];
  darkMode: boolean;
  onActionComplete: () => void;
}

export default function BatchActions({ gradoId, materiaId, trimestre, estudiantes, darkMode, onActionComplete }: BatchActionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelectAll = () => {
    if (selectedStudents.length === estudiantes.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(estudiantes.map(e => e.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleExecute = async () => {
    if (!action || selectedStudents.length === 0) {
      toast({ title: "Selecciona estudiantes y una acción", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      switch (action) {
        case "set-all-present":
          await markAllAttendance("presente");
          break;
        case "clear-grades":
          await clearGrades();
          break;
        case "set-grade":
          await setGradeForAll();
          break;
        case "reset-attendance":
          await resetAttendance();
          break;
        default:
          toast({ title: "Acción no reconocida", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error al ejecutar acción", variant: "destructive" });
    } finally {
      setLoading(false);
      setOpen(false);
      setSelectedStudents([]);
      setValue("");
    }
  };

  const markAllAttendance = async (estado: string) => {
    const records = selectedStudents.map(estudianteId => ({ estudianteId, estado }));
    const res = await fetch("/api/asistencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        asistencias: records,
        fecha: new Date().toISOString(),
        gradoId,
        materiaId: materiaId || null
      })
    });
    if (res.ok) {
      toast({ title: "Asistencia marcada", description: `${selectedStudents.length} estudiantes marcados como ${estado}` });
      onActionComplete();
    } else {
      toast({ title: "Error al marcar asistencia", variant: "destructive" });
    }
  };

  const clearGrades = async () => {
    if (!confirm(`¿Estás seguro de borrar las calificaciones de ${selectedStudents.length} estudiantes?`)) return;
    
    let success = 0;
    for (const estudianteId of selectedStudents) {
      const res = await fetch(`/api/calificaciones?estudianteId=${estudianteId}&materiaId=${materiaId}&trimestre=${trimestre}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) success++;
    }
    
    toast({ title: "Calificaciones borradas", description: `${success}/${selectedStudents.length} eliminadas` });
    onActionComplete();
  };

  const setGradeForAll = async () => {
    const gradeValue = parseFloat(value);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 10) {
      toast({ title: "Nota inválida", description: "Debe ser entre 0 y 10", variant: "destructive" });
      return;
    }

    let success = 0;
    for (const estudianteId of selectedStudents) {
      const res = await fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          estudianteId,
          materiaId,
          trimestre: parseInt(trimestre),
          actividadesCotidianas: JSON.stringify([gradeValue]),
          examenTrimestral: null,
          recuperacion: null
        })
      });
      if (res.ok) success++;
    }

    toast({ title: "Notas actualizadas", description: `${success}/${selectedStudents.length} actualizadas` });
    onActionComplete();
  };

  const resetAttendance = async () => {
    if (!confirm(`¿Reiniciar asistencia de ${selectedStudents.length} estudiantes a "presente"?`)) return;
    await markAllAttendance("presente");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className={`h-10 text-sm ${darkMode ? 'bg-card border-white/30 text-white hover:bg-white/10' : ''}`}>
          <Users className="h-4 w-4 mr-1" />
          Acciones por Lote
        </Button>
      </DialogTrigger>
      <DialogContent className={`max-w-lg ${darkMode ? 'bg-card border-slate-700' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Acciones por Lote
          </DialogTitle>
          <DialogDescription>
            Aplica una acción a múltiples estudiantes simultáneamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">1. Seleccionar Estudiantes</Label>
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs h-7">
                {selectedStudents.length === estudiantes.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </Button>
              <Badge variant="secondary" className="text-xs">
                {selectedStudents.length}/{estudiantes.length}
              </Badge>
            </div>
            <div className={`max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200'}`}>
              {estudiantes.map(est => (
                <label
                  key={est.id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    selectedStudents.includes(est.id)
                      ? (darkMode ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200')
                      : (darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50')
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(est.id)}
                    onChange={() => handleToggleStudent(est.id)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">{est.numero}. {est.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">2. Seleccionar Acción</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className={`h-10 ${darkMode ? 'bg-card border-white/30 text-white' : ''}`}>
                <SelectValue placeholder="Elige una acción..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set-all-present">Marcar todos como Presente</SelectItem>
                <SelectItem value="reset-attendance">Reiniciar asistencia a Presente</SelectItem>
                <SelectItem value="set-grade">Asignar nota específica</SelectItem>
                <SelectItem value="clear-grades">Borrar calificaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action === "set-grade" && (
            <div>
              <Label className="text-sm font-medium mb-2 block">3. Ingresar Nota (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Ej: 8.5"
                className={`h-10 ${darkMode ? 'bg-slate-700 border-white/30 text-emerald-200' : ''}`}
              />
            </div>
          )}

          {action && (
            <Card className={`border-l-4 ${
              action === "clear-grades" 
                ? 'border-l-red-500' 
                : 'border-l-amber-500'
            } ${darkMode ? 'bg-slate-800/50' : 'bg-amber-50/50'}`}>
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {action === "clear-grades" 
                    ? "Esta acción borrará permanentemente las calificaciones seleccionadas."
                    : action === "set-grade"
                    ? "Esta acción asignará la misma nota a todos los estudiantes seleccionados."
                    : "Esta acción marcará a todos los estudiantes seleccionados como presentes."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            size="sm" 
            onClick={handleExecute} 
            disabled={loading || !action || selectedStudents.length === 0}
            className="bg-emerald-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Ejecutar ({selectedStudents.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
