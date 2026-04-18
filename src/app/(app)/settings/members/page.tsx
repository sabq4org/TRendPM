import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { getDictionary } from "@/lib/i18n";
import { listWorkspaceMembers } from "@/app/actions/members";
import MembersTable from "./members-table";
import InviteMemberButton from "./invite-member-button";

export const metadata = { title: "الأعضاء — Trend PM" };

export default async function MembersPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  void dict;

  if (user.workspaceRole !== "admin") {
    return (
      <div style={{ padding: 24 }}>
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h2>{locale === "ar" ? "غير مخوَّل" : "Not authorized"}</h2>
          <p>
            {locale === "ar"
              ? "يحتاج الدخول لهذه الصفحة صلاحية مدير (admin)."
              : "This page requires admin role."}
          </p>
        </div>
      </div>
    );
  }

  const members = await listWorkspaceMembers();

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{locale === "ar" ? "الأعضاء" : "Members"}</h1>
        <span className="chip">{members.length}</span>
        <div style={{ marginInlineStart: "auto" }}>
          <InviteMemberButton locale={locale} />
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <MembersTable
          locale={locale}
          currentUserId={user.id}
          members={members.map((m) => ({
            memberId: m.memberId,
            userId: m.userId,
            email: m.email,
            name: locale === "ar" ? m.name : m.nameEn ?? m.name,
            initials: m.initials,
            hue: m.hue,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
            lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </div>
  );
}
