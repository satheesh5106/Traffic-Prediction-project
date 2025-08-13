/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'three': 'three',
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
