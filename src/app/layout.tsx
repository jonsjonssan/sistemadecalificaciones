import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ClientComponents } from "@/components/ClientComponents";
import { QueryProvider } from "@/lib/query-provider";
import { SkipLink } from "@/components/A11y";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#1a3a2a",
};

export const metadata: Metadata = {
  title: "Sistema de Calificaciones - Precisión y Progreso",
  description: "Sistema de gestión de calificaciones escolar multi-tenant",
  keywords: ["Calificaciones", "Escuela", "Educación", "Boletas", "Gestión Educativa"],
  authors: [{ name: "Sistema de Calificaciones" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${outfit.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground font-body`}
      >
        <SkipLink />
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <ClientComponents />
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
