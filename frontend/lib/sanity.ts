// lib/sanity.ts
import {
  createClient,
  type ClientConfig,
  type SanityClient,
} from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { Brand } from "@/types/sanity";
import { allBrandsQuery } from "../src/lib/queries";

const config: ClientConfig = {
  projectId: "wensahkh",
  dataset: "production",
  apiVersion: "2025-04-23",
  useCdn: process.env.NODE_ENV === "production",
  token: process.env.SANITY_WRITE_TOKEN,
  ignoreBrowserTokenWarning: true,
};

const client: SanityClient = createClient(config);
const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}

export async function uploadImageToSanity(base64Data: string) {
  const client = sanityClient(config);
  const result = await client.assets.upload('image', Buffer.from(base64Data, 'base64'));
  return result;
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

export default client;
