/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'tuning.aktuning.se',
      },
    ],
  },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_BASE: "https://api.aktuning.se", // ✅ This one stays
  },
};

module.exports = nextConfig;
