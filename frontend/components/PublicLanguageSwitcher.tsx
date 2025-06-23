import React, { useState } from "react";

const languages = [
  { code: "sv", name: "SVENSKA" },
  { code: "en", name: "ENGLISH" },
  { code: "no", name: "NORSK" },
  { code: "da", name: "DANSK" },
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
  const [open, setOpen] = useState(false);

  const selected = languages.find((l) => l.code === currentLanguage);

  return (
    <div className="relative inline-block text-left z-50">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 bg-gray-800 text-white border border-gray-600 rounded-md px-4 py-2 shadow-sm text-sm hover:bg-gray-700 transition"
      >
        {selected ? (
          <>
            <img
              src={`https://flagcdn.com/w40/${selected.code}.png`}
              alt={selected.name}
              className="w-5 h-4 object-cover"
            />
            {selected.name}
          </>
        ) : (
          <>🌐 Välj språk</>
        )}
        <svg
          className="w-4 h-4 ml-2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg overflow-hidden">
          <button
            disabled
            className="w-full text-left px-4 py-2 text-sm text-gray-500 bg-gray-800 font-semibold cursor-default"
          >
            🌐 Välj språk
          </button>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setCurrentLanguage(lang.code);
                setOpen(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-white hover:bg-gray-700 transition"
            >
              <img
                src={`https://flagcdn.com/w40/${lang.code}.png`}
                alt={lang.name}
                className="w-5 h-4 object-cover"
              />
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
