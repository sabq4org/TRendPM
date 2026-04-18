import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { listTeamsWithMembers, listWorkspaceUsers } from "@/app/actions/teams";
import TeamsClient from "./teams-client";

export const metadata = { title: "الفرق — Trend PM" };

export default async function TeamsPage() {
  const user = await requireUser();
  const locale = await getLocale();

  if (user.workspaceRole !== "admin") {
    return (
      <div style={{ padding: 24 }}>
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h2>{locale === "ar" ? "غير مخوَّل" : "Not authorized"}</h2>
          <p>
            {locale === "ar"
              ? "يحتاج الدخول لهذه الصفحة صلاحية مدير."
              : "This page requires admin role."}
          </p>
        </div>
      </div>
    );
  }

  const [teams, members] = await Promise.all([listTeamsWithMembers(), listWorkspaceUsers()]);

  return (
    <TeamsClient
      locale={locale}
      initialTeams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color,
        members: t.members.map((m) => ({
          id: m.userId,
          name: locale === "ar" ? m.name : m.nameEn ?? m.name,
          initials: m.initials,
          hue: m.hue,
        })),
      }))}
      allMembers={members.map((m) => ({
        id: m.id,
        name: locale === "ar" ? m.name : m.nameEn ?? m.name,
        initials: m.initials,
        hue: m.hue,
      }))}
    />
  );
}
