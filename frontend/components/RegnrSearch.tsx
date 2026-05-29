// components/RegnrSearch.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type Vehicle = {
  brand: string;
  model: string;
  year: string;
  fuel: string;
  powerHp: string;
  engineCm3: string;
};

type Props = {
  onVehicleFound: (vehicle: Vehicle) => void;
  onError: (message: string | null) => void;
  disabled: boolean;
  onOpen?: () => void;
};

const REGNR_REGEX = /^[A-Z]{3}\d{2}[A-Z0-9]{1}$/;

function normalizeRegnr(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function isValidSwedishReg(regnr: string) {
  return REGNR_REGEX.test(regnr);
}

function getText(parent: Element | Document, selector: string) {
  return parent.querySelector<HTMLElement>(selector)?.innerText.trim() || "";
}

function getFirstNumber(value?: string | null) {
  return value?.match(/\d+/)?.[0] || null;
}

function parseVehicleFromHtml(html: string): Vehicle {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const summarySection = doc.querySelector("section#summary");
  const technicalDataSection = doc.querySelector("section#technical-data");

  if (!summarySection) {
    throw new Error("Kunde inte hitta fordonsinformation.");
  }

  const fullName = getText(summarySection, ".bar.summary .info h1");
  const iconGrid = summarySection.querySelector("ul.icon-grid");

  if (!fullName || !iconGrid) {
    throw new Error("Kunde inte läsa ut fordonsinformationen.");
  }

  const [brand = "", ...modelParts] = fullName.split(" ");
  const model = modelParts.join(" ").trim();

  let year: string | null = null;
  let fuel: string | null = null;
  let powerHp: string | null = null;
  let engineCm3: string | null = null;

  iconGrid.querySelectorAll("li").forEach((item) => {
    const label = getText(item, "span").toLowerCase();
    const value = getText(item, "em");

    if (label === "modellår") year = value.match(/\d{4}/)?.[0] || null;
    if (label === "bränsle") fuel = value || null;
    if (label === "hästkrafter") powerHp = getFirstNumber(value);
  });

  technicalDataSection
    ?.querySelectorAll(".inner ul.list li")
    .forEach((item) => {
      const label = getText(item, "span.label").toLowerCase();
      const value = getText(item, "span.value");

      if (label === "motorvolym") {
        engineCm3 = getFirstNumber(value);
      }
    });

  const missing = [
    !brand && "Märke",
    !model && "Modell",
    !year && "År",
    !fuel && "Bränsle",
    !powerHp && "Effekt",
    !engineCm3 && "Motorvolym",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Kunde inte extrahera: ${missing.join(", ")}.`);
  }

  return {
    brand,
    model,
    year: year!,
    fuel: fuel!,
    powerHp: powerHp!,
    engineCm3: engineCm3!,
  };
}

export default function RegnrSearch({
  onVehicleFound,
  onError,
  disabled,
  onOpen,
}: Props) {
  const [regnr, setRegnr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasOpened = useRef(false);

  const formattedRegnr = useMemo(() => normalizeRegnr(regnr), [regnr]);
  const isValid = formattedRegnr.length === 6 && isValidSwedishReg(formattedRegnr);
  const canSearch = isValid && !disabled && !isLoading;

  useEffect(() => {
    if (!formattedRegnr) {
      setError(null);
      return;
    }

    if (formattedRegnr.length === 6 && !isValid) {
      setError("Ogiltigt registreringsnummer. Exempel: ABC123 eller ABC12D.");
    } else {
      setError(null);
    }
  }, [formattedRegnr, isValid]);

  const setErrorState = (message: string | null) => {
    setError(message);
    onError(message);
  };

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open && !hasOpened.current) {
      onOpen?.();
      hasOpened.current = true;
    }
  };

  const handleSearch = async () => {
    if (!formattedRegnr || disabled) return;

    if (!isValidSwedishReg(formattedRegnr)) {
      setErrorState("Ogiltigt registreringsnummer. Exempel: ABC123 eller ABC12D.");
      return;
    }

    const regnrBaseUrl = process.env.NEXT_PUBLIC_REGNR_URL;
    const proxyBaseUrl = process.env.NEXT_PUBLIC_CORS_PROXY_URL;
    const proxyKey = process.env.NEXT_PUBLIC_CORS_PROXY_KEY;

    if (!regnrBaseUrl || !proxyBaseUrl || !proxyKey) {
      setErrorState("Regnr-sökningen är inte korrekt konfigurerad.");
      return;
    }

    setIsLoading(true);
    setErrorState(null);

    try {
      const targetUrl = `${regnrBaseUrl}/fordon/${formattedRegnr}`;
      const proxyUrl = `${proxyBaseUrl}/?key=${proxyKey}&url=${encodeURIComponent(
        targetUrl,
      )}`;

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Kunde inte hämta fordonsdata. Status: ${response.status}.`);
      }

      const html = await response.text();
      const vehicle = parseVehicleFromHtml(html);

      onVehicleFound(vehicle);
      setErrorState(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ett okänt fel uppstod vid sökning.";
      setErrorState(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <details
      className="group mx-auto mb-8 max-w-md overflow-hidden rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 shadow-xl"
      onToggle={handleToggle}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 transition hover:bg-white/5 marker:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-white">
              Sök med regnr
            </p>
            <p className="text-xs text-gray-400">Hitta bilen automatiskt</p>
          </div>
        </div>

        <svg
          className="h-5 w-5 text-gray-400 transition-transform duration-300 group-open:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
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
      </summary>

      <div className="border-t border-gray-700 bg-black/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={regnr}
              onChange={(e) => setRegnr(normalizeRegnr(e.target.value))}
              placeholder="ABC123"
              inputMode="text"
              autoComplete="off"
              maxLength={6}
              disabled={disabled || isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="w-full rounded-xl border border-gray-600 bg-gray-950 px-4 py-3 text-center font-mono text-lg font-bold uppercase tracking-[0.25em] text-white placeholder-gray-600 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            />

            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={!canSearch}
            className="min-w-[130px] rounded-xl bg-red-600 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
          >
            {isLoading ? "Söker..." : "Sök fordon"}
          </button>
        </div>

        {disabled && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            <span>Initierar sökmotor...</span>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
