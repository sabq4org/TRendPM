"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { deleteProject } from "@/app/actions/tasks";

export default function ProjectRowActions({
  projectId,
  projectName,
  locale,
}: {
  projectId: string;
  projectName: string;
  locale: "ar" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleDelete = () => {
    const msg =
      locale === "ar"
        ? `هل أنت متأكد من حذف المشروع "${projectName}"؟ سيتم حذف جميع مهامه.`
        : `Are you sure you want to delete "${projectName}"? All its tasks will also be removed.`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      try {
        await deleteProject({ projectId });
        router.refresh();
      } catch (err) {
        alert((err as Error).message);
      }
    });
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn ghost icon sm"
        aria-label="Actions"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Icon name="moreV" size={14} />
      </button>
      {open && (
        <div className="user-menu" style={{ minWidth: 160 }} role="menu">
          <button
            type="button"
            className="user-menu-item danger"
            onClick={handleDelete}
            disabled={pending}
          >
            <Icon name="trash" size={12} />
            <span>
              {pending
                ? locale === "ar"
                  ? "جاري الحذف…"
                  : "Deleting…"
                : locale === "ar"
                ? "حذف"
                : "Delete"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
