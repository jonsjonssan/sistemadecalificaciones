"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  CalendarDays,
  Users,
  Settings,
  FileText,
  CheckCircle2,
  Lightbulb,
  X
} from "lucide-react";

interface WizardProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  userRole: string;
  onNavigateTo: (tab: string) => void;
}

const steps = [
  {
    title: "Bienvenido al Sistema",
    description: "Te guiaremos por las funciones principales del sistema de calificaciones.",
    icon: Lightbulb,
    content: (role: string) => (
      <div className="space-y-4">
        <p className="text-sm">
          Este sistema te permite gestionar calificaciones, asistencia y estudiantes de manera eficiente.
        </p>
        {role === "admin" ? (
          <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-200 dark:border-teal-800">
            <p className="text-sm font-medium text-teal-800 dark:text-teal-300">Como Administrador</p>
            <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">
              Puedes gestionar usuarios, grados, materias y ver estadísticas generales del sistema.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Como Docente</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Puedes ingresar calificaciones, tomar asistencia y ver el rendimiento de tus estudiantes asignados.
            </p>
          </div>
        )}
      </div>
    )
  },
  {
    title: "Panel de Inicio",
    description: "Tu centro de control con estadísticas y accesos rápidos.",
    icon: ClipboardList,
    content: () => (
      <div className="space-y-4">
        <p className="text-sm">
          El panel de inicio muestra métricas importantes:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Total de estudiantes, grados y asignaturas</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Gráficos de rendimiento académico</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Cuadro de Honor y Alertas de estudiantes</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Accesos rápidos a las funciones más usadas</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    title: "Ingresar Calificaciones",
    description: "La función principal para registrar notas por trimestre.",
    icon: ClipboardList,
    content: () => (
      <div className="space-y-4">
        <p className="text-sm">
          Para ingresar calificaciones sigue estos pasos:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge className="bg-teal-600 shrink-0 mt-0.5">1</Badge>
            <p className="text-sm">Selecciona el <strong>Grado</strong> y la <strong>Asignatura</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-teal-600 shrink-0 mt-0.5">2</Badge>
            <p className="text-sm">Elige el <strong>Trimestre</strong> (I, II o III)</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-teal-600 shrink-0 mt-0.5">3</Badge>
            <p className="text-sm">Ingresa las notas en la tabla (0-10)</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-teal-600 shrink-0 mt-0.5">4</Badge>
            <p className="text-sm">Presiona <strong>Guardar</strong> para almacenar todo</p>
          </div>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Tip:</strong> Las calificaciones se guardan automáticamente mientras escribes. También puedes importar desde CSV.
          </p>
        </div>
      </div>
    )
  },
  {
    title: "Tomar Asistencia",
    description: "Registro diario de asistencia de manera rápida.",
    icon: CalendarDays,
    content: () => (
      <div className="space-y-4">
        <p className="text-sm">
          El control de asistencia es sencillo:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge className="bg-blue-600 shrink-0 mt-0.5">1</Badge>
            <p className="text-sm">Selecciona el <strong>Grado</strong> y la <strong>Fecha</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-blue-600 shrink-0 mt-0.5">2</Badge>
            <p className="text-sm">Marca el estado de cada estudiante:</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded text-center">
            <p className="text-xs font-medium text-green-700 dark:text-green-400">Presente</p>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded text-center">
            <p className="text-xs font-medium text-red-700 dark:text-red-400">Ausente</p>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded text-center">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Tarde</p>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-center">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Justificada</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Puedes ver el resumen mensual y exportar a CSV desde la pestaña "Resumen".
        </p>
      </div>
    )
  },
  {
    title: "Gestión de Estudiantes",
    description: "Administra la lista de estudiantes por grado.",
    icon: Users,
    content: () => (
      <div className="space-y-4">
        <p className="text-sm">
          En esta sección puedes:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Agregar estudiantes individualmente</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Importar lista completa de estudiantes</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Reordenar estudiantes arrastrando</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Editar información de cada estudiante</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    title: "Boletas y Reportes",
    description: "Genera boletas de calificaciones para imprimir.",
    icon: FileText,
    content: () => (
      <div className="space-y-4">
        <p className="text-sm">
          Las boletas muestran el resumen de calificaciones:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Selecciona grado y trimestre</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Revisa las calificaciones de cada estudiante</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <span>Imprime o exporta las boletas</span>
          </li>
        </ul>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-xs text-purple-700 dark:text-purple-400">
            <strong>Nota:</strong> Los administradores pueden seleccionar qué asignaturas incluir en la boleta.
          </p>
        </div>
      </div>
    )
  },
  {
    title: "¡Listo para comenzar!",
    description: "Ya conoces las funciones principales del sistema.",
    icon: CheckCircle2,
    content: (role: string) => (
      <div className="space-y-4">
        <p className="text-sm">
          {role === "admin"
            ? "Como administrador, te recomendamos empezar por la pestaña Admin para configurar usuarios y grados."
            : "Como docente, puedes comenzar ingresando calificaciones o tomando asistencia."
          }
        </p>
        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-700 dark:text-green-400">
            <strong>Recuerda:</strong> Puedes volver a ver esta guía en cualquier momento desde el menú de ayuda.
          </p>
        </div>
      </div>
    )
  }
];

export default function GettingStartedWizard({ open, onClose, darkMode, userRole, onNavigateTo }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCurrentStep(0);
      setDontShowAgain(false);
      onClose();
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      // Guardar permanentemente en localStorage para que no vuelva a aparecer nunca
      localStorage.setItem("ss_wizard_dismissed", "true");
    }
    onClose();
  };

  const handleNavigate = (tab: string) => {
    onNavigateTo(tab);
    handleComplete();
  };

  const Icon = steps[currentStep].icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`max-w-lg ${darkMode ? 'bg-[#1e293b] border-slate-700' : ''}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-teal-900/50' : 'bg-teal-50'}`}>
                <Icon className={`h-5 w-5 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
              </div>
              <div>
                <DialogTitle className="text-lg">{steps[currentStep].title}</DialogTitle>
                <DialogDescription className="text-sm">{steps[currentStep].description}</DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            Paso {currentStep + 1} de {steps.length}
          </p>

          <div className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            {steps[currentStep].content(userRole)}
          </div>

          {currentStep === 1 && (
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => handleNavigate("dashboard")}
            >
              Ir al Panel de Inicio
            </Button>
          )}
          {currentStep === 2 && (
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => handleNavigate("calificaciones")}
            >
              Ir a Calificaciones
            </Button>
          )}
          {currentStep === 3 && (
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => handleNavigate("asistencia")}
            >
              Ir a Asistencia
            </Button>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="dontShowAgain" className="text-xs text-muted-foreground">
              No mostrar de nuevo
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="text-sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className={`text-sm ${darkMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-600'}`}
            >
              {currentStep === steps.length - 1 ? "Finalizar" : "Siguiente"}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
