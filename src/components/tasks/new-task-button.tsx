"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/modal";
import { Icon } from "@/components/icon";
import { createTask } from "@/app/actions/tasks";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/db/schema";

export type TaskAssigneeOption = {
  id: string;
  name: string;
  initials: string | null;
};

export default function NewTaskButton({
  projectId,
  assignees,
  label,
  locale,
  defaultStatus,
  compact,
}: {
  projectId: string;
  assignees: TaskAssigneeOption[];
  label?: string;
  locale: "ar" | "en";
  defaultStatus?: (typeof TASK_STATUSES)[number];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    const title = String(formData.get("title") || "").trim();
    const status =
      (formData.get("status") as (typeof TASK_STATUSES)[number]) || defaultStatus || "todo";
    const priority =
      (formData.get("priority") as (typeof TASK_PRIORITIES)[number]) || "medium";
    const dueDate = (formData.get("dueDate") as string) || null;
    const assigneeIds = formData.getAll("assigneeIds").map(String).filter(Boolean);

    if (!title) {
      setError(locale === "ar" ? "العنوان مطلوب." : "Title is required.");
      return;
    }

    startTransition(async () => {
      try {
        await createTask({ projectId, title, status, priority, dueDate, assigneeIds });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <>
      {compact ? (
        <button
          type="button"
          className="col-add-btn"
          onClick={() => setOpen(true)}
        >
          <Icon name="plus" size={12} />
          <span>{label ?? (locale === "ar" ? "مهمة جديدة" : "Add task")}</span>
        </button>
      ) : (
        <button
          className="btn primary sm"
          type="button"
          onClick={() => setOpen(true)}
        >
          <Icon name="plus" size={12} /> {label ?? (locale === "ar" ? "مهمة جديدة" : "New task")}
        </button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={locale === "ar" ? "مهمة جديدة" : "New task"}
      >
        <form action={handleSubmit} className="form-grid">
          <label className="form-field">
            <span>{locale === "ar" ? "عنوان المهمة" : "Task title"} *</span>
            <input
              name="title"
              type="text"
              required
              autoFocus
              maxLength={200}
              placeholder={locale === "ar" ? "مثل: تصميم الصفحة الرئيسية" : "e.g. Design homepage"}
            />
          </label>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label className="form-field">
              <span>{locale === "ar" ? "الحالة" : "Status"}</span>
              <select name="status" defaultValue={defaultStatus ?? "todo"}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{locale === "ar" ? "الأولوية" : "Priority"}</span>
              <select name="priority" defaultValue="medium">
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabel(p, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>{locale === "ar" ? "تاريخ الاستحقاق" : "Due date"}</span>
            <input name="dueDate" type="date" />
          </label>

          {assignees.length > 0 && (
            <div className="form-field">
              <span>{locale === "ar" ? "المسؤولون" : "Assignees"}</span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  padding: 8,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--bg-0)",
                  maxHeight: 160,
                  overflowY: "auto",
                }}
              >
                {assignees.map((a) => (
                  <label
                    key={a.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 8px",
                      background: "var(--bg-1)",
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="assigneeIds"
                      value={a.id}
                      style={{ margin: 0 }}
                    />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
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
                  ? "جاري الإنشاء…"
                  : "Creating…"
                : locale === "ar"
                ? "إنشاء"
                : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function statusLabel(s: (typeof TASK_STATUSES)[number], locale: "ar" | "en"): string {
  const ar: Record<typeof s, string> = {
    todo: "للعمل",
    in_progress: "قيد التنفيذ",
    in_review: "قيد المراجعة",
    blocked: "معلَّقة",
    done: "مكتملة",
  };
  const en: Record<typeof s, string> = {
    todo: "To do",
    in_progress: "In progress",
    in_review: "In review",
    blocked: "Blocked",
    done: "Done",
  };
  return locale === "ar" ? ar[s] : en[s];
}

function priorityLabel(p: (typeof TASK_PRIORITIES)[number], locale: "ar" | "en"): string {
  const ar: Record<typeof p, string> = {
    low: "منخفضة",
    medium: "متوسطة",
    high: "عالية",
    critical: "حرجة",
  };
  const en: Record<typeof p, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return locale === "ar" ? ar[p] : en[p];
}
