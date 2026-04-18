import ar from "./ar.json";
import en from "./en.json";

export type Locale = "ar" | "en";
export type Dictionary = typeof ar;

export const LOCALES: Locale[] = ["ar", "en"];
export const DEFAULT_LOCALE: Locale = "ar";

export const dictionaries: Record<Locale, Dictionary> = { ar, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
