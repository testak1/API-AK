import {createClient} from "@sanity/client";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "wensahkh",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-10-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});
