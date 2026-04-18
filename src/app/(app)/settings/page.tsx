import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getAccent, getLocale, getTheme } from "@/lib/preferences";
import { Avatar } from "@/components/primitives";
import AccentPicker from "@/components/accent-picker";

export default async function SettingsPage() {
  const [user, locale, theme, accent] = await Promise.all([
    requireUser(),
    getLocale(),
    getTheme(),
    getAccent(),
  ]);
  const dict = getDictionary(locale);

  const isAdmin = user.workspaceRole === "admin";

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
                {locale === "ar" ? "دور مساحة العمل:" : "Workspace role:"} {user.workspaceRole}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "مساحة العمل" : "Workspace"}</h3>
          </div>
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>
              {isAdmin
                ? locale === "ar"
                  ? "إدارة الأعضاء والفرق في مساحة العمل."
                  : "Manage members and teams in your workspace."
                : locale === "ar"
                  ? "للإدارة تحتاج صلاحية مدير."
                  : "You need admin access to manage these."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="btn" href="/settings/members">
                {locale === "ar" ? "الأعضاء" : "Members"}
              </a>
              <a className="btn" href="/settings/teams">
                {locale === "ar" ? "الفرق" : "Teams"}
              </a>
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
            <h3>{locale === "ar" ? "الحساب" : "Account"}</h3>
          </div>
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>
              {locale === "ar"
                ? "يمكنك تغيير كلمة المرور أو تسجيل الخروج من هنا."
                : "Change your password or sign out from here."}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a className="btn" href="/settings/password">
                {locale === "ar" ? "تغيير كلمة المرور" : "Change password"}
              </a>
              <form action="/api/auth/signout" method="post">
                <button className="btn ghost" type="submit">
                  {locale === "ar" ? "تسجيل الخروج" : "Sign out"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
