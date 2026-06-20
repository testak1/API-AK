import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Wrench,
} from "lucide-react";
import client, { urlFor } from "@/lib/sanity";
import { stationPageQuery } from "@/src/lib/queries";
import type { Station } from "@/types/sanity";
import {
  getStationName,
  getWorkshopService,
  type WorkshopService,
} from "@/lib/workshopServices";

interface WorkshopServicePageProps {
  stationData: Station;
  service: WorkshopService;
}

export const getServerSideProps: GetServerSideProps<WorkshopServicePageProps> = async (
  context,
) => {
  const stationSlug = context.params?.station as string;
  const serviceSlug = context.params?.service as string;

  if (!stationSlug || !serviceSlug) return { notFound: true };

  const service = getWorkshopService(stationSlug, serviceSlug);
  if (!service) return { notFound: true };

  try {
    const stationData = await client.fetch(stationPageQuery, {
      station: stationSlug.toLowerCase(),
    });

    if (!stationData) return { notFound: true };
    return { props: { stationData, service } };
  } catch (error) {
    console.error("Workshop service fetch failed:", error);
    return { notFound: true };
  }
};

const cleanPhone = (phone: string) => phone.replace(/\s+/g, "");

export default function WorkshopServicePage({
  stationData,
  service,
}: WorkshopServicePageProps) {
  const stationName = getStationName(stationData.slug, stationData.city);
  const pageTitle = `${service.title} i ${stationName} | AK-TUNING`;
  const pageDescription = `${service.seoDescription} Kontakta AK-TUNING ${stationName} för frågor och bokning.`;
  const pageUrl = `https://tuning.aktuning.se/bilverkstad/${stationData.slug}/${service.slug}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${stationData.address.street}, ${stationData.address.postalCode} ${stationName}`,
  )}`;
  const bookingHref = `tel:${cleanPhone(stationData.phone)}`;
  const stationImage = stationData.featuredImage || stationData.gallery?.[0];
  const serviceImageUrl =
    service.heroImage ||
    (stationImage ? urlFor(stationImage).width(2200).quality(85).url() : null);
  const socialImageUrl = serviceImageUrl?.startsWith("/")
    ? `https://tuning.aktuning.se${serviceImageUrl}`
    : serviceImageUrl;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={socialImageUrl || "https://tuning.aktuning.se/ak-logo.png"} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: `${service.title} i ${stationName}`,
              description: service.seoDescription,
              url: pageUrl,
              areaServed: { "@type": "City", name: stationName },
              provider: {
                "@type": "AutomotiveBusiness",
                name: `AK-TUNING ${stationName}`,
                telephone: stationData.phone,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: stationData.address.street,
                  addressLocality: stationName,
                  postalCode: stationData.address.postalCode,
                  addressCountry: "SE",
                },
              },
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
                { "@type": "ListItem", position: 1, name: "AK-TUNING", item: "https://tuning.aktuning.se/" },
                { "@type": "ListItem", position: 2, name: `Bilverkstad ${stationName}`, item: `https://tuning.aktuning.se/motoroptimering/${stationData.slug}` },
                { "@type": "ListItem", position: 3, name: service.title, item: pageUrl },
              ],
            }),
          }}
        />
      </Head>

      <main className="min-h-screen bg-[#090909] text-white selection:bg-red-500">
        <section className="relative overflow-hidden border-b border-white/10 bg-[#121212]">
          {serviceImageUrl && <img src={serviceImageUrl} alt={`AK-TUNING ${stationName} verkstad`} className="absolute inset-0 h-full w-full object-cover opacity-35" />}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,18,18,.98)_0%,rgba(18,18,18,.88)_48%,rgba(18,18,18,.45)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_5%,rgba(225,32,32,.37),transparent_30rem)]" />
          <div className="relative mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
            <nav className="flex items-center justify-between" aria-label="Brödsmulor">
              <Link href={`/motoroptimering/${stationData.slug}`} className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-white/70 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> AK-TUNING {stationName}</Link>
              <a href={bookingHref} className="hidden items-center gap-2 text-sm font-bold sm:flex"><Phone className="h-4 w-4 text-red-400" /> {stationData.phone}</a>
            </nav>

            <div className="grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.2em] text-red-400">Bilverkstad i {stationName}</p>
                <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[.9] tracking-[-.06em] sm:text-7xl">{service.title}<br /><span className="text-red-500">i {stationName}.</span></h1>
                <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">{service.seoDescription}</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href={bookingHref} className="inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-7 py-4 text-sm font-extrabold uppercase tracking-wide transition hover:bg-red-500"><CalendarCheck className="h-4 w-4" /> Boka eller fråga</a><a href={`mailto:${stationData.email}`} className="inline-flex items-center justify-center gap-3 rounded-full border border-white/20 px-7 py-4 text-sm font-bold transition hover:bg-white/10"><Mail className="h-4 w-4" /> Mejla verkstaden</a></div>
              </div>
              <aside className="rounded-2xl border border-white/10 bg-black/25 p-7 backdrop-blur"><Wrench className="h-8 w-8 text-red-500" /><p className="mt-10 text-xs font-extrabold uppercase tracking-[.18em] text-white/45">AK-TUNING {stationName}</p><p className="mt-3 text-xl font-bold leading-snug">Vi hjälper dig vidare från fråga till bokad tid.</p><div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/60"><a className="flex gap-3 transition hover:text-white" href={mapUrl} target="_blank" rel="noopener noreferrer"><MapPin className="h-5 w-5 shrink-0 text-red-500" />{stationData.address.street}<br />{stationData.address.postalCode} {stationName}</a></div></aside>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f1eb] px-5 py-20 text-[#111] sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-red-600">Tjänsten</p><h2 className="mt-4 text-4xl font-black uppercase leading-[.94] tracking-[-.05em] sm:text-5xl">Rätt jobb.<br />Rätt verkstad.</h2></div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-3">{[["01", "Kontakta oss", "Berätta om bilen och vad du vill ha hjälp med."], ["02", "Vi går igenom", "Vi pratar igenom förutsättningarna och planerar nästa steg."], ["03", "Boka tid", "Vi hittar en tid för arbetet hos verkstaden."]].map(([number, title, description]) => <div key={number} className="bg-[#f4f1eb] p-6"><span className="text-sm font-black text-red-600">{number}</span><h3 className="mt-10 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-relaxed text-black/60">{description}</p></div>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="rounded-3xl border border-white/10 bg-[#121212] p-8 sm:p-12"><div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-red-500">Redo när du är</p><h2 className="mt-4 text-4xl font-black uppercase leading-[.94] tracking-[-.05em] sm:text-5xl">Prata med verkstaden<br />i {stationName}.</h2><p className="mt-6 max-w-xl leading-relaxed text-white/60">Ring eller mejla oss så tar vi nästa steg tillsammans. Ha gärna registreringsnummer och en kort beskrivning av bilen till hands.</p></div><a href={bookingHref} className="inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-7 py-4 text-sm font-extrabold uppercase tracking-wide transition hover:bg-red-500">Ring {stationData.phone} <ArrowRight className="h-4 w-4" /></a></div></div>
        </section>

        <section className="border-t border-white/10 px-5 py-10 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href={`/motoroptimering/${stationData.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-white/70 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Tillbaka till AK-TUNING {stationName}</Link><Link href="/" className="hidden text-sm font-bold text-white/50 transition hover:text-white sm:block">Hitta motoroptimering <ChevronRight className="inline h-4 w-4" /></Link></div></section>
      </main>
    </>
  );
}
