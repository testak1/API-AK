/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
 
      },
       {
        protocol: "https",
        hostname: "tuning.aktuning.se",
      },
    ],
  },
  reactStrictMode: true,
  env: {
    SANITY_PROJECT_ID: "dinSanityProjectId",
    SANITY_DATASET: "production",
    NEXT_PUBLIC_API_BASE: "https://api.aktuning.se",
  },
};

module.exports = nextConfig;
