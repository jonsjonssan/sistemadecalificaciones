import {
  Building2, GraduationCap, FileCheck, Monitor,
  Wrench, BookOpen, Globe, School, Brain,
} from "lucide-react";

export interface EnlaceInstitucional {
  nombre: string;
  url: string;
  descripcion: string;
  icono: React.ReactNode;
}

export const enlaces: EnlaceInstitucional[] = [
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
