import React from "react";
import {t as translate} from "@/lib/translations";

const langNames: Record<string, string> = {
  sv: "Svenska",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  da: "Dansk",
  it: "Italiano",
  no: "Norsk",
};

const langFlags: Record<string, string> = {
  sv: "🇸🇪",
  en: "🇬🇧",
  de: "🇩🇪",
  fr: "🇫🇷",
  da: "🇩🇰",
  it: "🇮🇹",
  no: "🇳🇴",
};

const availableLanguages = ["sv", "en", "fr", "da", "no", "de", "it"];

type Props = {
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
};

export default function PublicLanguageSwitcher({
  currentLanguage,
  setCurrentLanguage,
}: Props) {
  const nextLangs = availableLanguages.filter(l => l !== currentLanguage);

  return (
    <div className="flex gap-2">
      {nextLangs.map(nextLang => (
        <button
          key={nextLang}
          onClick={() => setCurrentLanguage(nextLang)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-700 transition"
          title={`Byt språk till ${langNames[nextLang] || nextLang.toUpperCase()}`}
        >
          <span className="text-xl">{langFlags[nextLang] || "🌐"}</span>
          <span className="font-medium">
            {translate(currentLanguage, "switchLanguage")}{" "}
            {langNames[nextLang] || nextLang.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}
