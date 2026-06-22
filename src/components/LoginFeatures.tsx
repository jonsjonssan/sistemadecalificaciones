"use client";

import { motion } from "framer-motion";
import { ClipboardList, CalendarDays, FileText, Users } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Calificaciones",
    description: "Registro de actividades, evaluaciones y cálculo automático de promedios.",
    gradient: "from-emerald-500/10 to-green-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    icon: CalendarDays,
    title: "Asistencia",
    description: "Control diario de asistencia, tardanzas y justificaciones por grado.",
    gradient: "from-blue-500/10 to-indigo-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    icon: FileText,
    title: "Boletas y Reportes",
    description: "Generación de boletas individuales y reportes consolidados en PDF.",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
  },
  {
    icon: Users,
    title: "Estudiantes",
    description: "Gestión de estudiantes por grado, sección e historial académico.",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
  },
];

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
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-6 sm:mb-8"
      >
        <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
          ¿Qué puedes hacer en el{" "}
          <span className="text-primary">Sistema de Calificaciones</span>?
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Herramientas pensadas para simplificar la gestión educativa.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border p-3 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
              <div className="relative z-10">
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl ${feature.iconBg} flex items-center justify-center mb-2 sm:mb-3 transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="font-display text-xs sm:text-base font-bold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
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
