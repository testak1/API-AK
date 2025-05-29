import { GetServerSideProps } from "next";
import Head from "next/head";
import NextImage from "next/image";
import { PortableText } from "@portabletext/react";
import client from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";
import { stationPageQuery } from "@/src/lib/queries";
import { Station } from "@/types/sanity";

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
        className="my-4 rounded-lg shadow-md w-full"
      />
    ),
  },
  marks: {
    link: ({ children, value }: any) => (
      <a
        href={value.href}
        className="text-blue-400 hover:text-blue-300 underline"
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
  const pageTitle = `Motoroptimering ${stationData.city} | AK-TUNING ${stationData.city}`;
  const pageDescription = `Professionell motoroptimering i ${stationData.city} med 2 års garanti. Boka tid för optimering av din bil hos AK-TUNING ${stationData.city} – specialister på ECU tuning och prestandaoptimering.`;
  const pageUrl = `https://tuning.aktuning.se/motoroptimering-${stationData.slug.current}`;

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
          content="https://tuning.aktuning.se/ak-logo2.png"
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
          content="https://tuning.aktuning.se/ak-logo2.png"
        />

        {/* LocalBusiness Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: `AK-TUNING ${stationData.city}`,
              image: "https://tuning.aktuning.se/ak-logo2.png",
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
              geo: {
                "@type": "GeoCoordinates",
                latitude: stationData.location.lat,
                longitude: stationData.location.lng,
              },
              openingHoursSpecification: stationData.openingHours.map((oh) => ({
                "@type": "OpeningHoursSpecification",
                dayOfWeek: oh.days,
                opens: oh.open,
                closes: oh.close,
              })),
              sameAs: [
                "https://www.facebook.com/aktuning",
                "https://www.instagram.com/aktuning",
              ],
            }),
          }}
        />
      </Head>

      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent z-10"></div>
          <div className="relative z-20 px-8 py-16 md:py-24">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Motoroptimering i {stationData.city}
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Professionell ECU tuning och prestandaoptimering hos AK-TUNING{" "}
                {stationData.city}
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#contact"
                  className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg"
                >
                  Boka tid
                </a>
                <a
                  href="tel:+46701234567"
                  className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg"
                >
                  Ring oss
                </a>
              </div>
            </div>
          </div>
          {stationData.featuredImage && (
            <img
              src={urlFor(stationData.featuredImage).width(1600).url()}
              alt={`AK-TUNING verkstad i ${stationData.city}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="text-orange-500 text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-white mb-2">2 års garanti</h3>
            <p className="text-gray-300">
              All vår mjukvara kommer med full garanti för din trygghet.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="text-orange-500 text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">+30-100 hk</h3>
            <p className="text-gray-300">
              Upplev en tydlig skillnad i prestanda och köregenskaper.
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="text-orange-500 text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-bold text-white mb-2">
              30 dagars öppet köp
            </h3>
            <p className="text-gray-300">
              Testa själv och ångra dig inom 30 dagar om du inte är nöjd.
            </p>
          </div>
        </div>

        {/* About Section */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold text-white mb-6">
                Vår verkstad i {stationData.city}
              </h2>
              <div className="prose prose-invert max-w-none">
                {stationData.content && (
                  <PortableText
                    value={stationData.content}
                    components={portableTextComponents}
                  />
                )}
              </div>
            </div>
            <div className="md:w-1/2">
              {stationData.gallery && stationData.gallery.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {stationData.gallery.map((image, index) => (
                    <img
                      key={index}
                      src={urlFor(image).width(600).url()}
                      alt={`AK-TUNING ${stationData.city} verkstad ${index + 1}`}
                      className="rounded-lg shadow-md h-48 w-full object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Våra tjänster i {stationData.city}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stationData.services.map((service, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-orange-500 transition-colors"
              >
                <h3 className="text-xl font-bold text-white mb-3">
                  {service.title}
                </h3>
                <div className="prose prose-invert max-w-none text-sm">
                  <PortableText
                    value={service.description}
                    components={portableTextComponents}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Map Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">
            Hitta till oss i {stationData.city}
          </h2>
          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
            <iframe
              src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d0!2d${stationData.location.lng}!3d${stationData.location.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${Math.floor(stationData.location.lat)}°${Math.floor((stationData.location.lat % 1) * 60)}′${Math.floor((((stationData.location.lat % 1) * 60) % 1) * 60)}″N ${Math.floor(stationData.location.lng)}°${Math.floor((stationData.location.lng % 1) * 60)}′${Math.floor((((stationData.location.lng % 1) * 60) % 1) * 60)}″E!5e0!3m2!1ssv!2sse!4v1683712340000!5m2!1ssv!2sse`}
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              className="w-full"
            ></iframe>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                AK-TUNING {stationData.city}
              </h3>
              <p className="text-gray-300 mb-1">
                {stationData.address.street}, {stationData.address.postalCode}{" "}
                {stationData.city}
              </p>
              <p className="text-gray-300 mb-4">
                Telefon:{" "}
                <a
                  href={`tel:${stationData.phone.replace(/\s+/g, "")}`}
                  className="text-orange-500 hover:text-orange-400"
                >
                  {stationData.phone}
                </a>
              </p>
              <h4 className="text-lg font-semibold text-white mb-2">
                Öppettider:
              </h4>
              <ul className="text-gray-300 space-y-1">
                {stationData.openingHours.map((hours, index) => (
                  <li key={index}>
                    {hours.days.join(", ")}: {hours.open} - {hours.close}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        {stationData.testimonials && stationData.testimonials.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Vad våra kunder säger
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stationData.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
                >
                  <div className="flex items-center mb-4">
                    <div className="text-orange-500 text-3xl mr-4">★</div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {testimonial.name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {testimonial.vehicle}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">"{testimonial.quote}"</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact Section */}
        <section id="contact" className="mb-16">
          <div className="bg-gray-800 rounded-xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Boka tid för motoroptimering
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Kontaktinformation
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="mr-3">📍</span>
                    <span>
                      {stationData.address.street},{" "}
                      {stationData.address.postalCode} {stationData.city}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3">📞</span>
                    <a
                      href={`tel:${stationData.phone.replace(/\s+/g, "")}`}
                      className="hover:text-orange-500"
                    >
                      {stationData.phone}
                    </a>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3">✉️</span>
                    <a
                      href="mailto:info@aktuning.se"
                      className="hover:text-orange-500"
                    >
                      info@aktuning.se
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Skicka förfrågan
                </h3>
                <form className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Namn
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-white"
                      placeholder="Ditt namn"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      E-post
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-white"
                      placeholder="din@epost.se"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Telefon
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-white"
                      placeholder="070-123 45 67"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Meddelande
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-white"
                      placeholder="Berätta om din bil och vilken optimering du är intresserad av"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg"
                  >
                    Skicka förfrågan
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Logos */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Vi optimerar alla bilmärken
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              "Audi",
              "BMW",
              "Volvo",
              "Volkswagen",
              "Mercedes",
              "Seat",
              "Skoda",
              "Ford",
              "Opel",
              "Peugeot",
              "Renault",
              "Toyota",
            ].map((brand) => (
              <div
                key={brand}
                className="bg-gray-800 p-4 rounded-lg flex items-center justify-center h-24"
              >
                <img
                  src={`/brands/${brand.toLowerCase()}.svg`}
                  alt={brand}
                  className="h-12 object-contain"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
