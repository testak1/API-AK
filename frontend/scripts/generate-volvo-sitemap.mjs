import {readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const projectId = process.env.SANITY_PROJECT_ID || "wensahkh";
const dataset = process.env.SANITY_DATASET || "production";
const apiVersion = "2025-04-23";
const baseUrl = "https://tuning.aktuning.se";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public", "sitemap-volvo.xml");

const query = `*[
  _type == "brand" && lower(name) == "volvo" &&
  !(_id in path("drafts.**"))
][0]{
  name, slug,
  models[]{name,slug,years[]{range,slug,engines[]{label,slug,stages[]{name}}}}
}`;

const slugValue = value => {
  if (typeof value === "string") return value;
  if (value && typeof value.current === "string") return value.current;
  return "";
};

const slugify = value =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/->/g, "-")
    .replace(/>/g, "-")
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

const segment = (slug, fallback) => slugify(slugValue(slug) || fallback);
const escapeXml = value =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const endpoint = new URL(
  `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`
);
endpoint.searchParams.set("query", query);

const response = await fetch(endpoint);
if (!response.ok) throw new Error(`Sanity query failed: ${response.status}`);
const brand = (await response.json()).result;
if (!brand) throw new Error("Published Volvo document was not found");

const urls = new Set();
const brandUrl = `${baseUrl}/${segment(brand.slug, brand.name)}`;
urls.add(brandUrl);

for (const model of brand.models || []) {
  const modelUrl = `${brandUrl}/${segment(model.slug, model.name)}`;
  urls.add(modelUrl);

  for (const year of model.years || []) {
    const yearUrl = `${modelUrl}/${segment(year.slug, year.range)}`;
    urls.add(yearUrl);

    for (const engine of year.engines || []) {
      const engineUrl = `${yearUrl}/${segment(engine.slug, engine.label)}`;
      urls.add(engineUrl);

      for (const stage of engine.stages || []) {
        const stageSlug = slugify(stage.name);
        if (stageSlug) urls.add(`${engineUrl}/${stageSlug}`);
      }
    }
  }
}

const previous = await readFile(output, "utf8").catch(() => "");
const previousLastmod = previous.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
const lastmod = process.env.SITEMAP_LASTMOD || previousLastmod || new Date().toISOString();
const body = [...urls]
  .sort()
  .map(
    url =>
      `<url><loc>${escapeXml(url)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`
  )
  .join("\n");

await writeFile(
  output,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
);

console.log(`Wrote ${urls.size} Volvo URLs to ${output}`);
