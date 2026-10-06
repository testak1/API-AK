import type {NextApiRequest, NextApiResponse} from "next";
import sharp from "sharp";

const SANITY_HOST = "cdn.sanity.io";
const SANITY_PROJECT_PATH = "/images/wensahkh/production/";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const source = Array.isArray(request.query.src)
    ? request.query.src[0]
    : request.query.src;

  if (!source) {
    return response.status(400).json({error: "Bildadress saknas"});
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return response.status(400).json({error: "Ogiltig bildadress"});
  }

  if (
    sourceUrl.protocol !== "https:" ||
    sourceUrl.hostname !== SANITY_HOST ||
    !sourceUrl.pathname.startsWith(SANITY_PROJECT_PATH)
  ) {
    return response.status(400).json({error: "Bildkällan är inte tillåten"});
  }

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
