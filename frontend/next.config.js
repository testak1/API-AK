/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    qualities: [75, 100],
    localPatterns: [
      {
        pathname: "/api/hero-image",
      },
      {
        pathname: "/brand-logos-png/**",
      },
      {
        pathname: "/ak-logo.png",
      },
      {
        pathname: "/ak-logo2.png",
      },
      {
        pathname: "/badges/**",
      },
      {
        pathname: "/logos/**",
      },
      {
        pathname: "/flags/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "tuning.aktuning.se",
      },
    ],

    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
  },
  reactStrictMode: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  env: {
    SANITY_PROJECT_ID: "wensahkh",
    SANITY_DATASET: "production",
    NEXT_PUBLIC_API_BASE: "https://api.aktuning.se",
  },

  async headers() {
    return [
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "text/plain",
          },
        ],
      },
      {
        source: "/sitemap-:slug.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/xml",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
