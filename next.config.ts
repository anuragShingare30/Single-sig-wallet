import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Fix for RainbowKit and wagmi compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  // Experimental features
  experimental: {
    // Ensure proper server-side rendering
    serverComponentsExternalPackages: ['@rainbow-me/rainbowkit', 'wagmi'],
  },
};

export default nextConfig;
