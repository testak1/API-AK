// pages/sitemap.xml.ts
import { GetServerSideProps } from "next";
import { createClient } from "next-sanity";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  apiVersion: "2025-04-23",
  useCdn: false,
});

const query = `
*[_type == "brand"]{
  "brandSlug": slug.current,
  name,
  "models": models[]{
    name,
    "modelSlug": slug.current,
    "years": years[]{
      range,
      "engines": engines[]{
        label,
        _updatedAt
      }
    }
  }
}
`;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const data = await client.fetch(query);
  const baseUrl = "https://tuning.aktuning.se";

  const urls: string[] = [];

  data.forEach((brand: any) => {
    brand.models?.forEach((model: any) => {
      const modelSlug =
        typeof model.modelSlug === "string"
          ? model.modelSlug
          : model.name.toLowerCase().replace(/\s+/g, "-");

      model.years?.forEach((year: any) => {
        const yearSlug = year.range.replace(/\s+/g, "-");

        year.engines?.forEach((engine: any) => {
          const engineSlug = engine.label.replace(/\s+/g, "-");
          const loc = `${baseUrl}/${brand.brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`;
          const lastmod = new Date(engine._updatedAt || Date.now())
            .toISOString()
            .split("T")[0];

          urls.push(
            `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
          );
        });
      });
    });
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "no-store");
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
