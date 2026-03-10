import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Desabilita TypeScript e ESLint no build para economizar memória */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  /* Força Webpack ao invés de Turbopack (Turbopack causa OOM em t3.micro) */
  turbopack: undefined,
  /* Reduz paralelismo do Webpack para economizar RAM */
  webpack: (config, { isServer }) => {
    // Limita workers do webpack a 1 para reduzir uso de memória
    if (config.parallelism !== undefined) {
      config.parallelism = 1;
    }
    return config;
  },
};

export default nextConfig;
