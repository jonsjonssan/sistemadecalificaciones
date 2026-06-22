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
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  blue: {
    icon: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
};

export default function LoginFeatures() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const styles = colorStyles[feature.color];
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="group flex-1 min-w-0 flex items-center gap-3 sm:gap-4 rounded-2xl bg-white border border-[#e8e6e0] p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl ${styles.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${styles.icon}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm sm:text-base font-bold text-[#1a2e1a] leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-[#7a8a7a] leading-tight mt-0.5">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
