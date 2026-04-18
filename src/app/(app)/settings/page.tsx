import { getCurrentUser, supabaseEnabled } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getAccent, getLocale, getTheme } from "@/lib/preferences";
import { Avatar } from "@/components/primitives";
import AccentPicker from "@/components/accent-picker";

export default async function SettingsPage() {
  const [user, locale, theme, accent] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTheme(),
    getAccent(),
  ]);
  const dict = getDictionary(locale);

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{dict.settings}</h1>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
        <div className="panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "الحساب" : "Account"}</h3>
          </div>
          <div style={{ padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
            <Avatar user={user} size="lg" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: "var(--fs-md)", fontWeight: 600 }}>
                {locale === "ar" ? user.name : user.nameEn ?? user.name}
              </div>
              <div style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>
                {user.email}
              </div>
              <div style={{ color: "var(--text-4)", fontSize: "var(--fs-xs)" }}>
                {user.role}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "المظهر" : "Appearance"}</h3>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ marginBottom: 8, fontSize: "var(--fs-sm)", color: "var(--text-3)" }}>
                {locale === "ar" ? "السمة" : "Theme"}
              </div>
              <div style={{ display: "inline-flex", gap: 8 }}>
                <span
                  className="chip"
                  style={{
                    borderColor: theme === "dark" ? "var(--accent)" : undefined,
                    color: theme === "dark" ? "var(--accent)" : undefined,
                  }}
                >
                  {locale === "ar" ? "داكن" : "Dark"}
                </span>
                <span
                  className="chip"
                  style={{
                    borderColor: theme === "light" ? "var(--accent)" : undefined,
                    color: theme === "light" ? "var(--accent)" : undefined,
                  }}
                >
                  {locale === "ar" ? "فاتح" : "Light"}
                </span>
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: "var(--fs-xxs)",
                  color: "var(--text-4)",
                }}
              >
                {locale === "ar"
                  ? "استخدم زر الشمس/القمر في الشريط العلوي للتبديل."
                  : "Use the sun/moon icon in the topbar to toggle."}
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 8, fontSize: "var(--fs-sm)", color: "var(--text-3)" }}>
                {locale === "ar" ? "اللون الرئيسي" : "Accent color"}
              </div>
              <AccentPicker current={accent} />
            </div>

            <div>
              <div style={{ marginBottom: 8, fontSize: "var(--fs-sm)", color: "var(--text-3)" }}>
                {locale === "ar" ? "اللغة" : "Language"}
              </div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>
                {locale === "ar" ? "العربية (RTL)" : "English (LTR)"}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "المصادقة" : "Authentication"}</h3>
          </div>
          <div style={{ padding: 16, fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>
            {supabaseEnabled() ? (
              <span>
                {locale === "ar"
                  ? "Supabase Auth مُفعَّل. جلسة المستخدم تُقرأ من ملفات تعريف الارتباط."
                  : "Supabase Auth is enabled. User session is read from cookies."}
              </span>
            ) : (
              <div>
                <div style={{ color: "var(--s-late)" }}>
                  {locale === "ar"
                    ? "وضع التطوير: Supabase غير مُعَدّ."
                    : "Dev mode: Supabase is not configured."}
                </div>
                <div style={{ marginTop: 6, color: "var(--text-3)" }}>
                  {locale === "ar"
                    ? "أضف متغيرات NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY في .env.local لتفعيل Auth الحقيقي."
                    : "Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env.local to enable real auth."}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
