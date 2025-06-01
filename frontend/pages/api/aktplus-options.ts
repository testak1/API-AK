import type {NextApiRequest, NextApiResponse} from "next";
import client from "@/lib/sanity";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const lang = (req.query.lang as string) || "sv"; // fallback till svenska

  try {
    const aktPlusOptions = await client.fetch(
      `*[_type == "aktPlus"]{
        _id,
        title,
        price,
        isUniversal,
        applicableFuelTypes,
        stageCompatibility,
        manualAssignments[] { _ref },
        compatibilityNotes,
        description,
        "gallery": gallery[]{
          _key,
          alt,
          caption,
          "asset": asset->{
            _id,
            url
          }
        }
      }`,
      {lang}
    );

    res.status(200).json({options: aktPlusOptions});
  } catch (error) {
    console.error("AKT+ API Error", error);
    res.status(500).json({error: "Could not fetch AKT+ options"});
  }
}
