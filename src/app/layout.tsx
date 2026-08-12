import type { Metadata, Viewport } from "next";
import "./globals.css";
import { buildAccentScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Tienda GestorIA - Polleria Entre Rios",
  description:
    "Tienda online administrada con GestorIA. Compra productos frescos y recibilos a domicilio.",
  icons: {
    icon: "/gestoria-favicon.png",
    apple: "/gestoria-favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C1015",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: buildAccentScript() }} />
        {children}
      </body>
    </html>
  );
}
