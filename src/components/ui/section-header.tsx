"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  darkMode: boolean;
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
  darkMode,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center",
            darkMode ? "bg-emerald-900/30" : "bg-emerald-50"
          )}
        >
          <Icon className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h2
            className={cn(
              "text-lg font-bold tracking-tight",
              darkMode ? "text-white" : "text-slate-800"
            )}
          >
            {title}
          </h2>
          {description && (
            <p
              className={cn(
                "text-xs",
                darkMode ? "text-slate-400" : "text-slate-500"
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {action && <div>{action}</div>}
    </motion.div>
  );
}
