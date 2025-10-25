import {createClient} from "@sanity/client";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "wensahkh",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-10-01",
  useCdn: false,
  token:
    "skmYdIDhPMyCsRpXlAXoEO3ahDnwvWnU8QI0MS5lxi5JLWM1ccqJLQzSkZpXUm357ftDEvETC3n7DmgJmuBKirFSAf0zRJxrGyTPT05JXRybiR7dydizhaSDNb7vNZOfpX1ttFDkHMX2ueQlMTp1HHoupyXGm0nbPkFPk8TKjkzMJ7i9FZsK",
});
