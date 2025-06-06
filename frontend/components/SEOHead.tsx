// components/SEOHead.tsx
import Head from "next/head";

interface SEOProps {
  canonicalUrl: string;
  pageUrl: string;
  imageUrl: string;
  pageTitle: string;
  pageDescription: string;
  brandData: any;
  modelData: any;
  yearData: any;
  engineData: any;
  mergedAktPlusOptions: any[];
  slugifyStage: (str: string) => string;
}

function extractPlainTextFromDescription(content: any): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (block._type === "block" && Array.isArray(block.children)) {
          return block.children.map((child) => child.text).join(" ");
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

export default function SEOHead({
  canonicalUrl,
  pageUrl,
  imageUrl,
  pageTitle,
  pageDescription,
  brandData,
  modelData,
  yearData,
  engineData,
  mergedAktPlusOptions,
  slugifyStage,
}: SEOProps) {
  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={canonicalUrl} />
      {/* Open Graph */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={imageUrl} />
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* Structured Data: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "AK-TUNING Motoroptimering",
            url: "https://tuning.aktuning.se",
            logo: "https://tuning.aktuning.se/ak-logo2.png",
          }),
        }}
      />

      {/* Structured Data: Samlat ItemList för alla steg + akt+ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Motoroptimering för ${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label}`,
            itemListElement: [
              // Steg 1, 2, 3, DSG m.m.
              ...[...engineData.stages]
                .sort((a, b) => {
                  const extractSortValue = (name: string) => {
                    const match = name.toLowerCase().match(/steg\s?(\d+)/);
                    return match ? parseInt(match[1], 10) : 999;
                  };
                  return extractSortValue(a.name) - extractSortValue(b.name);
                })
                .map((stage, index) => {
                  const hasPrice =
                    typeof stage.price === "number" && stage.price > 0;

                  const baseDescription = extractPlainTextFromDescription(
                    stage.descriptionRef?.description ||
                      stage.description?.["sv"] ||
                      "",
                  );

                  const fullDescription =
                    baseDescription || "Kontakta oss för offert!";

                  return {
                    "@type": "ListItem",
                    position: index + 1,
                    item: {
                      "@type": "Product",
                      name: `${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label} – ${stage.name} Mjukvara`,
                      image: [imageUrl],
                      description: hasPrice
                        ? fullDescription
                        : `${fullDescription}\nKontakta oss för offert!`,
                      brand: {
                        "@type": "Brand",
                        name: "AK-TUNING Motoroptimering",
                        logo: "https://tuning.aktuning.se/ak-logo2.png",
                      },
                      offers: hasPrice
                        ? {
                            "@type": "Offer",
                            priceCurrency: "SEK",
                            price: stage.price,
                            availability: "https://schema.org/InStock",
                            url: `${canonicalUrl}?stage=${slugifyStage(stage.name)}`,
                          }
                        : {
                            "@type": "Offer",
                            priceCurrency: "SEK",
                            price: 0, // <– Detta är viktigt för validering
                            availability: "https://schema.org/InStock",
                            url: `${canonicalUrl}?stage=${slugifyStage(stage.name)}`,
                            description: "Kontakta oss för offert",
                          },
                    },
                  };
                }),

              // Sedan: AKT+ alternativ (sorterat alfabetiskt)
              ...mergedAktPlusOptions
                .filter((opt) => {
                  const isLinkedToStage =
                    opt.manualAssignments?.some((ref) =>
                      engineData.stages?.some(
                        (stage) =>
                          ref._ref === (stage as any)._id ||
                          ref._ref === stage.name,
                      ),
                    ) ?? false;

                  const title =
                    typeof opt.title === "string"
                      ? opt.title
                      : opt.title?.sv || "";

                  return !isLinkedToStage && !/steg\s?\d+/i.test(title);
                })
                .sort((a, b) => {
                  const titleA =
                    typeof a.title === "string" ? a.title : a.title?.sv || "";
                  const titleB =
                    typeof b.title === "string" ? b.title : b.title?.sv || "";
                  return titleA.localeCompare(titleB);
                })
                .map((opt, i) => ({
                  "@type": "ListItem",
                  position: engineData.stages.length + i + 1,
                  item: {
                    "@type": "Product",
                    name: `${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label} – ${
                      typeof opt.title === "string"
                        ? opt.title
                        : opt.title?.sv || ""
                    }`,
                    ...(opt.description && {
                      description: extractPlainTextFromDescription(
                        typeof opt.description === "string"
                          ? opt.description
                          : opt.description?.sv || "",
                      ),
                    }),
                    ...(opt.gallery?.[0]?.asset?.url && {
                      image: opt.gallery[0].asset.url,
                    }),
                    ...(typeof opt.price === "number" &&
                      opt.price > 0 && {
                        offers: {
                          "@type": "Offer",
                          priceCurrency: "SEK",
                          price: opt.price,
                          availability: "https://schema.org/InStock",
                          url: canonicalUrl,
                        },
                      }),
                  },
                })),
            ],
          }),
        }}
      />

      {/* Breadcrumbs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Hem",
                item: "https://tuning.aktuning.se",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: `Motoroptimering ${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label}`,
                item: canonicalUrl,
              },
            ],
          }),
        }}
      />
    </Head>
  );
}
