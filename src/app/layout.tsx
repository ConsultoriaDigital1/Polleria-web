import type { Metadata, Viewport } from "next";
import "./globals.css";
import { buildAccentScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Pollería Entre Ríos — El mejor pollo de Corrientes",
  description:
    "Pollería Entre Ríos, Corrientes: pollo fresco todos los días. Pedí por WhatsApp al 3794 525617, envíos a domicilio en pedidos desde $200.000 y sumá puntos con el Club Pollería.",
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
