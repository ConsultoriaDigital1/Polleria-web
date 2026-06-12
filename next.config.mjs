/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un build autocontenido ideal para desplegar en un VPS / Docker.
  // Solo se activa en el build de Docker (BUILD_STANDALONE=true), porque en
  // Windows + pnpm el copiado de "standalone" requiere permisos de symlink.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
