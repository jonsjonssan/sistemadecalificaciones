"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { useTheme } from "next-themes";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface GradeChartProps {
  data: Array<{
    name: string;
    value: number;
    target?: number;
  }>;
  title: string;
  description?: string;
  icon?: LucideIcon;
  showArea?: boolean;
  showTarget?: boolean;
  color?: string;
  targetColor?: string;
  darkMode?: boolean;
  height?: number;
  action?: React.ReactNode;
}

function CustomTooltip({ active, payload, darkMode, showTarget }: { active?: boolean; payload?: any[]; darkMode: boolean; showTarget: boolean }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className={cn(
          "rounded-lg shadow-lg border p-3",
          darkMode ? "bg-card border-border" : "bg-white border-slate-200"
        )}
      >
        <p className={cn("text-sm font-semibold mb-1", darkMode ? "text-white" : "text-slate-800")}>
          {data.name}
        </p>
        <div className="space-y-0.5">
          <p className="text-xs flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span className={darkMode ? "text-slate-400" : "text-slate-600"}>Promedio:</span>
            <span className={cn("font-bold", darkMode ? "text-white" : "text-slate-800")}>
              {data.value.toFixed(2)}
            </span>
          </p>
          {showTarget && data.target && (
            <p className="text-xs flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-accent inline-block" />
              <span className={darkMode ? "text-slate-400" : "text-slate-600"}>Meta:</span>
              <span className={cn("font-bold", darkMode ? "text-white" : "text-slate-800")}>
                {data.target.toFixed(2)}
              </span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function GradeChart({
  data,
  title,
  description,
  icon: Icon,
  showArea = true,
  showTarget = true,
  color = "oklch(0.56 0.15 155)",
  targetColor = "oklch(0.65 0.12 85)",
  darkMode: propDarkMode,
  height = 300,
  action,
}: GradeChartProps) {
  const { resolvedTheme } = useTheme();
  const darkMode = propDarkMode ?? resolvedTheme === "dark";

  const latestValue = data[data.length - 1]?.value ?? 0;
  const previousValue = data.length > 1 ? data[data.length - 2]?.value ?? 0 : 0;
  const trend = latestValue - previousValue;

  const gridColor = darkMode ? "rgba(148, 163, 184, 0.1)" : "rgba(148, 163, 184, 0.2)";
  const textColor = darkMode ? "#94a3b8" : "#64748b";

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-emerald-600 dark:text-emerald-400" : trend < 0 ? "text-red-500" : darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
        <Card
          className={cn(
            "shadow-sm overflow-hidden border-border bg-card",
          )}
        >
          <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary/30" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", darkMode ? "bg-accent/20" : "bg-emerald-50")}>
                  <Icon className="h-4 w-4 text-emerald-500" />
                </div>
              )}
              <div>
                <CardTitle className={cn("text-sm sm:text-base", darkMode ? "text-slate-300" : "text-green-800")}>
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription className="text-xs text-muted-foreground">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {action}
              <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span>{trend > 0 ? "+" : ""}{trend.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No hay datos disponibles</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={height}>
              {showArea ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <Tooltip content={<CustomTooltip darkMode={darkMode} showTarget={showTarget} />} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  />
                  {showTarget && (
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke={targetColor}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Meta"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    name="Promedio"
                    animationDuration={1000}
                  />
                </AreaChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <Tooltip content={<CustomTooltip darkMode={darkMode} showTarget={showTarget} />} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, strokeWidth: 2, r: 4 }}
                    name="Promedio"
                    animationDuration={1000}
                  />
                  {showTarget && (
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke={targetColor}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Meta"
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
