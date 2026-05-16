"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  darkMode?: boolean;
}

export function PageLoader({ message = "Cargando...", darkMode }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div
          className={cn(
            "h-16 w-16 rounded-full border-4 border-t-emerald-500 animate-spin",
            darkMode ? "border-slate-700" : "border-slate-200"
          )}
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="h-6 w-6 rounded-full bg-emerald-500/20" />
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "text-sm font-medium",
          darkMode ? "text-slate-400" : "text-slate-500"
        )}
      >
        {message}
      </motion.p>
    </div>
  );
}
