import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pollería Entre Ríos — El mejor pollo de Corrientes",
  description:
    "Pollería Entre Ríos, Corrientes: pollo fresco todos los días. Pedí por WhatsApp al 3794 525617, envíos a domicilio en pedidos desde $200.000 y sumá puntos con el Club Pollería.",
};

export const viewport: Viewport = {
  themeColor: "#C8102E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
