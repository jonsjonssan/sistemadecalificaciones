"use client";

import { motion } from "framer-motion";
import { ClipboardList, CalendarDays, FileText, Users } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Gestión de Calificaciones",
    description: "Registra actividades, evaluaciones y exámenes. El sistema calcula promedios automáticamente por trimestre.",
    color: "emerald",
  },
  {
    icon: CalendarDays,
    title: "Control de Asistencia",
    description: "Lleva el registro diario de asistencia, tardanzas y justificaciones de cada estudiante por grado.",
    color: "blue",
  },
  {
    icon: FileText,
    title: "Boletas y Reportes",
    description: "Genera boletas individuales y reportes consolidados de calificaciones en PDF listos para imprimir.",
    color: "violet",
  },
  {
    icon: Users,
    title: "Seguimiento de Estudiantes",
    description: "Administra estudiantes por grado y sección, consulta su historial académico y observaciones del año.",
    color: "amber",
  },
];

const colorStyles: Record<string, { icon: string; bg: string; border: string; ring: string }> = {
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-100 dark:border-emerald-900/50",
    ring: "ring-emerald-100 dark:ring-emerald-900/40",
  },
  blue: {
    icon: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-100 dark:border-blue-900/50",
    ring: "ring-blue-100 dark:ring-blue-900/40",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-100 dark:border-violet-900/50",
    ring: "ring-violet-100 dark:ring-violet-900/40",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-100 dark:border-amber-900/50",
    ring: "ring-amber-100 dark:ring-amber-900/40",
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

export default function LoginFeatures() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-8 sm:mb-10"
      >
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
          Funcionalidades principales
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Todo lo que necesitas para gestionar el proceso educativo en un solo lugar.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          const styles = colorStyles[feature.color];
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className={`group flex items-start gap-4 sm:gap-5 rounded-2xl bg-card border ${styles.border} p-4 sm:p-6 shadow-sm hover:shadow-md hover:ring-1 ${styles.ring} transition-all duration-300`}
            >
              <div
                className={`w-12 h-12 shrink-0 rounded-xl ${styles.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className={`h-6 w-6 ${styles.icon}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
