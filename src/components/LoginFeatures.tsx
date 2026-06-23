"use client";

import { motion } from "framer-motion";
import { ClipboardList, CalendarDays, FileText, Users } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Calificaciones",
    description: "Notas y promedios",
    color: "emerald",
  },
  {
    icon: CalendarDays,
    title: "Asistencia",
    description: "Control diario",
    color: "blue",
  },
  {
    icon: FileText,
    title: "Boletas",
    description: "Reportes en PDF",
    color: "violet",
  },
  {
    icon: Users,
    title: "Estudiantes",
    description: "Historial académico",
    color: "amber",
  },
];

const colorStyles: Record<string, { icon: string; bg: string }> = {
  emerald: {
    icon: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  blue: {
    icon: "text-blue-600",
    bg: "bg-blue-50",
  },
  violet: {
    icon: "text-violet-600",
    bg: "bg-violet-50",
  },
  amber: {
    icon: "text-amber-600",
    bg: "bg-amber-50",
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
    <section className="w-full bg-[#f2f0eb] px-5 sm:px-10 lg:px-16 py-12 sm:py-16">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          const styles = colorStyles[feature.color];
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className="group flex flex-col items-center text-center bg-white rounded-[32px] p-7 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-2xl ${styles.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className={`h-5 w-5 ${styles.icon}`} />
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#1f2937] mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-[#6b7280] leading-relaxed italic">
                &ldquo;{feature.description}&rdquo;
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
