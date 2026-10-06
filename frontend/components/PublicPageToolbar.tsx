import Image from "next/image";
import Link from "next/link";
import {Moon, Sun} from "lucide-react";

type PublicPageToolbarProps = {
  isDarkTheme: boolean;
  toggleTheme: () => void;
};

export default function PublicPageToolbar({
  isDarkTheme,
  toggleTheme,
}: PublicPageToolbarProps) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <Link href="/" aria-label="Till startsidan">
        <Image
          src={isDarkTheme ? "/ak-logo.png" : "/ak-logo2.png"}
          alt="AK-TUNING MOTOROPTIMERING"
          width={110}
          height={120}
          className="h-auto w-[110px] object-contain transition-opacity hover:opacity-90"
          priority
        />
      </Link>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className={`rounded-full border p-2.5 shadow-sm transition-all ${
            isDarkTheme
              ? "border-zinc-700 bg-zinc-900 text-yellow-300 hover:bg-zinc-800"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          }`}
          aria-label={isDarkTheme ? "Byt till ljust tema" : "Byt till mörkt tema"}
          title={isDarkTheme ? "Byt till ljust tema" : "Byt till mörkt tema"}
        >
          {isDarkTheme ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
