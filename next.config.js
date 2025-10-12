/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Only use export output for production builds, not in development
  ...(process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'production' ? {
    output: 'export',
    distDir: 'out',
  } : {}),
  trailingSlash: true,
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
