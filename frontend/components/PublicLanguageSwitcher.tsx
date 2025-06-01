import React from "react";

const availableLanguages = ["en", "fr", "da", "no", "de", "it"];

const languageNames: Record<string, string> = {
  en: "English",
  fr: "Français",
  da: "Dansk",
  no: "Norsk",
  de: "Deutsch",
  it: "Italiano",
};

type Props = {
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
};

export default function PublicLanguageSwitcher({
  currentLanguage,
  setCurrentLanguage,
}: Props) {
  return (
    <div className="relative inline-block">
      <select
        value={currentLanguage}
        onChange={e => setCurrentLanguage(e.target.value)}
        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none"
      >
        {availableLanguages.map(lang => (
          <option key={lang} value={lang}>
            {languageNames[lang]}
          </option>
        ))}
      </select>
    </div>
  );
}
