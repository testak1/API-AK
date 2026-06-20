import { useEffect, useRef } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { PortableText } from "@portabletext/react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Clock3,
  CircleHelp,
  FileSearch,
  Gauge,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Wrench,
} from "lucide-react";
import client, { urlFor } from "@/lib/sanity";
import { stationPageQuery } from "@/src/lib/queries";
import type { Station } from "@/types/sanity";
import InstagramFeedEmbed from "@/components/InstagramFeedEmbed";
import { getStationName, getWorkshopServices } from "@/lib/workshopServices";

interface StationPageProps {
  stationData: Station;
}

export const getServerSideProps: GetServerSideProps<StationPageProps> = async (
  context,
) => {
  const station = context.params?.station as string;

  try {
    const stationData = await client.fetch(stationPageQuery, {
      station: station.toLowerCase(),
    });

    if (!stationData) return { notFound: true };

    return { props: { stationData } };
  } catch (error) {
    console.error("Station fetch failed:", error);
    return { notFound: true };
  }
};

const portableTextComponents: any = {
  types: {
    image: ({ value }: { value: any }) => (
      <img
        src={urlFor(value).width(1200).url()}
        alt={value.alt || "AK-TUNING verkstad"}
        className="my-7 w-full rounded-2xl border border-white/10"
      />
    ),
  },
  marks: {
    link: ({ children, value }: { children: React.ReactNode; value: any }) => (
      <a
        href={value.href}
        className="font-semibold text-red-400 underline decoration-red-400/50 underline-offset-4 hover:text-red-300"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  },
};

const cleanPhone = (phone: string) => phone.replace(/\s+/g, "");

const schemaDayNames: Record<string, string> = {
  Måndag: "Monday",
  Tisdag: "Tuesday",
  Onsdag: "Wednesday",
  Torsdag: "Thursday",
  Fredag: "Friday",
  Lördag: "Saturday",
  Söndag: "Sunday",
};

export default function MotoroptimeringStation({
  stationData,
}: StationPageProps) {
  const selectorRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stationName = getStationName(stationData.slug, stationData.city);
  const pageUrl = `https://tuning.aktuning.se/motoroptimering/${stationData.slug}`;
  const heroImage = stationData.featuredImage
    ? urlFor(stationData.featuredImage).width(2200).quality(85).url()
    : null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${stationData.address.street}, ${stationData.address.postalCode} ${stationName}`,
  )}`;
  const workshopServices = getWorkshopServices(stationData.slug);
  const workshopServiceNames = workshopServices
    .map((service) => service.title.toLowerCase())
    .join(", ");
  const localSeo = workshopServices.length
    ? stationData.slug === "stockholm" || stationData.slug === "orebro"
      ? {
          title: `Motoroptimering & Avgassystem i ${stationName} | AK-TUNING`,
          description: `Motoroptimering och montering av avgassystem i ${stationName}. Hitta rätt optimering för din bil och boka tid hos AK-TUNING.`,
        }
      : {
          title: `Motoroptimering & Bilverkstad i ${stationName} | AK-TUNING`,
          description: `Motoroptimering och bilverkstad i ${stationName}. Vi erbjuder ${workshopServiceNames} — samt hjälp att hitta rätt optimering för din bil.`,
        }
    : {
        title: `Motoroptimering i ${stationName} | AK-TUNING`,
        description: `Professionell motoroptimering i ${stationName}. Hitta effekt, vridmoment och pris för din bil hos AK-TUNING.`,
      };
  const faqItems = [
    {
      question: `Vad är motoroptimering?`,
      answer:
        "Motoroptimering är en anpassning av bilens motorstyrprogram. Vilka alternativ som finns beror på bil, motor och årsmodell.",
    },
    {
      question: `Hur hittar jag rätt optimering för min bil?`,
      answer:
        "Börja med att välja märke, modell och motor i bilväljaren. Därefter ser du tillgängliga alternativ och kan kontakta oss för hjälp inför bokning.",
    },
    {
      question: `Hur bokar jag motoroptimering i ${stationName}?`,
      answer: `Ring eller mejla AK-TUNING ${stationName}. Vi hjälper dig att gå igenom din bil och planera nästa steg.`,
    },
    ...(workshopServices.length
      ? [
          {
            question: `Vilka verkstadstjänster erbjuder AK-TUNING ${stationName}?`,
            answer: `${workshopServiceNames}. Kontakta verkstaden för att prata om din bil och boka tid.`,
          },
        ]
      : []),
    {
      question: `Vilken trygghet ingår?`,
      answer:
        "AK-TUNING erbjuder 2 års mjukvarugaranti och 30 dagars öppet köp enligt villkoren för tjänsten.",
    },
  ];
  const defaultServices = [
    {
      icon: SlidersHorizontal,
      title: "Motoroptimering",
      description:
        "Se alternativ för din motor i bilväljaren och få hjälp att välja en lösning som passar din bil.",
    },
    {
      icon: FileSearch,
      title: "Bil- & motoranalys",
      description:
        "Vi går igenom förutsättningarna för just din bil innan du bokar en tid hos verkstaden.",
    },
    {
      icon: BadgeCheck,
      title: "Rådgivning & bokning",
      description: `Prata med teamet i ${stationName} om frågor, upplägg och nästa lediga tid.`,
    },
  ];

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://api.aktuning.se" || !iframeRef.current) return;
      if (typeof event.data?.height === "number") {
        iframeRef.current.style.height = `${Math.max(180, event.data.height)}px`;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const scrollToSelector = () =>
    selectorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <Head>
        <title>{localSeo.title}</title>
        <meta name="description" content={localSeo.description} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={localSeo.title} />
        <meta property="og:description" content={localSeo.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={heroImage || "https://tuning.aktuning.se/ak-logo.png"} />
        <meta property="og:site_name" content={`AK-TUNING ${stationName}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={localSeo.title} />
        <meta name="twitter:description" content={localSeo.description} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AutomotiveBusiness",
              name: `AK-TUNING ${stationName}`,
              image: heroImage || "https://tuning.aktuning.se/ak-logo.png",
              "@id": pageUrl,
              url: pageUrl,
              telephone: stationData.phone,
              email: stationData.email,
              address: {
                "@type": "PostalAddress",
                streetAddress: stationData.address.street,
                addressLocality: stationName,
                postalCode: stationData.address.postalCode,
                addressCountry: "SE",
              },
              openingHoursSpecification: stationData.openingHours?.map(
                (hours) => ({
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: hours.days
                    .map((day) => schemaDayNames[day])
                    .filter(Boolean),
                  opens: hours.open,
                  closes: hours.close,
                }),
              ),
              ...(workshopServices.length
                ? {
                    hasOfferCatalog: {
                      "@type": "OfferCatalog",
                      name: `Verkstadstjänster i ${stationName}`,
                      itemListElement: workshopServices.map((service) => ({
                        "@type": "Offer",
                        itemOffered: {
                          "@type": "Service",
                          name: service.title,
                          description: service.description,
                        },
                      })),
                    },
                  }
                : {}),
              sameAs: [stationData.facebook, stationData.instagram].filter(Boolean),
            }),
          }}
        />
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
                  name: "AK-TUNING",
                  item: "https://tuning.aktuning.se/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: `Motoroptimering ${stationName}`,
                  item: pageUrl,
                },
              ],
            }),
          }}
        />
      </Head>

      <main className="min-h-screen overflow-hidden bg-[#090909] text-white selection:bg-red-500 selection:text-white">
        <section className="relative isolate border-b border-white/10 bg-[#111]">
          {heroImage && (
            <img
              src={heroImage}
              alt={`AK-TUNING ${stationName}`}
              className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45"
            />
          )}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(9,9,9,.98)_0%,rgba(9,9,9,.88)_47%,rgba(9,9,9,.48)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,rgba(220,38,38,.23),transparent_27rem)]" />

          <div className="mx-auto max-w-7xl px-5 pb-16 pt-5 sm:px-8 sm:pb-24 lg:px-10 lg:pb-28">
            <nav className="flex items-center justify-between" aria-label="Brödsmulor">
              <Link href="/" className="text-sm font-bold tracking-[0.2em] text-white hover:text-red-400">
                AK<span className="text-red-500">-</span>TUNING
              </Link>
              <a href={`tel:${cleanPhone(stationData.phone)}`} className="hidden items-center gap-2 text-sm font-medium text-white/80 hover:text-white sm:flex">
                <Phone className="h-4 w-4 text-red-400" /> {stationData.phone}
              </a>
            </nav>

            <div className="max-w-3xl pb-4 pt-20 sm:pt-28 lg:pt-36">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                <MapPin className="h-3.5 w-3.5 text-red-400" /> AK-TUNING {stationName}
              </div>
              <h1 className="max-w-3xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-8xl">
                Mer av din <span className="text-red-500">bil.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
                Hitta rätt motoroptimering för din bil och få hjälp av teamet i {stationName}.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={scrollToSelector} className="group inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-7 py-4 text-sm font-extrabold uppercase tracking-wide transition hover:bg-red-500">
                  Hitta din bil <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <a href={`tel:${cleanPhone(stationData.phone)}`} className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 bg-black/20 px-7 py-4 text-sm font-bold transition hover:border-white/45 hover:bg-white/10">
                  <Phone className="h-4 w-4" /> Ring {stationData.phone}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0d0d0d]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-10">
            {[
              [ShieldCheck, "2 års mjukvarugaranti"],
              [Check, "30 dagars öppet köp"],
              [Wrench, "Lokal verkstad i " + stationName],
            ].map(([Icon, text]) => {
              const FeatureIcon = Icon as typeof ShieldCheck;
              return <div key={text as string} className="flex items-center justify-center gap-3 px-4 py-5 text-sm font-semibold text-white/80"><FeatureIcon className="h-5 w-5 text-red-500" />{text as string}</div>;
            })}
          </div>
        </section>

        <nav className="sticky top-0 z-30 hidden border-b border-white/10 bg-[#090909]/95 backdrop-blur lg:block" aria-label="Sidnavigering">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-10 py-3">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/45">Motoroptimering · {stationName}</span>
            <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wide text-white/70">
              <a href="#tjanster" className="transition hover:text-red-400">Tjänster</a>
              <a href="#verkstad" className="transition hover:text-red-400">Verkstad</a>
              <a href="#fragor" className="transition hover:text-red-400">Frågor & svar</a>
              <button type="button" onClick={scrollToSelector} className="rounded-full bg-red-600 px-4 py-2 text-white transition hover:bg-red-500">Hitta din bil</button>
            </div>
          </div>
        </nav>

        <section ref={selectorRef} className="scroll-mt-6 bg-[#f4f1eb] px-5 py-16 text-[#121212] sm:px-8 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-600">Börja här</p>
                <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.04em] sm:text-5xl">Vad kan din bil få?</h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-black/60">Välj märke, modell och motor. Du ser vilka alternativ som finns för just din bil.</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_25px_70px_rgba(0,0,0,.12)]">
              <iframe ref={iframeRef} title="Hitta motoroptimering för din bil" src="https://api.aktuning.se/embed" className="block w-full border-0" style={{ height: "180px" }} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">Enkelt från start till mål</p>
              <h2 className="mt-4 text-4xl font-black uppercase leading-[.95] tracking-[-0.045em] sm:text-5xl">Så fungerar det.</h2>
              <p className="mt-6 max-w-md leading-relaxed text-white/60">Vi hjälper dig hitta en lösning som passar din bil, dina mål och din vardag.</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {[['01', 'Hitta din bil', 'Välj märke, modell och motor i vår bilväljare.'], ['02', 'Välj rätt nivå', 'Se tillgängliga alternativ och jämför vad som passar dig.'], ['03', 'Boka hos oss', `Kontakta AK-TUNING ${stationName} så planerar vi nästa steg.`]].map(([number, title, text]) => (
                <li key={number} className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
                  <span className="text-sm font-black text-red-500">{number}</span>
                  <h3 className="mt-9 text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {(stationData.content || stationData.gallery?.length) && (
          <section id="verkstad" className="scroll-mt-20 border-y border-white/10 bg-[#121212] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
            <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">Din lokala verkstad</p>
                <h2 className="mt-4 text-4xl font-black uppercase leading-[.95] tracking-[-0.045em] sm:text-5xl">AK-TUNING<br />{stationName}</h2>
                {stationData.content && <div className="prose prose-invert mt-8 max-w-none text-white/70"><PortableText value={stationData.content} components={portableTextComponents} /></div>}
              </div>
              {stationData.gallery && stationData.gallery.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {stationData.gallery.slice(0, 3).map((image, index) => (
                    <div key={`${image.asset._ref}-${index}`} className={`overflow-hidden rounded-2xl bg-white/5 ${index === 0 ? "col-span-2" : ""}`}>
                      <img src={urlFor(image).width(index === 0 ? 1400 : 800).url()} alt={image.alt || `AK-TUNING ${stationName} verkstad`} className={`w-full object-cover transition duration-700 hover:scale-105 ${index === 0 ? "h-72 sm:h-96" : "h-44 sm:h-56"}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section id="tjanster" className="scroll-mt-20 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">På verkstaden</p><h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.045em] sm:text-5xl">Tjänster med<br />din bil i centrum.</h2></div>
            <p className="max-w-sm text-sm leading-relaxed text-white/55">Vi börjar alltid med bilens faktiska förutsättningar. Det gör valet enklare och samtalet mer konkret.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stationData.services?.length ? stationData.services.map((service, index) => <article key={`${service.title}-${index}`} className="group rounded-2xl border border-white/10 bg-white/[.035] p-7 transition hover:-translate-y-1 hover:border-red-500/60 hover:bg-white/[.06]"><Gauge className="h-6 w-6 text-red-500" /><p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-white/35">0{index + 1}</p><h3 className="mt-2 text-xl font-bold">{service.title}</h3><div className="prose prose-invert mt-3 text-sm text-white/55"><PortableText value={service.description} components={portableTextComponents} /></div></article>) : defaultServices.map(({ icon: Icon, title, description }, index) => <article key={title} className="group rounded-2xl border border-white/10 bg-white/[.035] p-7 transition hover:-translate-y-1 hover:border-red-500/60 hover:bg-white/[.06]"><Icon className="h-6 w-6 text-red-500" /><p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-white/35">0{index + 1}</p><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-white/55">{description}</p></article>)}
          </div>
        </section>

        {workshopServices.length > 0 && (
          <section className="relative isolate overflow-hidden bg-[#df2020] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_86%_16%,rgba(255,255,255,.16),transparent_24rem)]" />
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 grid gap-5 md:grid-cols-[1fr_.7fr] md:items-end">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">Mer än optimering</p>
                  <h2 className="mt-4 text-4xl font-black uppercase leading-[.92] tracking-[-0.05em] sm:text-6xl">Verkstadstjänster<br />i {stationName}.</h2>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-white/75">Behöver bilen något mer än rätt mjukvara? Vårt team i {stationName} hjälper även till med utvalda verkstadstjänster.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workshopServices.map((service, index) => (
                  <Link key={service.slug} href={`/bilverkstad/${stationData.slug}/${service.slug}`} className="group rounded-2xl border border-white/10 bg-[#111] p-7 transition duration-300 hover:-translate-y-1 hover:bg-black">
                    <div className="flex items-start justify-between gap-4"><Wrench className="h-6 w-6 text-red-500" /><span className="text-xs font-black text-white/35">0{index + 1}</span></div>
                    <h3 className="mt-12 text-2xl font-black leading-tight tracking-[-0.03em]">{service.title}</h3>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">{service.description}</p>
                    <span className="mt-7 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-white transition group-hover:text-red-400">Läs mer <ArrowRight className="h-3.5 w-3.5" /></span>
                  </Link>
                ))}
              </div>
              <div className="mt-8 flex flex-col justify-between gap-4 border-t border-white/25 pt-7 sm:flex-row sm:items-center">
                <p className="text-sm text-white/75">Vill du boka eller fråga om en specifik tjänst?</p>
                <a href={`tel:${cleanPhone(stationData.phone)}`} className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide hover:text-white/75"><Phone className="h-4 w-4" /> Ring {stationData.phone} <ArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
          </section>
        )}

        <section id="fragor" className="scroll-mt-20 border-y border-white/10 bg-[#121212] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-20"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">Bra att veta</p><h2 className="mt-4 text-4xl font-black uppercase leading-[.95] tracking-[-0.045em] sm:text-5xl">Frågor innan<br />du bokar?</h2><p className="mt-6 max-w-sm leading-relaxed text-white/55">Här är svaren på det vanligaste. Hittar du inte det du söker, ring oss så hjälper vi dig.</p><a href={`tel:${cleanPhone(stationData.phone)}`} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-red-400"><Phone className="h-4 w-4 text-red-500" /> {stationData.phone}</a></div><div className="divide-y divide-white/10 border-y border-white/10">{faqItems.map((item, index) => <details key={item.question} className="group py-5" open={index === 0}><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-bold"><span>{item.question}</span><CircleHelp className="h-5 w-5 shrink-0 text-red-500 transition-transform group-open:rotate-180" /></summary><p className="max-w-2xl pt-4 pr-8 text-sm leading-relaxed text-white/60">{item.answer}</p></details>)}</div></div>
        </section>

        {stationData.testimonials?.length > 0 && (
          <section className="bg-[#e02828] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-28">
            <div className="mx-auto max-w-7xl"><div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">Kundupplevelser</p><h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.045em] sm:text-5xl">Ord från vägen.</h2></div><Star className="h-10 w-10 fill-white text-white" /></div><div className="grid gap-4 md:grid-cols-3">{stationData.testimonials.slice(0, 3).map((testimonial, index) => <figure key={`${testimonial.name}-${index}`} className="flex flex-col rounded-2xl bg-black/15 p-7"><blockquote className="text-lg font-medium leading-relaxed">“{testimonial.quote}”</blockquote><figcaption className="mt-8 text-sm text-white/75"><span className="block font-bold text-white">{testimonial.name}</span>{testimonial.vehicle}</figcaption></figure>)}</div></div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid overflow-hidden rounded-3xl border border-white/10 bg-[#121212] lg:grid-cols-[.8fr_1.2fr]">
            <div className="p-8 sm:p-12"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">Hitta hit</p><h2 className="mt-4 text-4xl font-black uppercase leading-[.95] tracking-[-0.045em]">Besök oss i<br />{stationName}.</h2><div className="mt-10 space-y-5 text-white/65"><a href={mapUrl} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:text-white"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-red-500" /><span>{stationData.address.street}<br />{stationData.address.postalCode} {stationName}</span></a><a href={`tel:${cleanPhone(stationData.phone)}`} className="flex items-center gap-3 hover:text-white"><Phone className="h-5 w-5 shrink-0 text-red-500" />{stationData.phone}</a><a href={`mailto:${stationData.email}`} className="flex items-center gap-3 break-all hover:text-white"><Mail className="h-5 w-5 shrink-0 text-red-500" />{stationData.email}</a></div>{stationData.openingHours?.length > 0 && <div className="mt-10 border-t border-white/10 pt-7"><div className="mb-4 flex items-center gap-2 text-sm font-bold"><Clock3 className="h-4 w-4 text-red-500" /> Öppettider</div><div className="space-y-2 text-sm text-white/60">{stationData.openingHours.flatMap((hours, index) => hours.days.map(day => <div key={`${day}-${index}`} className="flex justify-between gap-4"><span>{day}</span><span>{hours.open}–{hours.close}</span></div>))}</div></div>}</div>
            <div className="min-h-[360px] bg-white/5"><iframe title={`Karta till AK-TUNING ${stationName}`} src={stationData.google} className="h-full min-h-[360px] w-full border-0 grayscale contrast-125" loading="lazy" allowFullScreen /></div>
          </div>
        </section>

        {stationData.brands?.length > 0 && <section className="border-t border-white/10 px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><p className="text-center text-xs font-extrabold uppercase tracking-[0.2em] text-white/40">Vi arbetar med de flesta bilmärken</p><div className="mt-9 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-5 lg:grid-cols-8">{stationData.brands.filter(brand => !brand.name.includes("[LASTBIL] - VOLVO")).map(brand => <div key={brand._id} className="flex h-20 items-center justify-center bg-[#090909] p-3">{brand.logo?.asset?.url ? <img src={urlFor(brand.logo).width(140).url()} alt={brand.logo.alt || brand.name} className="max-h-8 max-w-full object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" /> : <span className="text-center text-xs text-white/50">{brand.name}</span>}</div>)}</div></div></section>}

        {stationData.elfsightWidgetId && <section className="border-t border-white/10 bg-[#121212] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><p className="mb-6 text-xs font-extrabold uppercase tracking-[0.2em] text-red-500">Följ vår vardag</p><InstagramFeedEmbed widgetId={stationData.elfsightWidgetId} /></div></section>}

        <section className="bg-[#f4f1eb] px-5 py-16 text-[#111] sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-600">Nästa steg</p><h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.045em] sm:text-5xl">Låt oss hitta rätt<br />för din bil.</h2></div><button type="button" onClick={scrollToSelector} className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#111] px-7 py-4 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-red-600">Se alternativ <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-1" /></button></div></section>
      </main>
    </>
  );
}
