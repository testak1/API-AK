/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["cdn.sanity.io"], // om du använder Sanity bilder
  },
  reactStrictMode: true,
  env: {
    SANITY_PROJECT_ID: "dinSanityProjectId",
    SANITY_DATASET: "production",
    NEXT_PUBLIC_API_BASE: "https://api.aktuning.se",
  },
};

module.exports = nextConfig;
