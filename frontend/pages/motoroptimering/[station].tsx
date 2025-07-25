import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import NextImage from "next/image";
import { PortableText } from "@portabletext/react";
import client from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";
import { stationPageQuery } from "@/src/lib/queries";
import { Station } from "@/types/sanity";

import InstagramFeedEmbed from "@/components/InstagramFeedEmbed";

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

    return {
      props: {
        stationData,
      },
    };
  } catch (err) {
    console.error("Station fetch failed:", err);
    return { notFound: true };
  }
};

const portableTextComponents = {
  types: {
    image: ({ value }: any) => (
      <img
        src={urlFor(value).width(800).url()}
        alt={value.alt || ""}
        className="my-4 rounded-xl shadow-lg w-full"
      />
    ),
  },
  marks: {
    link: ({ children, value }: any) => (
      <a
        href={value.href}
        className="text-red-500 hover:text-red-400 underline transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  },
};

export default function MotoroptimeringStation({
  stationData,
}: StationPageProps) {
  const pageTitle = `Motoroptimering ${stationData.city} | AK-TUNING`;
  const pageDescription = `Professionell Motoroptimering i ${stationData.city} med 2 års garanti. Boka tid för optimering av din bil hos AK-TUNING ${stationData.city} – specialister på skräddarsydd mjukvara.`;
  const pageUrl = `https://tuning.aktuning.se/motoroptimering/${stationData.slug}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta
          property="og:image"
          content="https://tuning.aktuning.se/ak-logo.png"
        />
        <meta
          property="og:site_name"
          content={`AK-TUNING ${stationData.city}`}
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta
          name="twitter:image"
          content="https://tuning.aktuning.se/ak-logo.png"
        />

        {/* LocalBusiness Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: `AK-TUNING Motoroptimering ${stationData.city}`,
              image: "https://tuning.aktuning.se/ak-logo.png",
              "@id": pageUrl,
              url: pageUrl,
              telephone: stationData.phone,
              address: {
                "@type": "PostalAddress",
                streetAddress: stationData.address.street,
                addressLocality: stationData.city,
                postalCode: stationData.address.postalCode,
                addressCountry: "SE",
              },

              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Måndag",
                    "Tisdag",
                    "Onsdag",
                    "Torsdag",
                    "Fredag",
                  ],
                  opens: "10:00",
                  closes: "19:00",
                },
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Lördag", "Söndag"],
                  opens: "10:00",
                  closes: "16:00",
                },
              ],
              sameAs: [
                stationData.facebook
                  ? `https://facebook.com/${stationData.facebook}`
                  : null,
                stationData.instagram
                  ? `https://instagram.com/${stationData.instagram}`
                  : null,
              ],
            }),
          }}
        />
      </Head>
      <div className="bg-gray-950 text-white min-h-screen">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Hero Section - Improved with better spacing */}
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden mb-16 shadow-2xl min-h-[500px]">
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10"></div>
            <div className="relative z-20 px-8 py-16 md:py-28 lg:py-32 h-full flex items-center">
              <div className="max-w-2xl">
                <div className="flex items-center mb-6">
                  <NextImage
                    src="/ak-logo.png"
                    alt="AK-TUNING"
                    width={160}
                    height={160}
                    className="w-auto"
                  />
                </div>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                  Motoroptimering i{" "}
                  <span className="text-red-500">{stationData.city}</span>
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-lg">
                  Professionell ECU tuning och prestandaoptimering hos
                  specialisterna på AK-TUNING
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href={`tel:${stationData.phone.replace(/\s+/g, "")}`}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {stationData.phone}
                  </a>
                  <a
                    href={`mailto:${stationData.email.replace(/\s+/g, "")}`}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2 uppercase"
                  >
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {stationData.email}
                  </a>
                </div>
              </div>
            </div>
            {stationData.featuredImage && (
              <img
                src={urlFor(stationData.featuredImage).width(1800).url()}
                alt={`AK-TUNING i ${stationData.city}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>

          {/* Benefits Section - Improved layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700 hover:border-red-500 transition-all hover:-translate-y-1">
              <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="text-red-500 text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                MARKNADSLEDANDE
              </h3>
              <p className="text-gray-400">
                All vår mjukvara kommer med full garanti för din trygghet och
                säkerhet.
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700 hover:border-red-500 transition-all hover:-translate-y-1">
              <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="text-red-500 text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                2 ÅRS GARANTI
              </h3>
              <p className="text-gray-400">
                Mjukvaru garanti med noggran felsökning och loggning!
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700 hover:border-red-500 transition-all hover:-translate-y-1">
              <div className="bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="text-red-500 text-2xl">🛒</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                30 DAGARS ÖPPET KÖP
              </h3>
              <p className="text-gray-400">
                Testa själv och ångra dig inom 30 dagar om du inte är helt nöjd.
              </p>
            </div>
          </div>

          {/* Premium Services Section */}
          <section className="relative py-16 bg-gradient-to-b from-gray-900 to-gray-950">
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-red-900/10 to-transparent" />
              <div className="absolute bottom-0 right-0 w-1/3 h-full bg-gradient-to-l from-red-900/10 to-transparent" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
              {/* Header with improved styling */}
              <div className="text-center mb-10">
  <h3 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
    MOTOROPTIMERING
    <span className="text-red-500"> {stationData.city}</span>
  </h3>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Professionella optimeringstjänster skräddarsydda för din bil
                </p>
              </div>

              {/* Enhanced iframe container */}
              <div className="relative bg-white rounded-2xl overflow-hidden">
                <div className="absolute pointer-events-none" />
                <iframe
                  id="aktuning-iframe"
                  src="https://api.aktuning.se/embed"
                  className="w-full border-none"
                  style={{ height: "180px" }}
                />
              </div>
            </div>
          </section>

          {/* Add this script effect using useEffect */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
    window.addEventListener("message", (event) => {
      if (!event.data) return;
      const iframe = document.getElementById("aktuning-iframe");
      
      if (typeof event.data.height === "number") {
        iframe.style.height = event.data.height + "px";
      }

      if (event.data.scrollToIframe === true) {
        const rect = iframe.getBoundingClientRect();
        const top = window.scrollY + rect.top;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });
  `,
            }}
          />

          {/* About Section - Better content visibility */}
          <section className="mb-20">
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="lg:w-1/2">
                <h2 className="text-3xl pt-2 md:text-4xl font-bold text-white mb-8">
                  VÅR ANLÄGGNING{" "}
                  <span className="text-red-500">{stationData.city}</span>
                </h2>
                <div className="prose prose-invert max-w-none text-gray-300">
                  {stationData.content && (
                    <PortableText
                      value={stationData.content}
                      components={portableTextComponents}
                    />
                  )}
                </div>
              </div>
              <div className="lg:w-1/2">
                {stationData.gallery && stationData.gallery.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {stationData.gallery.map((image, index) => (
                      <div
                        key={index}
                        className={`${index === 0 ? "col-span-2" : ""} relative rounded-xl overflow-hidden shadow-lg`}
                      >
                        <img
                          src={urlFor(image)
                            .width(index === 0 ? 1200 : 600)
                            .url()}
                          alt={`AK-TUNING ${stationData.city} verkstad ${index + 1}`}
                          className={`w-full ${index === 0 ? "h-64" : "h-48"} object-cover transition-transform hover:scale-105`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-gray-900 rounded-xl mb-20 p-6 shadow-lg">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Följ oss på <span className="text-red-500">INSTAGRAM</span>
              </h2>
            </div>
            {stationData.elfsightWidgetId && (
              <InstagramFeedEmbed widgetId={stationData.elfsightWidgetId} />
            )}
          </section>

          {/* Map Section - Better layout */}
          <section className="mb-20">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
              <div className="p-8">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Hitta till oss i{" "}
                  <span className="text-red-500">{stationData.city}</span>
                </h2>
                <p className="text-gray-400 mb-8 max-w-2xl">
                  Besök vår verkstad för en personlig konsultation och
                  professionell optimering
                </p>

                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/2">
                    <div className="bg-gray-900 rounded-xl p-6 mb-6">
                      <h3 className="text-xl font-bold text-white mb-4">
                        <span className="text-red-500">AK-TUNING</span>{" "}
                        {stationData.city}
                      </h3>
                      <div className="space-y-4 text-gray-300">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 mt-0.5 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <div>
                            <p>{stationData.address.street}</p>
                            <p>
                              {stationData.address.postalCode}{" "}
                              {stationData.city}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          <a
                            href={`tel:${stationData.phone.replace(/\s+/g, "")}`}
                            className="hover:text-red-500 transition-colors"
                          >
                            {stationData.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <a
                            href={`mailto:${stationData.email}`}
                            className="hover:text-red-500 transition-colors uppercase"
                          >
                            {stationData.email}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">
                        ÖPPETTIDER
                      </h4>
                      <ul className="space-y-3 text-gray-300">
                        {stationData.openingHours.flatMap((hours, hoursIndex) =>
                          hours.days.map((day, dayIndex) => (
                            <li
                              key={`${hoursIndex}-${dayIndex}`}
                              className="flex justify-between"
                            >
                              <span>{day}</span>
                              <span className="font-medium">
                                {hours.open} - {hours.close}
                              </span>
                            </li>
                          )),
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="md:w-1/2">
                    <div className="h-full rounded-xl overflow-hidden shadow-lg">
                      <iframe
                        src={stationData.google}
                        width="100%"
                        height="100%"
                        style={{ minHeight: "400px", border: 0 }}
                        allowFullScreen={true}
                        loading="lazy"
                      ></iframe>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials Section */}
          {stationData.testimonials && stationData.testimonials.length > 0 && (
            <section className="mb-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Vad våra <span className="text-red-500">kunder</span> säger
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Läs om upplevelserna från andra bilentusiaster
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {stationData.testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-xl border border-gray-700 hover:border-red-500 transition-all hover:-translate-y-2"
                  >
                    <div className="flex items-center mb-6">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${i < 4 ? "text-red-500" : "text-gray-700"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-300 italic mb-6">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center">
                      <div className="bg-red-500/10 p-2 rounded-full mr-4">
                        <svg
                          className="w-6 h-6 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-white">
                          {testimonial.name}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {testimonial.vehicle}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CTA Section */}
          <section className="mb-20">
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 md:p-12 text-center shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Redo att uppgradera din bil?
              </h2>
              <p className="text-red-100 mb-8 max-w-2xl mx-auto">
                Boka en tid idag och upplev skillnaden med professionell
                motoroptimering
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a
                  href={`tel:${stationData.phone.replace(/\s+/g, "")}`}
                  className="bg-red-800 hover:bg-red-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {stationData.phone}
                </a>
                <a
                  href={`mailto:${stationData.email.replace(/\s+/g, "")}`}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2 uppercase"
                >
                  <svg
                    className="w-5 h-5 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {stationData.email}
                </a>
              </div>
            </div>
          </section>

          {/* Brand Logos Section - Robust Version */}
          {stationData.brands &&
          Array.isArray(stationData.brands) &&
          stationData.brands.length > 0 ? (
            <section className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Vi optimerar{" "}
                  <span className="text-red-500">alla bilmärken</span>
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Professionell optimering oavsett bilmärke eller modell
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {stationData.brands
                  .filter((brand) => !brand.name.includes("[LASTBIL] - VOLVO"))
                  .map((brand) => (
                    <div
                      key={brand._id}
                      className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg flex items-center justify-center h-20 transition-all hover:-translate-y-1"
                    >
                      {brand.logo?.asset?.url ? (
                        <img
                          src={urlFor(brand.logo).width(120).url()}
                          alt={brand.logo?.alt || `${brand.name} logo`}
                          className="h-8 w-full object-contain opacity-80 hover:opacity-100 transition-opacity"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = document.createElement("span");
                            fallback.className = "text-gray-300 text-center";
                            fallback.textContent = brand.name;
                            e.currentTarget.parentNode?.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <span className="text-xs text-gray-300 text-center">
                          {brand.name}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Brands information coming soon
            </div>
          )}
        </div>
      </div>
    </>
  );
}
