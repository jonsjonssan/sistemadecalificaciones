"use client";

import { motion } from "framer-motion";
import { ClipboardList, CalendarDays, FileText, Users } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Calificaciones",
    description: "Registro de actividades y cálculo automático de promedios.",
    color: "emerald",
  },
  {
    icon: CalendarDays,
    title: "Asistencia",
    description: "Control diario de asistencia y justificaciones.",
    color: "blue",
  },
  {
    icon: FileText,
    title: "Boletas y Reportes",
    description: "Generación de boletas y reportes en PDF.",
    color: "violet",
  },
  {
    icon: Users,
    title: "Estudiantes",
    description: "Gestión de estudiantes e historial académico.",
    color: "amber",
  },
];

const colorStyles: Record<string, { icon: string; bg: string; border: string; glow: string }> = {
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "group-hover:border-emerald-200 dark:group-hover:border-emerald-800",
    glow: "group-hover:shadow-emerald-500/10",
  },
  blue: {
    icon: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "group-hover:border-blue-200 dark:group-hover:border-blue-800",
    glow: "group-hover:shadow-blue-500/10",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "group-hover:border-violet-200 dark:group-hover:border-violet-800",
    glow: "group-hover:shadow-violet-500/10",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "group-hover:border-amber-200 dark:group-hover:border-amber-800",
    glow: "group-hover:shadow-amber-500/10",
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-6 sm:mb-8"
      >
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
          ¿Qué puedes hacer en el{" "}
          <span className="text-primary">Sistema de Calificaciones</span>?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Herramientas pensadas para simplificar la gestión educativa.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          const styles = colorStyles[feature.color];
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={`group rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-sm hover:shadow-lg ${styles.glow} ${styles.border} transition-all duration-300 min-w-0`}
            >
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${styles.bg} flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className={`h-5 w-5 ${styles.icon}`} />
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground mb-1 break-words">
                {feature.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed break-words">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
