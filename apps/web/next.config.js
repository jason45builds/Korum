const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@korum/types": path.resolve(__dirname, "../../packages/types"),
      "@korum/utils": path.resolve(__dirname, "../../packages/utils"),
      "@korum/config": path.resolve(__dirname, "../../packages/config"),
      "@korum/ui": path.resolve(__dirname, "../../packages/ui/index.ts"),
    };
    return config;
  },
};

module.exports = nextConfig;
