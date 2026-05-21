"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  darkMode: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  darkMode,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "border-2 border-dashed shadow-sm bg-card border-border"
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="h-16 w-16 rounded-full flex items-center justify-center mb-4 bg-muted"
          >
            <Icon className="h-8 w-8 text-muted-foreground/50" />
          </motion.div>

          <h3 className="text-lg font-semibold mb-1 text-foreground">
            {title}
          </h3>

          <p className="text-sm max-w-sm mb-4 text-muted-foreground">
            {description}
          </p>

          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              size="sm"
            >
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
