// pages/[brand]/[model]/[year]/[engine].tsx
import { useRouter } from 'next/router';
import Head from 'next/head';
import React from 'react';

export default function EnginePage() {
  const router = useRouter();
  const { brand, model, year, engine } = router.query;

  if (!brand || !model || !year || !engine) {
    return (
      <div className="flex justify-center items-center h-screen text-white text-xl">
        Laddar fordon...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {brand} {model} {year} {engine} | AK-Tuning
        </title>
        <meta name="description" content={`Tuning för ${brand} ${model} ${year} ${engine}`} />
      </Head>

      <div className="max-w-4xl mx-auto p-8 text-white">
        <h1 className="text-3xl font-bold mb-4">
          {brand?.toString().toUpperCase()} {model} ({year})
        </h1>
        <h2 className="text-2xl mb-6">{engine}</h2>

        <p className="text-gray-400 mb-8">
          Här kan vi visa information om detta fordon, dess steg och AKT+ alternativ.
        </p>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          {/* 🛠️ You can later fetch from Sanity here if you want */}
          <p>Denna sida är dynamiskt genererad baserat på URL.</p>
          <p>Du kan även hämta motor-specifikationer härifrån i framtiden.</p>
        </div>
      </div>
    </>
  );
}
