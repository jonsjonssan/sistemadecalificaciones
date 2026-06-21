"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const ServiceWorkerRegistration = dynamic(
  () =>
    import("@/components/ServiceWorkerRegistration").then(
      (mod) => ({ default: mod.ServiceWorkerRegistration })
    ),
  { ssr: false }
);

const NetworkStatusIndicator = dynamic(
  () =>
    import("@/components/NetworkStatusIndicator").then(
      (mod) => ({ default: mod.NetworkStatusIndicator })
    ),
  { ssr: false }
);

const CustomCursor = dynamic(
  () =>
    import("@/components/CustomCursor").then(
      (mod) => ({ default: mod.CustomCursor })
    ),
  { ssr: false }
);

export function ClientComponents() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (canHover && !reducedMotion) {
      document.body.classList.add("custom-cursor-active");
      return () => document.body.classList.remove("custom-cursor-active");
    }
  }, []);

  return (
    <>
      <ServiceWorkerRegistration />
      <NetworkStatusIndicator />
      <CustomCursor />
    </>
  );
}
