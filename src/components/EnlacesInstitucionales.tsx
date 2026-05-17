"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  GraduationCap,
  FileCheck,
  Monitor,
  Wrench,
  BookOpen,
  Globe,
  School,
  Brain,
} from "lucide-react";

interface EnlaceInstitucional {
  nombre: string;
  url: string;
  descripcion: string;
  icono: React.ReactNode;
}

const enlaces: EnlaceInstitucional[] = [
  {
    nombre: "MINEDUCYT",
    url: "https://www.mined.gob.sv",
    descripcion: "Portal principal del Ministerio de Educación",
    icono: <Building2 className="h-5 w-5" />,
  },
  {
    nombre: "Portal Docente",
    url: "https://www.mined.gob.sv/gestioneducativa/personal-docente/",
    descripcion: "Gestión de personal, nombramientos y contratos",
    icono: <GraduationCap className="h-5 w-5" />,
  },
  {
    nombre: "SIGOB SOL",
    url: "https://sigob02.mined.gob.sv/st-funcionario",
    descripcion: "Trámites y solicitudes ciudadanas del MINEDUCYT",
    icono: <FileCheck className="h-5 w-5" />,
  },
  {
    nombre: "SIGES",
    url: "https://cas.siges.sv/cas/login?service=https%3A%2F%2Fescritorio.siges.sv%2Fpp%2Finicio",
    descripcion: "Sistema Integrado de Gestión Educativa",
    icono: <School className="h-5 w-5" />,
  },
  {
    nombre: "clases.edu.sv",
    url: "https://www.enlaces.edu.sv",
    descripcion: "Transformación digital, equipos y entorno virtual",
    icono: <Monitor className="h-5 w-5" />,
  },
  {
    nombre: "Servicios Docentes",
    url: "https://www.enlaces.edu.sv/docentes/",
    descripcion: "Actualización de datos y soporte @clases.edu.sv",
    icono: <Wrench className="h-5 w-5" />,
  },
  {
    nombre: "Formación Docente",
    url: "https://formaciondocente.edu.sv",
    descripcion: "Cursos, programas y materiales educativos",
    icono: <BookOpen className="h-5 w-5" />,
  },
  {
    nombre: "MiPortal",
    url: "https://www.miportal.edu.sv",
    descripcion: "Recursos digitales para todas las asignaturas",
    icono: <Globe className="h-5 w-5" />,
  },
  {
    nombre: "Kira Learning",
    url: "https://app.kira-learning.com/home/",
    descripcion: "Plataforma de aprendizaje interactiva",
    icono: <Brain className="h-5 w-5" />,
  },
];

export default function EnlacesInstitucionales({ darkMode }: { darkMode: boolean }) {
  return (
    <Card className={`shadow-sm ${darkMode ? "bg-[#0E1726] border-slate-700" : ""}`}>
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-600" />
          Enlaces Institucionales
        </CardTitle>
        <CardDescription className={`text-xs sm:text-sm ${darkMode ? "text-slate-400" : ""}`}>
          Acceso rápido a portales y servicios del MINEDUCYT y plataformas educativas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {enlaces.map((enlace) => (
            <a
              key={enlace.url}
              href={enlace.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-start gap-3 rounded-lg border p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                darkMode
                  ? "border-slate-700 hover:border-slate-600 hover:bg-slate-800/50"
                  : "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  darkMode
                    ? "bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600/30"
                    : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
                }`}
              >
                {enlace.icono}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{enlace.nombre}</span>
                  <ExternalLink
                    className={`h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                      darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  />
                </div>
                <p
                  className={`text-xs mt-0.5 line-clamp-2 ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {enlace.descripcion}
                </p>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
