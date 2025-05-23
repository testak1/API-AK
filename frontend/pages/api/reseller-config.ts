import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const { resellerId } = req.query;

  if (!resellerId) {
    return res.status(400).json({ error: "Missing resellerId" });
  }

  try {
    const result = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]{
        logo,
        language,
        theme
      }`,
      { resellerId },
    );

    return res.status(200).json(result || {});
  } catch (error) {
    console.error("Failed to fetch reseller config:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
