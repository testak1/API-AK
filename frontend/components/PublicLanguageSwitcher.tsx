import React, { useState } from "react";

const langOptions: { code: string; name: string; flag: string }[] = [
  { code: "sv", name: "SVENSKA", flag: "se" },
  { code: "en", name: "ENGLISH", flag: "gb" },
  { code: "no", name: "NORSK", flag: "no" },
  { code: "da", name: "DANSK", flag: "dk" },
  { code: "de", name: "DEUTSCH", flag: "de" },
  { code: "fr", name: "FRANÇAIS", flag: "fr" },
  { code: "it", name: "ITALIANO", flag: "it" },
];

type Props = {
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
};

export default function PublicLanguageDropdown({
  currentLanguage,
  setCurrentLanguage,
}: Props) {
  const selectedLang =
    langOptions.find((lang) => lang.code === currentLanguage) || langOptions[0];

  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex justify-center items-center w-full rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-800 text-sm font-medium text-white hover:bg-gray-700 transition"
      >
        <img
          src={`https://flagcdn.com/w40/${selectedLang.flag}.png`}
          alt={`${selectedLang.name} flag`}
          className="w-5 h-auto mr-2"
        />
        {selectedLang.name}
        <svg
          className="w-4 h-4 ml-2 -mr-1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-10 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black/10 focus:outline-none"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="py-1">
            <span className="block px-4 py-2 text-sm text-gray-400">
              🌐 Välj språk
            </span>
            {langOptions.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setCurrentLanguage(lang.code);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2"
              >
                <img
                  src={`https://flagcdn.com/w40/${lang.flag}.png`}
                  alt={`${lang.name} flag`}
                  className="w-5 h-auto"
                />
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
