import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Transpile avr8js (ESM-only package) for client-side use
  transpilePackages: ['avr8js'],
};

export default nextConfig;
