"use client";

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

export function ClientComponents() {
  return (
    <>
      <ServiceWorkerRegistration />
      <NetworkStatusIndicator />
    </>
  );
}
