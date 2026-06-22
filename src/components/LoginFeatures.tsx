"use client";

import { motion } from "framer-motion";
import { ClipboardList, CalendarDays, FileText, Users } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Gestión de Calificaciones",
    description:
      "Registra actividades, evaluaciones y exámenes. El sistema calcula promedios automáticamente por trimestre.",
    gradient: "from-emerald-500/10 to-green-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    icon: CalendarDays,
    title: "Control de Asistencia",
    description:
      "Lleva el registro diario de asistencia, tardanzas y justificaciones de cada estudiante por grado.",
    gradient: "from-blue-500/10 to-indigo-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    icon: FileText,
    title: "Boletas y Reportes",
    description:
      "Genera boletas individuales y reportes consolidados de calificaciones en PDF listos para imprimir.",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
  },
  {
    icon: Users,
    title: "Seguimiento de Estudiantes",
    description:
      "Administra estudiantes por grado y sección, consulta su historial académico y observaciones del año.",
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
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export default function LoginFeatures() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-8 sm:mb-10"
      >
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          ¿Qué puedes hacer en el{" "}
          <span className="text-primary">Sistema de Calificaciones</span>?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Herramientas pensadas para simplificar la gestión educativa y potenciar el acompañamiento estudiantil.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
              <div className="relative z-10">
                <div
                  className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground mb-2">
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
