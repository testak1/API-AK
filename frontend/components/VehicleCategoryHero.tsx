import Image from "next/image";
import {needsWhiteBrandLogo} from "@/lib/brandLogo";

type VehicleCategoryHeroProps = {
  heading: string;
  eyebrow: string;
  description: string;
  imageUrl?: string | null;
  imageAlt: string;
};

export default function VehicleCategoryHero({
  heading,
  eyebrow,
  description,
  imageUrl,
  imageAlt,
}: VehicleCategoryHeroProps) {
  const sourceDimensions = imageUrl?.match(/-(\d+)x(\d+)\.(?:png|jpe?g|webp)(?:\?|$)/i);
  const isSmallSanityImage =
    Boolean(sourceDimensions) &&
    imageUrl?.startsWith("https://cdn.sanity.io/images/wensahkh/production/");
  const sanityAsset = isSmallSanityImage
    ? imageUrl?.split("/").pop()?.split("?")[0]
    : null;
  const renderedImageUrl = isSmallSanityImage
    ? `/api/hero-image?asset=${encodeURIComponent(sanityAsset || "")}`
    : imageUrl;
  const logoSlug = renderedImageUrl?.match(/\/brand-logos-png\/([^/.]+)\.png/)?.[1];
  const useWhiteLogo = logoSlug ? needsWhiteBrandLogo(logoSlug) : false;

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-950 via-gray-900 to-red-950 px-6 py-7 text-white shadow-lg sm:px-8 sm:py-9">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.2),transparent_68%)]"
      />
      <div className="relative grid items-center gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-red-400">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
            {description}
          </p>
        </div>
        {renderedImageUrl && (
          <div className="relative flex min-h-32 items-center justify-center md:min-h-40">
            <Image
              src={renderedImageUrl}
              alt={imageAlt}
              width={840}
              height={360}
              sizes="(max-width: 767px) 80vw, 420px"
              quality={100}
              unoptimized={isSmallSanityImage}
              className={`h-40 w-full max-w-[420px] object-contain drop-shadow-2xl ${
                useWhiteLogo ? "brightness-0 invert" : ""
              }`}
              priority
            />
          </div>
        )}
      </div>
    </section>
  );
}
