"use client";

import { motion } from "framer-motion";
import { ClipboardList, CalendarDays, FileText, Users } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Calificaciones",
    description: "Registro de notas y cálculo automático de promedios.",
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
    title: "Boletas",
    description: "Generación de boletas y reportes en PDF.",
    color: "violet",
  },
  {
    icon: Users,
    title: "Estudiantes",
    description: "Gestión de alumnos e historial académico.",
    color: "amber",
  },
];

const colorStyles: Record<string, { icon: string; bg: string; border: string; shadow: string }> = {
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-100/80 dark:border-emerald-900/40",
    shadow: "shadow-emerald-500/10",
  },
  blue: {
    icon: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-100/80 dark:border-blue-900/40",
    shadow: "shadow-blue-500/10",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-100/80 dark:border-violet-900/40",
    shadow: "shadow-violet-500/10",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-100/80 dark:border-amber-900/40",
    shadow: "shadow-amber-500/10",
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
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
    <section className="w-full px-4 sm:px-8 lg:px-16 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-8 sm:mb-12"
      >
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
          Funcionalidades principales
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Todo lo que necesitas para gestionar el proceso educativo.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          const styles = colorStyles[feature.color];
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className={`group flex flex-col items-center text-center rounded-3xl bg-card border ${styles.border} p-6 sm:p-8 shadow-sm hover:shadow-xl ${styles.shadow} transition-all duration-300`}
            >
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${styles.bg} flex items-center justify-center mb-5 sm:mb-6 transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${styles.icon}`} />
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
