// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { PortableText } from "@portabletext/react";
import client from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";
import {
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

// Types
interface VehicleData {
  brand: string;
  model: string;
  year: string;
  engine: string;
  fuelType: string;
  baseHp: number;
  baseNm: number;
  stages: Stage[];
  brandLogo?: any;
}

interface Stage {
  name: string;
  tunedHp: number;
  tunedNm: number;
  price: number;
  description?: any;
  origHp?: number;
  origNm?: number;
}

// Main Component
export default function EnginePage({
  vehicleData,
}: {
  vehicleData: VehicleData;
}) {
  const [expandedContact, setExpandedContact] = useState(false);
  const router = useRouter();

  if (!vehicleData) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model} / {router.query.year} /{" "}
          {router.query.engine}
        </h1>
        <p className="text-lg text-red-500">Motorinformation saknas.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {" "}
      {/* Extra padding for floating bar */}
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <a href="/" className="hover:text-blue-600">
              Hem
            </a>
            <span>/</span>
            <a href="/tuning" className="hover:text-blue-600">
              Tuning
            </a>
            <span>/</span>
            <a
              href={`/${slugify(vehicleData.brand)}`}
              className="hover:text-blue-600"
            >
              {vehicleData.brand}
            </a>
            <span>/</span>
            <span className="text-gray-700 font-medium">
              {vehicleData.model} {vehicleData.year}
            </span>
          </div>
          <h1 className="text-3xl font-bold">
            {vehicleData.brand}{" "}
            <span className="text-blue-600">{vehicleData.model}</span>{" "}
            <span className="text-orange-500">{vehicleData.year}</span>
          </h1>
          <div className="flex items-center mt-2">
            {vehicleData.brandLogo && (
              <img
                src={urlFor(vehicleData.brandLogo).width(40).url()}
                className="mr-3 h-8"
                alt={vehicleData.brand}
              />
            )}
            <p className="text-lg">{vehicleData.engine}</p>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Motor" value={vehicleData.engine} />
          <StatBox label="Bränsle" value={vehicleData.fuelType} />
          <StatBox label="Original HK" value={vehicleData.baseHp} />
          <StatBox label="Original NM" value={vehicleData.baseNm} />
        </div>

        {/* Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vehicleData.stages.map((stage) => (
            <div
              key={stage.name}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="bg-gray-800 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  {stage.name.toUpperCase()}
                </h2>
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {stage.price.toLocaleString()} kr
                </span>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <SpecBox
                    title="ORIGINAL HK"
                    value={stage.origHp || 0}
                    className="border-gray-200"
                  />
                  <SpecBox
                    title={`${stage.name} HK`}
                    value={stage.tunedHp}
                    diff={stage.tunedHp - (stage.origHp || 0)}
                    className="border-green-500 text-green-600"
                  />
                  <SpecBox
                    title="ORIGINAL NM"
                    value={stage.origNm || 0}
                    className="border-gray-200"
                  />
                  <SpecBox
                    title={`${stage.name} NM`}
                    value={stage.tunedNm}
                    diff={stage.tunedNm - (stage.origNm || 0)}
                    className="border-green-500 text-green-600"
                  />
                </div>

                {stage.description && (
                  <div className="prose max-w-none mb-6">
                    <PortableText value={stage.description} />
                  </div>
                )}

                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium">
                  KONTAKTA OSS FÖR BESTÄLLNING
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Floating Contact Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white shadow-lg transition-all duration-300 ${expandedContact ? "h-48" : "h-16"}`}
      >
        <button
          onClick={() => setExpandedContact(!expandedContact)}
          className="w-full bg-blue-600 text-white py-3 px-4 flex justify-between items-center"
        >
          <span className="font-medium">
            Kontakta oss om {vehicleData.brand} {vehicleData.model}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${expandedContact ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {expandedContact && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <ContactMethod
              icon={<PhoneIcon className="w-6 h-6" />}
              label="Ring oss"
              value="08-123 456 78"
              action="tel:0812345678"
            />
            <ContactMethod
              icon={<ChatBubbleBottomCenterTextIcon className="w-6 h-6" />}
              label="SMS/WhatsApp"
              value="070-123 45 67"
              action="https://wa.me/46701234567"
            />
            <ContactMethod
              icon={<EnvelopeIcon className="w-6 h-6" />}
              label="E-post"
              value="info@aktuning.se"
              action="mailto:info@aktuning.se"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 text-center">
      <p className="text-sm font-bold text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function SpecBox({
  title,
  value,
  diff,
  className,
}: {
  title: string;
  value: number;
  diff?: number;
  className?: string;
}) {
  return (
    <div className={`border rounded-lg p-3 text-center ${className}`}>
      <p className="text-sm font-bold mb-1">{title}</p>
      <p className="text-xl font-bold">{value}</p>
      {diff && <p className="text-xs mt-1 text-red-500">+{diff}</p>}
    </div>
  );
}

function ContactMethod({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  action: string;
}) {
  return (
    <a
      href={action}
      className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="bg-blue-100 p-2 rounded-full text-blue-600">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </a>
  );
}

// Utility Functions
function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Data Fetching
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { brand, model, year, engine } = context.params as {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };

  try {
    const query = `
      *[_type == "brand" && slug.current == $brand][0]{
        name,
        logo,
        "models": *[_type == "model" && references(^._id) && name == $model][0]{
          name,
          "years": *[_type == "modelYear" && references(^._id) && range == $year][0]{
            range,
            "engines": *[_type == "engine" && references(^._id) && label == $engine][0]{
              label,
              fuel,
              baseHp,
              baseNm,
              "stages": stages[]{
                name,
                tunedHp,
                tunedNm,
                price,
                description,
                origHp,
                origNm
              }
            }
          }
        }
      }
    `;

    const result = await client.fetch(query, {
      brand: decodeURIComponent(brand),
      model: decodeURIComponent(model),
      year: decodeURIComponent(year),
      engine: decodeURIComponent(engine),
    });

    if (!result || !result.models?.years?.engines) {
      return { notFound: true };
    }

    const vehicleData: VehicleData = {
      brand: result.name,
      model: result.models.name,
      year: result.models.years.range,
      engine: result.models.years.engines.label,
      fuelType: result.models.years.engines.fuel,
      baseHp: result.models.years.engines.baseHp,
      baseNm: result.models.years.engines.baseNm,
      stages: result.models.years.engines.stages,
      brandLogo: result.logo,
    };

    return {
      props: {
        vehicleData,
      },
    };
  } catch (err) {
    return { notFound: true };
  }
};
