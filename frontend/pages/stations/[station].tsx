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

interface InstagramPost {
  id: string;
  media_url: string;
  permalink: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
}

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
        className="text-orange-500 hover:text-orange-400 underline transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  },
};

const ContactModal = ({
  isOpen,
  onClose,
  station,
}: {
  isOpen: boolean;
  onClose: () => void;
  station: Station;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    vehicle: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              Boka tid i {station.city}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Namn*
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  E-post*
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Telefon*
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="vehicle"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Bilmodell*
                </label>
                <input
                  type="text"
                  id="vehicle"
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                  value={formData.vehicle}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Övrig information
              </label>
              <textarea
                id="message"
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
              ></textarea>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors"
              >
                Skicka förfrågan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const InstagramFeed = ({ instagramUrl }: { instagramUrl?: string }) => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instagramUrl) return;

    const fetchInstagramPosts = async () => {
      try {
        setLoading(true);
        setTimeout(() => {
          setPosts([
            {
              id: "1",
              media_url: "/mock-instagram-1.jpg",
              permalink: "https://instagram.com/p/1",
              caption: "Recent tuning project in our workshop #aktuning",
              media_type: "IMAGE",
            },
            {
              id: "2",
              media_url: "/mock-instagram-2.jpg",
              permalink: "https://instagram.com/p/2",
              caption: "Customer happy with their new performance #chiptuning",
              media_type: "IMAGE",
            },
            {
              id: "3",
              media_url: "/mock-instagram-3.jpg",
              permalink: "https://instagram.com/p/3",
              caption: "Before and after dyno results #tuning",
              media_type: "IMAGE",
            },
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching Instagram posts:", error);
        setLoading(false);
      }
    };

    fetchInstagramPosts();
  }, [instagramUrl]);

  if (!instagramUrl) return null;

  return (
    <section className="mb-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Följ oss på <span className="text-orange-500">Instagram</span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Se våra senaste projekt och kundbilar
        </p>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-orange-500 hover:text-orange-400 transition-colors"
        >
          @aktuning
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-xl overflow-hidden shadow-lg transition-transform hover:-translate-y-2"
            >
              <img
                src={post.media_url}
                alt={post.caption || "Instagram post"}
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                {post.caption && (
                  <p className="text-white line-clamp-2">{post.caption}</p>
                )}
              </div>
              <div className="absolute top-4 right-4 bg-black/50 rounded-full p-2">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
};

export default function MotoroptimeringStation({
  stationData,
}: StationPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      <div className="bg-gray-950 text-white min-h-screen">
        <ContactModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          station={stationData}
        />

        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Hero Section - Improved with better spacing */}
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden mb-16 shadow-2xl min-h-[500px]">
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10"></div>
            <div className="relative z-20 px-8 py-16 md:py-28 lg:py-32 h-full flex items-center">
              <div className="max-w-2xl">
                <div className="flex items-center mb-6">
                  <NextImage
                    src="/ak-logo2.png"
                    alt="AK-TUNING"
                    width={80}
                    height={80}
                    className="h-12 w-auto"
                  />
                  <span className="ml-3 text-xl font-bold text-orange-500">
                    AK-TUNING
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  Motoroptimering i{" "}
                  <span className="text-orange-500">{stationData.city}</span>
                </h1>
                <p className="text-xl text-gray-300 mb-8 max-w-lg">
                  Professionell ECU tuning och prestandaoptimering hos
                  specialisterna på AK-TUNING
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-105"
                  >
                    Boka tid nu
                  </button>
                  <a
                    href={`tel:${stationData.phone.replace(/\s+/g, "")}`}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2"
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
                </div>
              </div>
            </div>
            {stationData.featuredImage && (
              <img
                src={urlFor(stationData.featuredImage).width(1800).url()}
                alt={`AK-TUNING verkstad i ${stationData.city}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>

          {/* Benefits Section - Improved layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700 hover:border-orange-500 transition-all hover:-translate-y-1">
              <div className="bg-orange-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="text-orange-500 text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                2 års garanti
              </h3>
              <p className="text-gray-400">
                All vår mjukvara kommer med full garanti för din trygghet och
                säkerhet.
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700 hover:border-orange-500 transition-all hover:-translate-y-1">
              <div className="bg-orange-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="text-orange-500 text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">+30-100 hk</h3>
              <p className="text-gray-400">
                Mätbar effektökning som ger tydlig skillnad i prestanda och
                körupplevelse.
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700 hover:border-orange-500 transition-all hover:-translate-y-1">
              <div className="bg-orange-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <span className="text-orange-500 text-2xl">🔄</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                30 dagars öppet köp
              </h3>
              <p className="text-gray-400">
                Testa själv och ångra dig inom 30 dagar om du inte är helt nöjd.
              </p>
            </div>
          </div>

          {/* About Section - Better content visibility */}
          <section className="mb-20">
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="lg:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                  Vår verkstad i{" "}
                  <span className="text-orange-500">{stationData.city}</span>
                </h2>
                <div className="prose prose-invert max-w-none text-gray-300">
                  {stationData.content && (
                    <PortableText
                      value={stationData.content}
                      components={portableTextComponents}
                    />
                  )}
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-8 bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all hover:scale-105"
                >
                  Boka konsultation
                </button>
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

          {/* Services Section - Improved visibility */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Våra <span className="text-orange-500">tjänster</span> i{" "}
                {stationData.city}
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Professionella optimeringstjänster skräddarsydda för din bil
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {stationData.services.map((service, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-xl border border-gray-700 hover:border-orange-500 transition-all hover:-translate-y-2"
                >
                  <div className="bg-orange-500/10 p-3 rounded-lg w-12 h-12 flex items-center justify-center mb-6">
                    <span className="text-orange-500 text-xl">
                      {index % 3 === 0 ? "🚀" : index % 3 === 1 ? "⚙️" : "🔧"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">
                    {service.title}
                  </h3>
                  <div className="prose prose-invert max-w-none text-gray-400 mb-6">
                    <PortableText
                      value={service.description}
                      components={portableTextComponents}
                    />
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-2 transition-colors"
                  >
                    Boka nu
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gray-900 rounded-xl p-6 shadow-lg">
            {stationData.instagramUrl && <InstagramFeedEmbed />}
          </section>

          {/* Map Section - Better layout */}
          <section className="mb-20">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
              <div className="p-8">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Hitta till oss i{" "}
                  <span className="text-orange-500">{stationData.city}</span>
                </h2>
                <p className="text-gray-400 mb-8 max-w-2xl">
                  Besök vår verkstad för en personlig konsultation och
                  professionell optimering
                </p>

                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/2">
                    <div className="bg-gray-900 rounded-xl p-6 mb-6">
                      <h3 className="text-xl font-bold text-white mb-4">
                        <span className="text-orange-500">AK-TUNING</span>{" "}
                        {stationData.city}
                      </h3>
                      <div className="space-y-4 text-gray-300">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 mt-0.5 text-orange-500"
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
                            className="w-5 h-5 text-orange-500"
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
                            className="hover:text-orange-500 transition-colors"
                          >
                            {stationData.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-orange-500"
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
                            href="mailto:info@aktuning.se"
                            className="hover:text-orange-500 transition-colors"
                          >
                            info@aktuning.se
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">
                        Öppettider
                      </h4>
                      <ul className="space-y-3 text-gray-300">
                        {stationData.openingHours.map((hours, index) => (
                          <li key={index} className="flex justify-between">
                            <span>{hours.days.join(", ")}</span>
                            <span className="font-medium">
                              {hours.open} - {hours.close}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="md:w-1/2">
                    <div className="h-full rounded-xl overflow-hidden shadow-lg">
                      <iframe
                        src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d0!2d${stationData.location.lng}!3d${stationData.location.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${Math.floor(stationData.location.lat)}°${Math.floor((stationData.location.lat % 1) * 60)}′${Math.floor((((stationData.location.lat % 1) * 60) % 1) * 60)}″N ${Math.floor(stationData.location.lng)}°${Math.floor((stationData.location.lng % 1) * 60)}′${Math.floor((((stationData.location.lng % 1) * 60) % 1) * 60)}″E!5e0!3m2!1ssv!2sse!4v1683712340000!5m2!1ssv!2sse`}
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
                  Vad våra <span className="text-orange-500">kunder</span> säger
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Läs om upplevelserna från andra bilentusiaster
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {stationData.testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-xl border border-gray-700 hover:border-orange-500 transition-all hover:-translate-y-2"
                  >
                    <div className="flex items-center mb-6">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${i < 4 ? "text-orange-500" : "text-gray-700"}`}
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
                      <div className="bg-orange-500/10 p-2 rounded-full mr-4">
                        <svg
                          className="w-6 h-6 text-orange-500"
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
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-8 md:p-12 text-center shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Redo att uppgradera din bil?
              </h2>
              <p className="text-orange-100 mb-8 max-w-2xl mx-auto">
                Boka en tid idag och upplev skillnaden med professionell
                motoroptimering
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white hover:bg-gray-100 text-orange-600 px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-105"
                >
                  Boka tid nu
                </button>
                <a
                  href={`tel:${stationData.phone.replace(/\s+/g, "")}`}
                  className="bg-orange-800 hover:bg-orange-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
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
              </div>
            </div>
          </section>

          {/* Brand Logos */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Vi optimerar{" "}
                <span className="text-orange-500">alla bilmärken</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Professionell optimering oavsett bilmärke eller modell
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
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
                  className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl flex items-center justify-center h-24 transition-all hover:-translate-y-1"
                >
                  <img
                    src={`/brands/${brand.toLowerCase()}.svg`}
                    alt={brand}
                    className="h-12 w-full object-contain opacity-80 hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
