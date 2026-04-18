"use client";

import { useActionState } from "react";
import { changePasswordAction, type AuthState } from "@/app/actions/auth";

export default function PasswordForm({ locale }: { locale: "ar" | "en" }) {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    changePasswordAction,
    null
  );

  return (
    <form action={action} className="form-grid">
      <label className="form-field">
        <span>{locale === "ar" ? "كلمة المرور الحالية" : "Current password"} *</span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
        />
      </label>
      <label className="form-field">
        <span>
          {locale === "ar"
            ? "كلمة المرور الجديدة (8 أحرف على الأقل)"
            : "New password (8 chars minimum)"} *
        </span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          dir="ltr"
        />
      </label>
      <label className="form-field">
        <span>{locale === "ar" ? "تأكيد كلمة المرور" : "Confirm new password"} *</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          dir="ltr"
        />
      </label>

      {state?.ok && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "hsl(150 70% 45% / 0.08)",
            border: "1px solid hsl(150 70% 45% / 0.3)",
            color: "hsl(150 70% 45%)",
            fontSize: "var(--fs-sm)",
          }}
          role="status"
        >
          {locale === "ar" ? "تم تغيير كلمة المرور بنجاح." : "Password updated successfully."}
        </div>
      )}
      {state && !state.ok && (
        <div className="auth-error" role="alert">
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <a href="/settings" className="btn ghost">
          {locale === "ar" ? "رجوع" : "Back"}
        </a>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending
            ? locale === "ar"
              ? "جاري الحفظ…"
              : "Saving…"
            : locale === "ar"
            ? "حفظ"
            : "Save"}
        </button>
      </div>
    </form>
  );
}
