import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Alívio Extremo de Memória para Instâncias AWS de 1GB RAM (t3a.micro) */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
