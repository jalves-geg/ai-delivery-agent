"use client";

import { t } from "@/lib/i18n";
import { LOCALES, type Locale } from "@/lib/types";
import { cn } from "cn";

const SHORT: Record<Locale, "language.shortEn" | "language.shortPt"> = {
  en: "language.shortEn",
  pt: "language.shortPt",
};

const FULL: Record<Locale, "language.en" | "language.pt"> = {
  en: "language.en",
  pt: "language.pt",
};

export function LanguageSwitcher({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div
      role="group"
      aria-label={t(locale, "language.label")}
      className="inline-flex rounded-full bg-muted p-0.5 ring-1 ring-border"
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          title={t(locale, FULL[code])}
          onClick={() => onChange(code)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors",
            locale === code
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(locale, SHORT[code])}
        </button>
      ))}
    </div>
  );
}
