import React from "react";
import {t} from "@/lib/translations";

const langNames: Record<string, string> = {
  sv: "SVENSKA",
  en: "ENGLISH",
  no: "NORSK",
  da: "DANSK",
  de: "DEUTSCH",
  fr: "FRANÇAIS",
  it: "ITALIANO",
};

const langFlags: Record<string, string> = {
  sv: "🇸🇪",
  en: "🇬🇧",
  no: "🇳🇴",
  da: "🇩🇰",
  de: "🇩🇪",
  fr: "🇫🇷",
  it: "🇮🇹",
};

type Props = {
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
};

export default function PublicLanguageDropdown({
  currentLanguage,
  setCurrentLanguage,
}: Props) {
  return (
    <div className="relative">
      <select
        value={currentLanguage}
        onChange={e => setCurrentLanguage(e.target.value)}
        className="appearance-none bg-gray-800 text-white border border-gray-600 rounded-md px-4 py-2 pr-8 shadow-sm text-sm focus:outline-none hover:bg-gray-700 transition"
      >
        {Object.keys(langNames).map(lang => (
          <option key={lang} value={lang}>
            {langFlags[lang] || "🌐"} {langNames[lang]}
          </option>
        ))}
      </select>
    </div>
  );
}
