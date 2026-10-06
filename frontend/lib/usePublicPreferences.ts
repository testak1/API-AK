import {useEffect, useState} from "react";

export type PublicTheme = "light" | "dark";

export function usePublicPreferences() {
  const [themeMode, setThemeMode] = useState<PublicTheme>("dark");
  const [currentLanguage, setCurrentLanguage] = useState("sv");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("themeMode");
    const savedLanguage = localStorage.getItem("lang");

    if (savedTheme === "light" || savedTheme === "dark") {
      setThemeMode(savedTheme);
    }
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    localStorage.setItem("themeMode", themeMode);
    localStorage.setItem("lang", currentLanguage);
  }, [currentLanguage, preferencesLoaded, themeMode]);

  return {
    currentLanguage,
    setCurrentLanguage,
    themeMode,
    isDarkTheme: themeMode === "dark",
    toggleTheme: () =>
      setThemeMode(current => (current === "dark" ? "light" : "dark")),
  };
}
