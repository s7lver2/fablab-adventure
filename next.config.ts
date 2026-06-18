import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.worker = {
      ...config.worker,
      output: 'worker.js',
    }
    return config
  },
};

export default nextConfig;
