import {NextApiRequest, NextApiResponse} from "next";
import {addEngine} from "@/lib/sanityImport";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  const {imports} = req.body;
  if (!imports || !Array.isArray(imports))
    return res.status(400).json({error: "Missing imports"});

  const results = [];
  for (const imp of imports) {
    try {
      await addEngine(imp.brand, imp.model, imp.year, imp.data);
      results.push({engine: imp.engine, status: "ok"});
    } catch (err: any) {
      results.push({engine: imp.engine, status: "fail", message: err.message});
    }
  }

  res.json({results});
}
