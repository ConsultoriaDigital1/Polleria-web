/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un build autocontenido ideal para desplegar en un VPS / Docker.
  // Solo se activa en el build de Docker (BUILD_STANDALONE=true), porque en
  // Windows + pnpm el copiado de "standalone" requiere permisos de symlink.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  reactStrictMode: true,
  experimental: {
    // Las imágenes de producto/oferta se comprimen en el browser a ~600 KB
    // (ver src/lib/image-client.ts) antes de subirlas por server action; el
    // límite explícito evita depender del default de Next (1 MB) que quedó
    // muy justo y causó cargas fallidas en producción sin motivo aparente.
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
