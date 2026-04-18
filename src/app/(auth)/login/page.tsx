import { redirect } from "next/navigation";
import { readSessionCookie } from "@/lib/auth/session";
import LoginForm from "./login-form";
import { getLocale } from "@/lib/preferences";

export const metadata = {
  title: "تسجيل الدخول — Trend PM",
};

export default async function LoginPage() {
  const payload = await readSessionCookie();
  if (payload?.sub) redirect("/dashboard");
  const locale = await getLocale();
  return <LoginForm locale={locale} />;
}
