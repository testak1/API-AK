/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        // Add path pattern if needed
        // pathname: '/images/**',
      },
      {
        protocol: "https",
        hostname: "tuning.aktuning.se",
      },
    ],
    minimumCacheTTL: 60, // 60 seconds minimum cache
    formats: ["image/webp"], // Enable WebP by default
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  reactStrictMode: true,
  // Enable SWC minification
  swcMinify: true,
  // Enable compression
  compress: true,
  // Add production browser source maps
  productionBrowserSourceMaps: false,
  // Environment variables
  env: {
    SANITY_PROJECT_ID: "dinSanityProjectId",
    SANITY_DATASET: "production",
    NEXT_PUBLIC_API_BASE: "https://api.aktuning.se",
  },
  // Custom headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
      // Cache static assets
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  // Enable experimental features if needed
  experimental: {
    // optimizeCss: true, // Uncomment if using CSS optimization
    // scrollRestoration: true,
    // newNextLinkBehavior: true,
  },
};

module.exports = nextConfig;
