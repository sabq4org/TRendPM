"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/primitives";
import { Icon } from "@/components/icon";
import { removeMemberAction, updateMemberRoleAction } from "@/app/actions/members";
import {
  WORKSPACE_ROLES,
  roleLabel,
  type WorkspaceRole,
} from "@/lib/workspace-roles";

type MemberRow = {
  memberId: string;
  userId: string;
  email: string;
  name: string;
  initials: string | null;
  hue: number | null;
  role: string;
  joinedAt: string;
  lastLoginAt: string | null;
};

export default function MembersTable({
  locale,
  currentUserId,
  members,
}: {
  locale: "ar" | "en";
  currentUserId: string;
  members: MemberRow[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onChangeRole = (memberId: string, role: WorkspaceRole) => {
    startTransition(async () => {
      const res = await updateMemberRoleAction({ memberId, role });
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  };

  const onRemove = (memberId: string, name: string) => {
    const msg =
      locale === "ar"
        ? `هل أنت متأكد من إزالة ${name} من مساحة العمل؟`
        : `Remove ${name} from the workspace?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await removeMemberAction({ memberId });
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  };

  if (members.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👥</div>
        <h2>{locale === "ar" ? "لا أعضاء بعد" : "No members yet"}</h2>
        <p>
          {locale === "ar"
            ? "ادعُ أعضاء فريقك للانضمام إلى مساحة العمل."
            : "Invite your teammates to join the workspace."}
        </p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>{locale === "ar" ? "العضو" : "Member"}</th>
            <th>{locale === "ar" ? "البريد" : "Email"}</th>
            <th>{locale === "ar" ? "الدور" : "Role"}</th>
            <th>{locale === "ar" ? "انضم في" : "Joined"}</th>
            <th>{locale === "ar" ? "آخر دخول" : "Last login"}</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            return (
              <tr key={m.memberId}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                      user={{
                        id: m.userId,
                        name: m.name,
                        initials: m.initials,
                        hue: m.hue,
                      }}
                      size="md"
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {m.name}
                        {isSelf && (
                          <span
                            style={{
                              marginInlineStart: 6,
                              fontSize: 11,
                              color: "var(--text-3)",
                              fontWeight: 400,
                            }}
                          >
                            ({locale === "ar" ? "أنت" : "you"})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="mono" style={{ color: "var(--text-2)" }}>
                  {m.email}
                </td>
                <td>
                  <select
                    value={m.role}
                    disabled={pending || isSelf}
                    onChange={(e) => onChangeRole(m.memberId, e.target.value as WorkspaceRole)}
                    className="role-select"
                  >
                    {WORKSPACE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r, locale)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="mono" style={{ color: "var(--text-3)" }}>
                  {new Date(m.joinedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                </td>
                <td className="mono" style={{ color: "var(--text-3)" }}>
                  {m.lastLoginAt
                    ? new Date(m.lastLoginAt).toLocaleDateString(
                        locale === "ar" ? "ar-SA" : "en-US"
                      )
                    : "—"}
                </td>
                <td>
                  {!isSelf && (
                    <button
                      type="button"
                      className="btn ghost icon sm"
                      aria-label="Remove"
                      disabled={pending}
                      onClick={() => onRemove(m.memberId, m.name)}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
