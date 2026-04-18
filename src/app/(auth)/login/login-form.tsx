"use client";

import { useActionState } from "react";
import { signInAction, type AuthState } from "@/app/actions/auth";

export default function LoginForm({ locale }: { locale: "ar" | "en" }) {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    signInAction,
    null
  );
  const ar = locale === "ar";

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">T</span>
          <div>
            <div className="auth-title">Trend PM</div>
            <div className="auth-sub">
              {ar ? "منصة إدارة المشاريع والمهام" : "Project & task management"}
            </div>
          </div>
        </div>

        <h1 className="auth-h1">{ar ? "تسجيل الدخول" : "Sign in"}</h1>
        <p className="auth-p">
          {ar ? "أدخل بياناتك للدخول إلى لوحتك." : "Enter your credentials to access your dashboard."}
        </p>

        <form action={action} className="auth-form">
          <label className="auth-label">
            <span>{ar ? "البريد الإلكتروني" : "Email"}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              dir="ltr"
            />
          </label>

          <label className="auth-label">
            <span>{ar ? "كلمة المرور" : "Password"}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              dir="ltr"
            />
          </label>

          {state && !state.ok && (
            <div className="auth-error" role="alert">
              {state.error}
            </div>
          )}

          <button className="btn primary auth-submit" type="submit" disabled={pending}>
            {pending ? (ar ? "جاري الدخول…" : "Signing in…") : ar ? "دخول" : "Sign in"}
          </button>
        </form>

        <div className="auth-foot">
          {ar
            ? "ليس لديك حساب؟ تواصل مع مدير المساحة لإضافتك."
            : "No account? Ask your workspace admin to invite you."}
        </div>
      </div>
    </div>
  );
}
