import React from "react";
import { PortableText } from "@portabletext/react";
import { Line } from "react-chartjs-2";
import { urlFor } from "@/lib/sanity";
import { t as translate } from "@/lib/translations";

import type { Stage, AktPlusOption, Engine } from "@/types/sanity";

interface Props {
  stage: Stage;
  engineData: Engine;
  currentLanguage: string;
  allOptions: AktPlusOption[];
  isExpanded: boolean;
  expandedAktPlus: Record<string, boolean>;
  expandedOptions: Record<string, boolean>;
  toggleAktPlus: (stageName: string) => void;
  toggleOption: (optionId: string) => void;
  setInfoModal: (value: {
    open: boolean;
    type: "stage" | "general";
    stage?: Stage;
  }) => void;
  handleBookNow: (label: string) => void;
  rpmLabels: string[];
  isDsgStage: boolean;
  portableTextComponents: any;
  watermarkPlugin: any;
  shadowPlugin: any;
}

const StageDetails: React.FC<Props> = ({
  stage,
  engineData,
  currentLanguage,
  allOptions,
  isExpanded,
  expandedAktPlus,
  expandedOptions,
  toggleAktPlus,
  toggleOption,
  setInfoModal,
  handleBookNow,
  rpmLabels,
  isDsgStage,
  portableTextComponents,
  watermarkPlugin,
  shadowPlugin,
}) => {
  if (!isExpanded) return null;

  const hkIncrease = stage.tunedHk - stage.origHk;
  const nmIncrease = stage.tunedNm - stage.origNm;

  const getStageColor = (stageName: string) => {
    const name = stageName.toLowerCase();
    if (name.includes("steg 1")) return "text-red-500";
    if (name.includes("steg 2")) return "text-orange-400";
    if (name.includes("steg 3")) return "text-purple-400";
    if (name.includes("steg 4")) return "text-yellow-400";
    if (name.includes("dsg")) return "text-blue-400";
    return "text-white"; // fallback
  };

  const generateDynoCurve = (
    peakValue: number,
    isHp: boolean,
    fuelType: string,
  ) => {
    // Välj RPM range beroende på motor
    const rpmRange = fuelType.toLowerCase().includes("diesel")
      ? [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]
      : [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

    const peakIndex = isHp
      ? Math.floor(rpmRange.length * 0.6)
      : Math.floor(rpmRange.length * 0.4);
    const startIndex = 0;

    return rpmRange.map((rpm, i) => {
      const startRpm = rpmRange[startIndex];
      const peakRpm = rpmRange[peakIndex];
      const endRpm = rpmRange[rpmRange.length - 1];

      if (rpm <= peakRpm) {
        const progress = (rpm - startRpm) / (peakRpm - startRpm);
        return peakValue * (0.5 + 0.5 * Math.pow(progress, 1.2));
      } else {
        const fallProgress = (rpm - peakRpm) / (endRpm - peakRpm);
        return peakValue * (1 - 0.35 * Math.pow(fallProgress, 1));
      }
    });
  };

  return (
    <div className="px-6 pb-6">
      {isExpanded && (
        <div className="px-6 pb-6">
          {isDsgStage ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-6">
              {/* DSG/TCU-FÄLT */}
              {stage.tcuFields?.launchControl && (
                <div className="border border-blue-400 rounded-lg p-3 text-white">
                  <p className="text-sm font-bold text-blue-300 mb-1">
                    {translate(currentLanguage, "launchControl")}
                  </p>
                  <p>
                    Original: {stage.tcuFields.launchControl.original || "-"}{" "}
                    RPM
                  </p>
                  <p>
                    Optimerad:{" "}
                    <span className="text-green-400">
                      {stage.tcuFields.launchControl.optimized || "-"} RPM
                    </span>
                  </p>
                </div>
              )}
              {stage.tcuFields?.rpmLimit && (
                <div className="border border-blue-400 rounded-lg p-3 text-white">
                  <p className="text-sm font-bold text-blue-300 mb-1">
                    {translate(currentLanguage, "rpmLimit")}
                  </p>
                  <p>
                    Original: {stage.tcuFields.rpmLimit.original || "-"} RPM
                  </p>
                  <p>
                    Optimerad:{" "}
                    <span className="text-green-400">
                      {stage.tcuFields.rpmLimit.optimized || "-"} RPM
                    </span>
                  </p>
                </div>
              )}
              {stage.tcuFields?.shiftTime && (
                <div className="border border-blue-400 rounded-lg p-3 text-white">
                  <p className="text-sm font-bold text-blue-300 mb-1">
                    {translate(currentLanguage, "shiftTime")}
                  </p>
                  <p>
                    Original: {stage.tcuFields.shiftTime.original || "-"} ms
                  </p>
                  <p>
                    Optimerad:{" "}
                    <span className="text-green-400">
                      {stage.tcuFields.shiftTime.optimized || "-"} ms
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-6">
              {/* ORIGINAL & TUNED SPECS - PERFORMANCE */}
              <div className="border border-white rounded-lg p-3 text-center">
                <p className="text-sm text-white font-bold mb-1">
                  {translate(currentLanguage, "originalHp")}
                </p>
                <p className="text-xl text-white font-bold">
                  {stage.origHk} hk
                </p>
              </div>
              <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                <p className="text-xl text-white font-bold mb-1 uppercase">
                  {translate(currentLanguage, "translateStageName", stage.name)}{" "}
                  HK
                </p>
                <p className="text-xl font-bold">{stage.tunedHk} hk</p>
                <p className="text-xs mt-1 text-red-400">
                  +{stage.tunedHk - stage.origHk} hk
                </p>
              </div>
              <div className="border border-white rounded-lg p-3 text-center">
                <p className="text-sm text-white font-bold mb-1">
                  {translate(currentLanguage, "originalNm")}
                </p>
                <p className="text-xl text-white font-bold">
                  {stage.origNm} Nm
                </p>
              </div>
              <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                <p className="text-xl text-white font-bold mb-1 uppercase">
                  {translate(currentLanguage, "translateStageName", stage.name)}{" "}
                  NM
                </p>
                <p className="text-xl font-bold">{stage.tunedNm} Nm</p>
                <p className="text-xs mt-1 text-red-400">
                  +{stage.tunedNm - stage.origNm} Nm
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <button
              onClick={() => setInfoModal({ open: true, type: "stage", stage })}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
            >
              📄{" "}
              {translate(
                currentLanguage,
                "translateStageName",
                stage.name,
              ).toUpperCase()}{" "}
              {translate(currentLanguage, "infoStage")}
            </button>
            {/* Hidden SEO content for stage info */}
            <div className="sr-only" aria-hidden="false">
              <h2>{stage.name.toUpperCase()} INFORMATION</h2>
              {stage.description?.[currentLanguage] && (
                <PortableText
                  value={stage.description[currentLanguage]}
                  components={portableTextComponents}
                />
              )}
            </div>
            <button
              onClick={() => setInfoModal({ open: true, type: "general" })}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
            >
              💡 {translate(currentLanguage, "infoGeneral")}
            </button>
          </div>
          {/* Hidden SEO content for general info */}
          <div className="sr-only" aria-hidden="false">
            <h2>GENERELL INFORMATION</h2>
            <div>
              <ul className="space-y-2">
                <li>✅ All mjukvara är skräddarsydd för din bil</li>
                <li>✅ Felsökning inann samt efter optimering</li>
                <li>✅ Loggning för att anpassa en individuell mjukvara</li>
                <li>✅ Optimerad för både prestanda och bränsleekonomi</li>
              </ul>
              <div className="mt-6 text-sm text-gray-400 leading-relaxed">
                <p>
                  AK-TUNING är specialister på skräddarsydd motoroptimering,
                  chiptuning och ECU-programmering för alla bilmärken.
                </p>
                <p className="mt-2">
                  Vi erbjuder effektökning, bättre bränsleekonomi och optimerade
                  köregenskaper. Tjänster i Göteborg, Stockholm, Malmö,
                  Jönköping, Örebro och Storvik.
                </p>
                <p className="mt-2">
                  All mjukvara utvecklas in-house med fokus på kvalitet,
                  säkerhet och lång livslängd. Välkommen till en ny nivå av
                  bilprestanda med AK-TUNING.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {!isDsgStage && (
              <h3 className="text-lg font-medium text-gray-300 mb-2 uppercase">
                {translate(
                  currentLanguage,
                  "translateStageName",
                  stage.name,
                ).toUpperCase()}{" "}
              </h3>
            )}

            {/* Mobile-only legend above chart */}
            {!isDsgStage && (
              <div className="flex justify-center items-center gap-2 md:hidden text-xs text-white">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-red-400"></span>
                  <span>ORG HK</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-400"></span>
                  <span>
                    {translate(
                      currentLanguage,
                      "translateStageName",
                      stage.name,
                    )
                      .replace(/\s+/g, "")
                      .toUpperCase()}{" "}
                    HK
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-white"></span>
                  <span>ORG NM</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-white"></span>
                  <span>
                    {translate(
                      currentLanguage,
                      "translateStageName",
                      stage.name,
                    )
                      .replace(/\s+/g, "")
                      .toUpperCase()}{" "}
                    NM
                  </span>
                </div>
              </div>
            )}

            {!isDsgStage && (
              <div className="h-96 bg-gray-900 rounded-lg p-4 relative">
                {/* Split the spec boxes */}
                <div className="absolute hidden md:flex flex-row justify-between top-4 left-0 right-0 px-16">
                  {/* ORG HK / Max HK */}
                  <div className="bg-gray-900 px-4 py-1 rounded text-xs text-white flex flex-col items-start w-auto">
                    <p className="text-red-600">- - -</p>
                    <p className="text-white">HK ORG: {stage.origHk} HK</p>
                    <p className="text-red-600">_____</p>
                    <p className="text-white">
                      HK{" "}
                      {stage.name
                        .replace("Steg", "ST")
                        .replace(/\s+/g, "")
                        .toUpperCase()}
                      : {stage.tunedHk} HK
                    </p>
                  </div>

                  {/* ORG NM / Max NM */}
                  <div className="bg-gray-900 px-4 py-1 rounded text-xs text-white flex flex-col items-start w-auto">
                    <p className="text-white">- - -</p>
                    <p className="text-white">NM ORG: {stage.origNm} NM</p>
                    <p className="text-white">_____</p>
                    <p className="text-white">
                      NM{" "}
                      {stage.name
                        .replace("Steg", "ST")
                        .replace(/\s+/g, "")
                        .toUpperCase()}
                      : {stage.tunedNm} NM
                    </p>
                  </div>
                </div>

                {/* Dyno graph */}
                <Line
                  data={{
                    labels: rpmLabels,
                    datasets: [
                      {
                        label: "ORG HK",
                        data: generateDynoCurve(
                          stage.origHk,
                          true,
                          engineData.fuel,
                        ),
                        borderColor: "#f87171",
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        borderDash: [5, 3],
                        tension: 0.5,
                        pointRadius: 0,
                        yAxisID: "hp",
                      },
                      {
                        label: `ST ${stage.name.replace(/\D/g, "")} HK`,
                        data: generateDynoCurve(
                          stage.tunedHk,
                          true,
                          engineData.fuel,
                        ),
                        borderColor: "#f87171",
                        backgroundColor: "#f87171",
                        borderWidth: 3,
                        tension: 0.5,
                        pointRadius: 0,
                        yAxisID: "hp",
                      },
                      {
                        label: "ORG NM",
                        data: generateDynoCurve(
                          stage.origNm,
                          false,
                          engineData.fuel,
                        ),
                        borderColor: "#d1d5db",
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        borderDash: [5, 3],
                        tension: 0.5,
                        pointRadius: 0,
                        yAxisID: "nm",
                      },
                      {
                        label: `ST ${stage.name.replace(/\D/g, "")} NM`,
                        data: generateDynoCurve(
                          stage.tunedNm,
                          false,
                          engineData.fuel,
                        ),
                        borderColor: "#d1d5db",
                        backgroundColor: "transparent",
                        borderWidth: 3,
                        tension: 0.5,
                        pointRadius: 0,
                        yAxisID: "nm",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        enabled: true,
                        mode: "index",
                        intersect: false,
                        backgroundColor: "#1f2937",
                        titleColor: "#ffffff",
                        bodyColor: "#ffffff",
                        borderColor: "#6b7280",
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        usePointStyle: true, // ✅ this enables circle style
                        callbacks: {
                          labelPointStyle: () => ({
                            pointStyle: "circle", // ✅ make symbol a circle
                            rotation: 0,
                          }),
                          title: function (tooltipItems) {
                            // tooltipItems[0].label will be the RPM (e.g., "4000")
                            return `${tooltipItems[0].label} RPM`;
                          },
                          label: function (context) {
                            const label = context.dataset.label || "";
                            const value = context.parsed.y;

                            // Guard for undefined value
                            if (value === undefined) return label;

                            const unit =
                              context.dataset.yAxisID === "hp" ? "hk" : "Nm";
                            return `${label}: ${Math.round(value)} ${unit}`;
                          },
                        },
                      },
                    },
                    scales: {
                      hp: {
                        type: "linear",
                        display: true,
                        position: "left",
                        title: {
                          display: true,
                          text: translate(currentLanguage, "powerLabel"),
                          color: "white",
                          font: { size: 14 },
                        },
                        min: 0,
                        max: Math.ceil(stage.tunedHk / 100) * 100 + 100,
                        grid: {
                          color: "rgba(255, 255, 255, 0.1)",
                        },
                        ticks: {
                          color: "#9CA3AF",
                          stepSize: 100,
                          callback: (value) => `${value}`,
                        },
                      },
                      nm: {
                        type: "linear",
                        display: true,
                        position: "right",
                        title: {
                          display: true,
                          text: translate(currentLanguage, "torqueLabel"),
                          color: "white",
                          font: { size: 14 },
                        },
                        min: 0,
                        max: Math.ceil(stage.tunedNm / 100) * 100 + 100,
                        grid: {
                          drawOnChartArea: false,
                        },
                        ticks: {
                          color: "#9CA3AF",
                          stepSize: 100,
                          callback: (value) => `${value}`,
                        },
                      },
                      x: {
                        title: {
                          display: true,
                          text: "RPM",
                          color: "#E5E7EB",
                          font: { size: 14 },
                        },
                        grid: {
                          color: "rgba(255, 255, 255, 0.1)",
                        },
                        ticks: {
                          color: "#9CA3AF",
                        },
                      },
                    },
                    interaction: {
                      intersect: false,
                      mode: "index",
                    },
                  }}
                  plugins={[watermarkPlugin, shadowPlugin]}
                />

                <div className="text-center text-white text-xs mt-4 italic">
                  {translate(currentLanguage, "tuningCurveNote")}
                </div>
              </div>
            )}

            {/* small tuned specs */}
            {!isDsgStage && (
              <div className="mt-8 mb-10">
                {/* Performance Summary */}
                <div className="text-center mb-6">
                  <p className="text-lg font-semibold text-white">
                    {translate(currentLanguage, "tuningIntro")}{" "}
                    <span className={getStageColor(stage.name)}>
                      {stage.name
                        .replace(
                          "Steg",
                          translate(currentLanguage, "stageLabel"),
                        )
                        .toUpperCase()}
                    </span>
                  </p>
                  <p className="text-gray-300 mt-1">
                    {stage.tunedHk} HK (+{hkIncrease}) & {stage.tunedNm} NM (+
                    {nmIncrease})
                  </p>
                </div>

                {/* Action Buttons Grid */}
                <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                  {/* Contact Button (Primary) - Now Green */}
                  <button
                    onClick={() => handleBookNow(stage.name)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
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
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {translate(currentLanguage, "contactvalue")}
                  </button>

                  {/* Social Media Links - Now centered underneath */}
                  <div className="flex items-center justify-center space-x-2">
                    <a
                      href="https://www.facebook.com/aktuned"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg flex items-center justify-center transition-colors"
                      aria-label="Facebook"
                    >
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                      </svg>
                    </a>
                    <a
                      href="https://www.instagram.com/aktuning.se"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 p-3 rounded-lg flex items-center justify-center transition-colors"
                      aria-label="Instagram"
                    >
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isDsgStage && allOptions.length > 0 && (
            <div className="mt-8">
              {/* AKT+ Toggle Button */}
              <button
                onClick={() => toggleAktPlus(stage.name)}
                className="flex justify-between items-center w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <img
                    src="/logos/aktplus.png"
                    alt="AKT+ Logo"
                    className="h-8 w-auto object-contain"
                    width="120"
                    height="32"
                  />
                  <h3 className="text-md font-semibold text-white">
                    {translate(currentLanguage, "additionsLabel")}
                  </h3>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800">
                  <svg
                    className={`h-5 w-5 text-orange-500 transform transition-transform duration-300 ${
                      expandedAktPlus[stage.name] ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </button>

              {/* Expandable AKT+ Grid */}
              {expandedAktPlus[stage.name] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {allOptions.map((option) => {
                    const translatedTitle =
                      option.title?.[currentLanguage] || option.title?.sv || "";
                    const translatedDescription =
                      option.description?.[currentLanguage] ||
                      option.description?.sv;

                    return (
                      <div
                        key={option._id}
                        className="border border-gray-600 rounded-lg overflow-hidden bg-gray-700 transition-all duration-300"
                      >
                        <button
                          onClick={() => toggleOption(option._id)}
                          className="w-full flex justify-between items-center p-4 hover:bg-gray-600 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {option.gallery?.[0]?.asset && (
                              <img
                                src={urlFor(option.gallery[0].asset)
                                  .width(80)
                                  .url()}
                                alt={
                                  option.gallery[0].alt ||
                                  translatedTitle ||
                                  "AKT+"
                                }
                                className="h-10 w-10 object-contain"
                              />
                            )}
                            <span className="text-lg font-bold text-orange-600">
                              {translatedTitle}
                            </span>
                          </div>

                          <svg
                            className={`h-5 w-5 text-orange-600 transition-transform ${
                              expandedOptions[option._id] ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>

                        {expandedOptions[option._id] && (
                          <div className="bg-gray-800 border-t border-gray-600 p-4 space-y-4">
                            {translatedDescription && (
                              <div className="prose prose-invert max-w-none text-sm">
                                <PortableText
                                  value={translatedDescription}
                                  components={portableTextComponents}
                                />
                              </div>
                            )}

                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              {option.price && (
                                <p className="font-bold text-green-400">
                                  {translate(currentLanguage, "priceLabel")}:{" "}
                                  {option.price.toLocaleString()} kr
                                </p>
                              )}

                              <button
                                onClick={() => handleBookNow(translatedTitle)}
                                className="bg-green-600 hover:bg-green-700 hover:scale-105 transform transition-all text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                              >
                                📩 {translate(currentLanguage, "contactvalue")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StageDetails;
