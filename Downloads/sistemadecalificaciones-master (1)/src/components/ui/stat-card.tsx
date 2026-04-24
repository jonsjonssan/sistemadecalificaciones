"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  loading?: boolean;
  darkMode: boolean;
  delay?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  accentColor,
  trend,
  loading = false,
  darkMode,
  delay = 0,
}: StatCardProps) {
  if (loading) {
    return (
      <Card
        className={cn(
          "shadow-sm overflow-hidden",
          darkMode ? "bg-[#1e293b] border-slate-700" : "border-slate-100"
        )}
      >
        <div className={cn("h-1 w-full", accentColor)} />
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center justify-between">
              <div className={cn("h-5 w-24 rounded", darkMode ? "bg-slate-700" : "bg-slate-200")} />
              <div className={cn("h-10 w-10 rounded-full", darkMode ? "bg-slate-700" : "bg-slate-200")} />
            </div>
            <div className={cn("h-8 w-16 rounded", darkMode ? "bg-slate-700" : "bg-slate-200")} />
            <div className={cn("h-4 w-20 rounded", darkMode ? "bg-slate-700" : "bg-slate-200")} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        className={cn(
          "shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md cursor-default",
          darkMode ? "bg-[#1e293b] border-slate-700" : "border-slate-100"
        )}
      >
        <div className={cn("h-1 w-full", accentColor)} />
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p
              className={cn(
                "text-sm font-medium",
                darkMode ? "text-slate-300" : "text-slate-600"
              )}
            >
              {title}
            </p>
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                iconBg
              )}
            >
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                "text-2xl font-bold tracking-tight",
                darkMode ? "text-white" : "text-slate-800"
              )}
            >
              {value}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p
              className={cn(
                "text-xs font-medium",
                darkMode ? "text-slate-400" : "text-slate-500"
              )}
            >
              {subtitle}
            </p>
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  trend.positive !== false
                    ? darkMode
                      ? "text-emerald-400 bg-emerald-900/30"
                      : "text-emerald-700 bg-emerald-50"
                    : darkMode
                    ? "text-red-400 bg-red-900/30"
                    : "text-red-700 bg-red-50"
                )}
              >
                <span>{trend.positive !== false ? "↑" : "↓"}</span>
                <span>{trend.value}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
