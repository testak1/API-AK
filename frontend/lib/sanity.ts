import {
  createClient,
  type ClientConfig,
  type SanityClient,
} from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { Brand } from "@/types/sanity";
import { allBrandsQuery } from "../src/lib/queries";

// Dynamiskt token (bara vid behov)
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN;

const config: ClientConfig = {
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  apiVersion: process.env.SANITY_API_VERSION || "2025-04-23",
  useCdn: !token, // Använd CDN om inget token finns (för read)
  token: token,
  ignoreBrowserTokenWarning: true,
};

const client: SanityClient = createClient(config);
const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}

export async function getAllBrandsWithDetails(): Promise<Brand[]> {
  try {
    const results = await client.fetch<Brand[]>(allBrandsQuery);
    if (!Array.isArray(results))
      throw new Error("Invalid format received from Sanity");
    return results;
  } catch (error) {
    console.error("Error fetching brands:", error);
    throw new Error("Failed to load brand data");
  }
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const query = `*[_type == "brand" && slug.current == $slug][0]`;
  return client.fetch<Brand | null>(query, { slug });
}

export async function uploadImageToSanity(base64Data: string) {
  try {
    const result = await client.assets.upload(
      "image",
      Buffer.from(base64Data, "base64")
    );
    return result;
  } catch (error) {
    console.error("Error uploading image to Sanity:", error);
    throw new Error("Failed to upload image");
  }
}

export default client;
