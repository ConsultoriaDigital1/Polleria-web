import type { Metadata, Viewport } from "next";
import "./globals.css";
import { buildAccentScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Pollería Entre Ríos — El mejor pollo de Corrientes",
  description:
    "Pollería Entre Ríos, Corrientes: pollo fresco todos los días. Comprá online y recibilo a domicilio en compras desde $50.000. Consultas por WhatsApp al 3794 525617.",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#C8102E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: buildAccentScript() }} />
        {children}
      </body>
    </html>
  );
}
