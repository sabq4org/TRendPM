import { cookies } from "next/headers";
import type { Locale } from "./i18n";

export type Theme = "dark" | "light";

const COOKIE_LOCALE = "trendpm_locale";
const COOKIE_THEME = "trendpm_theme";
const COOKIE_ACCENT = "trendpm_accent";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(COOKIE_LOCALE)?.value;
  return v === "en" ? "en" : "ar";
}

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const v = store.get(COOKIE_THEME)?.value;
  return v === "light" ? "light" : "dark";
}

export async function getAccent(): Promise<number> {
  const store = await cookies();
  const v = Number(store.get(COOKIE_ACCENT)?.value);
  return Number.isFinite(v) && v > 0 ? v : 162;
}

export const PREF_COOKIES = {
  locale: COOKIE_LOCALE,
  theme: COOKIE_THEME,
  accent: COOKIE_ACCENT,
};
