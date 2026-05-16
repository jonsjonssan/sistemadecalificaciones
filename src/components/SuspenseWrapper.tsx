"use client";

import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function TabFallback() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function SuspenseTab({ children }: { children: ReactNode }) {
  return <Suspense fallback={<TabFallback />}>{children}</Suspense>;
}
