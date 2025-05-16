const { fetchAllRoutes } = require("./fetchAllRoutes");

module.exports = {
  siteUrl: "https://tuning.aktuning.se",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  additionalPaths: async () => {
    const urls = await fetchAllRoutes();
    console.log(`🧭 Genererade ${urls.length} unika dynamiska länkar`);

    return urls.map((loc) => ({
      loc: `https://tuning.aktuning.se${loc}`,
      changefreq: "weekly",
      priority: 0.9,
      lastmod: new Date().toISOString(),
    }));
  },
};
