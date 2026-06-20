export type WorkshopService = {
  slug: string;
  title: string;
  description: string;
  seoDescription: string;
  heroImage: string;
};

const stationNames: Record<string, string> = {
  goteborg: "Göteborg",
  jonkoping: "Jönköping",
  skane: "Malmö",
  stockholm: "Stockholm",
  orebro: "Örebro",
};

const fullWorkshopServices = (city: string): WorkshopService[] => [
  {
    slug: "oljeservice",
    title: "Oljeservice",
    description: `Oljeservice på plats hos AK-TUNING ${city}.`,
    seoDescription: `Oljeservice i ${city} med personlig service på verkstaden.`,
    heroImage: "/images/workshop/oljeservice-hero.webp",
  },
  {
    slug: "felsokning",
    title: "Felsökning",
    description: "Felsökning för att hjälpa dig vidare med din bil.",
    seoDescription: `Felsökning av bil i ${city}. Vi hjälper dig att komma vidare med rätt underlag för nästa steg.`,
    heroImage: "/images/workshop/felsokning-hero.webp",
  },
  {
    slug: "bromsbyte",
    title: "Bromsbyte",
    description: `Bromsbyte utfört på verkstaden i ${city}.`,
    seoDescription: `Bromsbyte i ${city} hos AK-TUNING. Kontakta verkstaden för att planera arbetet.`,
    heroImage: "/images/workshop/bromsbyte-hero.webp",
  },
  {
    slug: "montering-avgassystem",
    title: "Montering av avgassystem",
    description: "Montering av avgassystem på plats.",
    seoDescription: `Montering av avgassystem i ${city}. Boka tid hos AK-TUNING.`,
    heroImage: "/images/workshop/montering-avgassystem-hero.webp",
  },
  {
    slug: "custombyggda-avgassystem",
    title: "Custombyggda avgassystem",
    description: "Custombyggda avgassystem, byggda på plats i verkstaden.",
    seoDescription: `Custombyggda avgassystem i ${city}, byggda på plats hos AK-TUNING.`,
    heroImage: "/images/workshop/custombyggda-avgassystem-hero.webp",
  },
];

const workshopServicesByStation: Record<string, WorkshopService[]> = {
  goteborg: fullWorkshopServices("Göteborg"),
  jonkoping: fullWorkshopServices("Jönköping"),
  skane: fullWorkshopServices("Malmö"),
  stockholm: fullWorkshopServices("Stockholm").filter(
    (service) => service.slug === "montering-avgassystem",
  ),
  orebro: fullWorkshopServices("Örebro").filter(
    (service) => service.slug === "montering-avgassystem",
  ),
};

export const getStationName = (stationSlug: string, fallback: string) =>
  stationNames[stationSlug] || fallback;

export const getWorkshopServices = (stationSlug: string) =>
  workshopServicesByStation[stationSlug] || [];

export const getWorkshopService = (stationSlug: string, serviceSlug: string) =>
  getWorkshopServices(stationSlug).find(
    (service) => service.slug === serviceSlug,
  );
