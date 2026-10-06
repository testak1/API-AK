import type {NextApiRequest, NextApiResponse} from "next";
import sharp from "sharp";

const SANITY_BASE_URL =
  "https://cdn.sanity.io/images/wensahkh/production/";
const SANITY_ASSET_PATTERN =
  /^[a-f0-9]+-\d+x\d+\.(?:png|jpe?g|webp)$/i;

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const asset = Array.isArray(request.query.asset)
    ? request.query.asset[0]
    : request.query.asset;

  if (!asset || !SANITY_ASSET_PATTERN.test(asset)) {
    return response.status(400).json({error: "Ogiltigt bild-ID"});
  }

  const sourceUrl = `${SANITY_BASE_URL}${asset}`;

  try {
    const imageResponse = await fetch(sourceUrl);
    if (!imageResponse.ok) {
      return response.status(502).json({error: "Kunde inte hämta bilden"});
    }

    const sourceBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const image = await sharp(sourceBuffer)
      .resize({
        width: 840,
        height: 360,
        fit: "inside",
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false,
      })
      .sharpen({sigma: 0.8, m1: 0.8, m2: 1.5})
      .png({quality: 100, compressionLevel: 7})
      .toBuffer();

    response.setHeader("Content-Type", "image/png");
    response.setHeader(
      "Cache-Control",
      "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
    );
    return response.status(200).send(image);
  } catch {
    return response.status(500).json({error: "Kunde inte bearbeta bilden"});
  }
}
