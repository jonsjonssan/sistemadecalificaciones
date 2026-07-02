"use client";

import { motion } from "framer-motion";
import { ClipboardList, CalendarDays, FileText, Users, ArrowRight } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Calificaciones",
    description: "Notas y promedios de los estudiantes",
    color: "emerald",
  },
  {
    icon: CalendarDays,
    title: "Asistencia",
    description: "Control y registro de asistencias",
    color: "blue",
  },
  {
    icon: FileText,
    title: "Boletas",
    description: "Generar y descargar reportes en PDF",
    color: "violet",
  },
  {
    icon: Users,
    title: "Estudiantes",
    description: "Historial académico de los estudiantes",
    color: "amber",
  },
];

const colorStyles: Record<string, { icon: string; bg: string; border: string; arrow: string; arrowBg: string }> = {
  emerald: {
    icon: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-t-emerald-500",
    arrow: "text-emerald-600",
    arrowBg: "bg-emerald-50 group-hover:bg-emerald-100",
  },
  blue: {
    icon: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-t-blue-500",
    arrow: "text-blue-600",
    arrowBg: "bg-blue-50 group-hover:bg-blue-100",
  },
  violet: {
    icon: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-t-violet-500",
    arrow: "text-violet-600",
    arrowBg: "bg-violet-50 group-hover:bg-violet-100",
  },
  amber: {
    icon: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-t-amber-500",
    arrow: "text-amber-600",
    arrowBg: "bg-amber-50 group-hover:bg-amber-100",
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
    <section className="w-full bg-[#f8f9fa] px-5 sm:px-10 lg:px-16 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1a2e1a] mb-3">
            ¿Qué deseas hacer hoy?
          </h2>
          <p className="text-sm sm:text-base text-[#6b7280]">
            Accede rápidamente a las funciones más utilizadas del sistema
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            const styles = colorStyles[feature.color];
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className={`group relative flex flex-col bg-white rounded-2xl p-6 sm:p-7 border border-[#e8e6e0] border-t-[3px] ${styles.border} shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-300`}
              >
                <div
                  className={`w-14 h-14 rounded-full ${styles.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className={`h-6 w-6 ${styles.icon}`} />
                </div>
                <h3 className="font-display text-lg font-bold text-[#1f2937] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#6b7280] leading-relaxed mb-6 flex-1">
                  {feature.description}
                </p>
                <div className="flex justify-end">
                  <div
                    className={`w-10 h-10 rounded-full ${styles.arrowBg} flex items-center justify-center transition-all duration-300 group-hover:translate-x-1`}
                  >
                    <ArrowRight className={`h-5 w-5 ${styles.arrow}`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
