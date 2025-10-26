// pages/api/debug/jetSkiSchema.ts
import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Testa att skapa ett enkelt Jet-Ski dokument
    const testJetSki = {
      _type: "jetSki",
      brand: "TestBrand",
      model: "TestModel",
      year: "2020-2023",
      engine: "TestEngine",
      fuelType: "gasoline",
      origHk: 150,
      tunedHk: 180,
      price: 5000,
    };

    const result = await sanityClient.create(testJetSki);

    res.json({
      success: true,
      documentId: result._id,
      message: "Test Jet-Ski created successfully",
    });

    // Rensa upp testdokumentet
    await sanityClient.delete(result._id);
  } catch (error: any) {
    console.error("Debug error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details,
    });
  }
}
