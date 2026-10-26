import { en, type Dictionary, type MessageKey } from "./en";
import { pt } from "./pt";
import { LOCALES, type Locale } from "../types";

export type { Dictionary, MessageKey };
export { en, pt };

/**
 * Register a language here after adding its dictionary.
 * `Locale` in `lib/types.ts` must include the new code, and `languageName`
 * below must name it for the model prompts.
 */
export const dictionaries: Record<Locale, Dictionary> = { en, pt };

export const localeList: Locale[] = [...LOCALES];

export function languageName(locale: Locale): string {
  switch (locale) {
    case "pt":
      return "Portuguese (Portugal)";
    case "en":
      return "English";
    default: {
      const _exhaustive: never = locale;
      return _exhaustive;
    }
  }
}

export function t(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const table = dictionaries[locale] ?? en;
  let text: string = table[key] ?? en[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function localizedProse(
  locale: Locale,
  item: {
    summaryKey?: string;
    summaryParams?: Record<string, string>;
    summaryText?: string;
    summaryLocale?: string;
    rationaleKey?: string;
    rationaleParams?: Record<string, string>;
    rationaleText?: string;
    rationaleLocale?: string;
  },
): string {
  const text = item.summaryText ?? item.rationaleText;
  const textLocale = item.summaryLocale ?? item.rationaleLocale;
  if (text && textLocale === locale) return text;
  const key = (item.summaryKey ?? item.rationaleKey) as MessageKey | undefined;
  const params = item.summaryParams ?? item.rationaleParams;
  if (key) return t(locale, key, params);
  return text ?? "";
}
