"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ur";

// Translations mapping strictly for site keys
const dictionary: Record<Language, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.features": "Features",
    "nav.howItWorks": "How It Works",
    "nav.pricing": "Pricing",
    "nav.about": "About",
  },
  ur: {
    "nav.home": "ہوم",
    "nav.features": "خصوصیات",
    "nav.howItWorks": "طریقہ کار",
    "nav.pricing": "قیمت",
    "nav.about": "ہمارے بارے میں",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  showLanguageModal: boolean;
  setShowLanguageModal: (show: boolean) => void;
  closeLanguageModal: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("app_lang") as Language;
    if (savedLang) {
      setLanguageState(savedLang);
    } else {
      setShowLanguageModal(true);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_lang", lang);
  };

  const closeLanguageModal = () => setShowLanguageModal(false);

  const t = (key: string): string => {
    return dictionary[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        showLanguageModal,
        setShowLanguageModal,
        closeLanguageModal,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};