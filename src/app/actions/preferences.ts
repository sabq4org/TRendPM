"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PREF_COOKIES } from "@/lib/preferences";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: "ar" | "en") {
  const c = await cookies();
  c.set(PREF_COOKIES.locale, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function setThemeAction(theme: "dark" | "light") {
  const c = await cookies();
  c.set(PREF_COOKIES.theme, theme, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function setAccentAction(accent: number) {
  const c = await cookies();
  c.set(PREF_COOKIES.accent, String(accent), { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}
