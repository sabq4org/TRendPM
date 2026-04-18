import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import PasswordForm from "./password-form";

export const metadata = { title: "تغيير كلمة المرور — Trend PM" };

export default async function ChangePasswordPage() {
  await requireUser();
  const locale = await getLocale();

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{locale === "ar" ? "تغيير كلمة المرور" : "Change password"}</h1>
      </div>
      <div style={{ padding: 16, maxWidth: 480 }}>
        <div className="panel">
          <div style={{ padding: 20 }}>
            <PasswordForm locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
