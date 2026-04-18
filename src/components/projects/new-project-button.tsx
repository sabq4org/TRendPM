"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/modal";
import { Icon } from "@/components/icon";
import {
  createProjectAction,
  type CreateProjectState,
} from "@/app/actions/tasks";

const COLORS = [
  "#38BDF8",
  "#A855F7",
  "#F97316",
  "#10B981",
  "#EF4444",
  "#F59E0B",
  "#3B82F6",
  "#EC4899",
];

export default function NewProjectButton({
  label,
  locale,
}: {
  label: string;
  locale: "ar" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(
    createProjectAction,
    null
  );
  const [color, setColor] = useState(COLORS[0]);
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Close on success
  if (state?.ok && open) {
    setOpen(false);
    startTransition(() => {
      router.refresh();
      router.push(`/projects/${state.projectId}`);
    });
  }

  return (
    <>
      <button
        className="btn primary sm"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" size={12} /> {label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={locale === "ar" ? "مشروع جديد" : "New project"}
      >
        <form action={action} className="form-grid">
          <label className="form-field">
            <span>{locale === "ar" ? "اسم المشروع" : "Project name"} *</span>
            <input
              name="name"
              type="text"
              required
              maxLength={150}
              placeholder={locale === "ar" ? "مثل: حملة رمضان" : "e.g. Ramadan Campaign"}
            />
          </label>

          <label className="form-field">
            <span>{locale === "ar" ? "الاسم بالإنجليزية (اختياري)" : "English name (optional)"}</span>
            <input
              name="nameEn"
              type="text"
              maxLength={150}
              placeholder="e.g. Ramadan Campaign"
              dir="ltr"
            />
          </label>

          <label className="form-field">
            <span>{locale === "ar" ? "المفتاح (2–10 أحرف كبيرة)" : "Key (2–10 uppercase chars)"} *</span>
            <input
              name="key"
              type="text"
              required
              minLength={2}
              maxLength={10}
              placeholder="MKT"
              pattern="[A-Za-z0-9]+"
              style={{ textTransform: "uppercase", fontFamily: "var(--mono, monospace)" }}
              dir="ltr"
            />
            <small style={{ color: "var(--text-3)", fontSize: 12 }}>
              {locale === "ar"
                ? "يُستخدم لترميز المهام مثل MKT-1."
                : "Used to code tasks like MKT-1."}
            </small>
          </label>

          <label className="form-field">
            <span>{locale === "ar" ? "العميل (اختياري)" : "Client (optional)"}</span>
            <input name="client" type="text" maxLength={150} />
          </label>

          <div className="form-field">
            <span>{locale === "ar" ? "اللون" : "Color"}</span>
            <input type="hidden" name="color" value={color} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: c,
                    border:
                      color === c ? "2px solid var(--text-1)" : "2px solid transparent",
                    cursor: "pointer",
                    outline: "none",
                  }}
                />
              ))}
            </div>
          </div>

          <label className="form-field">
            <span>{locale === "ar" ? "الحالة" : "Status"}</span>
            <select name="status" defaultValue="active">
              <option value="planning">{locale === "ar" ? "تخطيط" : "Planning"}</option>
              <option value="active">{locale === "ar" ? "نشط" : "Active"}</option>
              <option value="on_hold">{locale === "ar" ? "معلَّق" : "On hold"}</option>
              <option value="completed">{locale === "ar" ? "مكتمل" : "Completed"}</option>
            </select>
          </label>

          {state && !state.ok && (
            <div className="auth-error" role="alert">
              {state.error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
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
                  ? "جاري الإنشاء…"
                  : "Creating…"
                : locale === "ar"
                ? "إنشاء المشروع"
                : "Create project"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
