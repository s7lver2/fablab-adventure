import type { Metadata } from "next";
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
      </body>
    </html>
  );
}
