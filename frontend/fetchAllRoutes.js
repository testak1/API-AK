const fetch = require("node-fetch");

const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

async function fetchAllRoutes() {
  const baseUrl = "https://api.aktuning.se";
  const allRoutes = new Set();

  const brandsRes = await fetch(`${baseUrl}/api/brands`);
  const brandsJson = await brandsRes.json();
  const brands = brandsJson.result || [];

  for (const brand of brands) {
    const brandSlug = slugify(brand.slug?.current || brand.name);

    for (const model of brand.models || []) {
      const modelSlug = slugify(model.slug?.current || model.name);

      const yearsRes = await fetch(
        `${baseUrl}/api/years?brand=${encodeURIComponent(brand.name)}&model=${encodeURIComponent(model.name)}`,
      );
      const yearsJson = await yearsRes.json();
      const years = yearsJson.result || [];

      for (const year of years) {
        const yearSlug = slugify(year.range);

        const enginesRes = await fetch(
          `${baseUrl}/api/engines?brand=${encodeURIComponent(brand.name)}&model=${encodeURIComponent(model.name)}&year=${encodeURIComponent(year.range)}`,
        );
        const enginesJson = await enginesRes.json();
        const engines = enginesJson.result || [];

        for (const engine of engines) {
          const engineSlug = slugify(engine.label);
          const basePath = `/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`;

          if (Array.isArray(engine.stages) && engine.stages.length > 0) {
            for (const stage of engine.stages) {
              const stageSlug = slugify(stage.name);
              allRoutes.add(`${basePath}?stage=${stageSlug}`);
            }
          } else {
            allRoutes.add(basePath);
          }
        }
      }
    }
  }

  return Array.from(allRoutes);
}

module.exports = { fetchAllRoutes };
