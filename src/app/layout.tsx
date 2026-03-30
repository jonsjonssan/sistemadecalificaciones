import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/next";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Calificaciones - Escuela Parroquial de San José de la Montaña",
  description: "Sistema de gestión de calificaciones para grados 2° a 9°",
  keywords: ["Calificaciones", "Escuela", "Educación", "Boletas"],
  authors: [{ name: "Escuela Parroquial de San José de la Montaña" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.className} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
