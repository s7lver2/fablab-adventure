import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { MaintenanceRedirector } from "@/components/MaintenanceRedirector";

export const metadata: Metadata = {
  title: "Fab Lab Quest — Aprende a programar jugando",
  description: "Aprende programación con retos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <MaintenanceRedirector />
        {children}
        <Script
          src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js"
          strategy="beforeInteractive"
          async
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js"
          strategy="beforeInteractive"
          async
        />
      </body>
    </html>
  );
}
