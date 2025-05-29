import Head from "next/head";

export default function MotoroptimeringGoteborg() {
  return (
    <>
      <Head>
        <title>Motoroptimering Göteborg | AK-TUNING</title>
        <meta
          name="description"
          content="Professionell motoroptimering i Göteborg med 2 års garanti. Boka tid för optimering av din bil hos AK-TUNING Göteborg – specialister på ECU tuning."
        />
        <link
          rel="canonical"
          href="https://tuning.aktuning.se/motoroptimering-goteborg"
        />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="Motoroptimering Göteborg | AK-TUNING"
        />
        <meta
          property="og:description"
          content="ECU tuning med garanti i Göteborg."
        />
        <meta
          property="og:url"
          content="https://tuning.aktuning.se/motoroptimering-goteborg"
        />
        <meta
          property="og:image"
          content="https://tuning.aktuning.se/ak-logo2.png"
        />

        {/* LocalBusiness Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "AK-TUNING Göteborg",
              image: "https://tuning.aktuning.se/ak-logo2.png",
              "@id": "https://tuning.aktuning.se/motoroptimering-goteborg",
              url: "https://tuning.aktuning.se/motoroptimering-goteborg",
              telephone: "+46701234567",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Maskingatan 1",
                addressLocality: "Göteborg",
                postalCode: "417 64",
                addressCountry: "SE",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 57.7089,
                longitude: 11.9746,
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                  ],
                  opens: "08:00",
                  closes: "17:00",
                },
              ],
              sameAs: [
                "https://www.facebook.com/aktuning",
                "https://www.instagram.com/aktuning",
              ],
            }),
          }}
        />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-6">Motoroptimering i Göteborg</h1>
        <p className="text-lg text-gray-700 mb-6">
          Välkommen till AK-TUNING Göteborg – din expert på professionell
          motoroptimering. Vi erbjuder skräddarsydd ECU tuning för de flesta
          bilmärken och modeller.
        </p>

        <ul className="list-disc pl-6 mb-8 text-gray-700">
          <li>+30–100 hk beroende på bilmodell</li>
          <li>2 års garanti på mjukvara</li>
          <li>30 dagars öppet köp</li>
          <li>Testade och säkra mjukvaror</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4">
          Besök vår anläggning i Göteborg
        </h2>
        <p className="mb-6 text-gray-700">Du hittar oss på</p>

        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2133.174934449659!2d11.9746!3d57.7089!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTfCsDQyJzMzLjAiTiAxMcKwNTgnMjcuNiJF!5e0!3m2!1ssv!2sse!4v1683712340000!5m2!1ssv!2sse"
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
        ></iframe>

        <div className="mt-10">
          <h3 className="text-xl font-semibold">Kontakt</h3>
          <p className="text-gray-700">
            Telefon:{" "}
            <a href="tel:+46701234567" className="text-blue-600">
              070-123 45 67
            </a>
          </p>
          <p className="text-gray-700">
            E-post:{" "}
            <a href="mailto:info@aktuning.se" className="text-blue-600">
              info@aktuning.se
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
