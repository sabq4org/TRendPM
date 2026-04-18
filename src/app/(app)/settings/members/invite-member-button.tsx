"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/modal";
import { Icon } from "@/components/icon";
import { inviteMemberAction, type InviteState } from "@/app/actions/members";
import { WORKSPACE_ROLES, roleLabel } from "@/lib/workspace-roles";

export default function InviteMemberButton({ locale }: { locale: "ar" | "en" }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<InviteState, FormData>(
    inviteMemberAction,
    null
  );
  const router = useRouter();

  const handleClose = () => {
    setOpen(false);
    if (state?.ok) router.refresh();
  };

  return (
    <>
      <button
        className="btn primary sm"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" size={12} /> {locale === "ar" ? "دعوة عضو" : "Invite member"}
      </button>
      <Modal
        open={open}
        onClose={handleClose}
        title={locale === "ar" ? "دعوة عضو جديد" : "Invite new member"}
      >
        {state?.ok ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                padding: 14,
                background: "hsl(150 70% 45% / 0.08)",
                border: "1px solid hsl(150 70% 45% / 0.3)",
                borderRadius: 10,
                color: "hsl(150 70% 45%)",
                fontSize: 14,
              }}
            >
              {locale === "ar"
                ? "تمت الإضافة بنجاح."
                : "Member added successfully."}
            </div>

            {state.password && (
              <div>
                <div
                  style={{ fontSize: "var(--fs-sm)", marginBottom: 6, fontWeight: 500 }}
                >
                  {locale === "ar"
                    ? "شارك هذه البيانات مع العضو:"
                    : "Share these credentials with the member:"}
                </div>
                <div
                  style={{
                    background: "var(--bg-0)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                    fontFamily: "var(--mono, monospace)",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <b style={{ color: "var(--text-3)" }}>Email:</b> {state.email}
                  </div>
                  <div>
                    <b style={{ color: "var(--text-3)" }}>Password:</b> {state.password}
                  </div>
                </div>
                {state.generated && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--text-3)",
                    }}
                  >
                    {locale === "ar"
                      ? "كلمة المرور مولدة عشوائياً — لن تظهر مرة أخرى."
                      : "Password was auto-generated — won't be shown again."}
                  </div>
                )}
              </div>
            )}

            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button className="btn primary" type="button" onClick={handleClose}>
                {locale === "ar" ? "تم" : "Done"}
              </button>
            </div>
          </div>
        ) : (
          <form action={action} className="form-grid">
            <label className="form-field">
              <span>{locale === "ar" ? "الاسم" : "Name"} *</span>
              <input
                name="name"
                type="text"
                required
                maxLength={120}
                placeholder={locale === "ar" ? "الاسم الكامل" : "Full name"}
                autoFocus
              />
            </label>

            <label className="form-field">
              <span>{locale === "ar" ? "الاسم بالإنجليزية (اختياري)" : "English name (optional)"}</span>
              <input name="nameEn" type="text" maxLength={120} dir="ltr" />
            </label>

            <label className="form-field">
              <span>{locale === "ar" ? "البريد الإلكتروني" : "Email"} *</span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                dir="ltr"
              />
            </label>

            <label className="form-field">
              <span>{locale === "ar" ? "الدور" : "Role"}</span>
              <select name="role" defaultValue="member">
                {WORKSPACE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>
                {locale === "ar"
                  ? "كلمة المرور (اترك فارغاً للتوليد التلقائي)"
                  : "Password (leave empty to auto-generate)"}
              </span>
              <input
                name="password"
                type="text"
                minLength={8}
                maxLength={100}
                placeholder={locale === "ar" ? "اختياري" : "Optional"}
                autoComplete="off"
                dir="ltr"
              />
            </label>

            {state && !state.ok && (
              <div className="auth-error" role="alert">
                {state.error}
              </div>
            )}

            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}
            >
              <button
                type="button"
                className="btn ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button type="submit" className="btn primary" disabled={pending}>
                {pending
                  ? locale === "ar"
                    ? "جاري الحفظ…"
                    : "Saving…"
                  : locale === "ar"
                  ? "إضافة"
                  : "Add"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
