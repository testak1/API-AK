import type {NextApiRequest, NextApiResponse} from "next";
import {readFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {getModelImageUrl} from "@/lib/server/modelImage";

const first = (value: string | string[] | undefined, fallback = "") =>
  (Array.isArray(value) ? value[0] : value || fallback).slice(0, 80);

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, character => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });

const numericLabel = (value: string, unit: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? `${parsed} ${unit}` : "–";
};

async function findModelImage(brand: string, model: string) {
  if (!brand || !model) return null;

  try {
    const modelImageUrl = await getModelImageUrl(brand, model);
    if (!modelImageUrl) return null;
    const imageUrl = new URL(modelImageUrl);
    if (imageUrl.hostname !== "cdn.sanity.io") return null;

    const response = await fetch(imageUrl, {signal: AbortSignal.timeout(5000)});
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const brand = first(request.query.brand, "Motoroptimering");
  const model = first(request.query.model);
  const stage = first(request.query.stage, "Motoroptimering");
  const originalHk = first(request.query.originalHk);
  const tunedHk = first(request.query.tunedHk);
  const originalNm = first(request.query.originalNm);
  const tunedNm = first(request.query.tunedNm);

  const vehicleName = [brand, model].filter(Boolean).join(" ").toUpperCase();
  const hasPower = Boolean(originalHk && tunedHk);
  const subtitle = stage.toUpperCase();
  const logo = await readFile(
    path.join(process.cwd(), "public", "ak-logo.png"),
  );
  const modelImage = await findModelImage(brand, model);

  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#090b0f"/>
          <stop offset="1" stop-color="#1b1f25"/>
        </linearGradient>
        <linearGradient id="red" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#b40000"/>
          <stop offset="1" stop-color="#ef1b24"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#background)"/>
      <path d="M820 0 L1200 0 L1200 630 L1010 630 Z" fill="#a50000" opacity="0.12"/>
      <g opacity="0.16" stroke="#d6d9df" stroke-width="1">
        <path d="M660 110 H1160 M660 170 H1160 M660 230 H1160 M660 290 H1160 M660 350 H1160 M660 410 H1160"/>
        <path d="M700 80 V450 M790 80 V450 M880 80 V450 M970 80 V450 M1060 80 V450 M1150 80 V450"/>
      </g>
      <path d="M650 390 C760 365 785 225 885 210 C975 198 1030 128 1165 145" fill="none" stroke="#ef1b24" stroke-width="7" opacity="0.9"/>
      <path d="M650 420 C740 395 810 310 900 292 C1015 270 1080 230 1165 245" fill="none" stroke="#d7d9de" stroke-width="5" opacity="0.65"/>
      <rect x="58" y="286" width="520" height="5" rx="2" fill="url(#red)"/>
      <text x="58" y="220" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800">${escapeXml(vehicleName)}</text>
      <text x="58" y="270" fill="#ef1b24" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="2">${escapeXml(subtitle)}</text>
      ${
        hasPower
          ? `<text x="58" y="355" fill="#b8bec7" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="700">ORIGINAL</text>
             <text x="58" y="410" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">${numericLabel(originalHk, "HK")}</text>
             <text x="315" y="355" fill="#b8bec7" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="700">OPTIMERAD</text>
             <text x="315" y="410" fill="#ef1b24" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">${numericLabel(tunedHk, "HK")}</text>
             <text x="58" y="462" fill="#d7d9de" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700">${numericLabel(originalNm, "NM")}  →  ${numericLabel(tunedNm, "NM")}</text>`
          : `<text x="58" y="365" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">MER EFFEKT · HÖGRE VRIDMOMENT</text>
             <text x="58" y="414" fill="#b8bec7" font-family="Arial, Helvetica, sans-serif" font-size="25">Skräddarsydd mjukvara för din bil</text>`
      }
      <text x="58" y="570" fill="#8f969f" font-family="Arial, Helvetica, sans-serif" font-size="20">AK-TUNING · tuning.aktuning.se</text>
    </svg>`;

  const composites = [
    {input: await sharp(logo).resize(125, 125, {fit: "contain"}).png().toBuffer(), top: 28, left: 55},
    ...(modelImage
      ? [
          {
            input: await sharp(modelImage)
              .resize(555, 250, {
                fit: "contain",
                withoutEnlargement: false,
                background: {r: 0, g: 0, b: 0, alpha: 0},
              })
              .png()
              .toBuffer(),
            top: 330,
            left: 620,
          },
        ]
      : []),
  ];

  const image = await sharp(Buffer.from(svg)).composite(composites).png().toBuffer();

  response.setHeader("Content-Type", "image/png");
  response.setHeader(
    "Cache-Control",
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
  );
  response.status(200).send(image);
}
