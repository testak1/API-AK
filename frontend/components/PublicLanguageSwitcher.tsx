import React from "react";

const langOptions: { code: string; name: string }[] = [
  { code: "se", name: "SVENSKA" },
  { code: "gb", name: "ENGLISH" },
  { code: "no", name: "NORSK" },
  { code: "dk", name: "DANSK" },
  { code: "de", name: "DEUTSCH" },
  { code: "fr", name: "FRANÇAIS" },
  { code: "it", name: "ITALIANO" },
];

type Props = {
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
};

export default function PublicLanguageDropdown({
  currentLanguage,
  setCurrentLanguage,
}: Props) {
  return (
    <div className="relative inline-block">
      <label htmlFor="language-select" className="sr-only">
        Välj språk
      </label>
      <select
        id="language-select"
        value={currentLanguage}
        onChange={(e) => setCurrentLanguage(e.target.value)}
        className="appearance-none bg-gray-800 text-white border border-gray-600 rounded-md px-4 py-2 pr-10 text-sm shadow-md focus:outline-none hover:bg-gray-700 transition"
      >
        <option disabled value="choose">
          🌐 Välj språk
        </option>
        {langOptions.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>

      {/* Flag overlay */}
      <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2">
        <img
          src={`https://flagcdn.com/w40/${currentLanguage}.png`}
          alt="Flag"
          className="w-5 h-auto rounded shadow-sm"
        />
      </div>
    </div>
  );
}
