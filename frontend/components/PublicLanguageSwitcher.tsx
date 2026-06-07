import React, {useState} from "react";
import Image from "next/image";
import {t as translate} from "@/lib/translations";

const langOptions: {code: string; name: string; flag: string}[] = [
  {code: "sv", name: "SVENSKA", flag: "se"},
  {code: "en", name: "ENGLISH", flag: "gb"},
  {code: "no", name: "NORSK", flag: "no"},
  {code: "da", name: "DANSK", flag: "dk"},
  {code: "de", name: "DEUTSCH", flag: "de"},
  {code: "fr", name: "FRANÇAIS", flag: "fr"},
  {code: "it", name: "ITALIANO", flag: "it"},
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
    langOptions.find(lang => lang.code === currentLanguage) || langOptions[0];

  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex w-full items-center justify-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-700"
      >
        <Image
          src={`/flags/${selectedLang.flag}.png`}
          alt={`${selectedLang.name} flag`}
          width={40}
          height={25}
          className="mr-2 h-auto w-5"
          priority
        />

        {selectedLang.name}

        <svg
          className="-mr-1 ml-2 h-4 w-4"
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
          className="absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/10 focus:outline-none"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="py-1">
            <span className="block px-4 py-2 text-sm text-gray-500">
              🌐 {translate(currentLanguage, "lang")}
            </span>

            {langOptions.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setCurrentLanguage(lang.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
              >
                <Image
                  src={`/flags/${lang.flag}.png`}
                  alt={`${lang.name} flag`}
                  width={40}
                  height={25}
                  className="h-auto w-5"
                  loading="lazy"
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
