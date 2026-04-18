"use client";

import Link from "next/link";
import { useState, useTransition, useRef, useEffect } from "react";
import { AvatarStack, StatusDot, PriorityFlag } from "./primitives";
import { Icon } from "./icon";
import { formatShortDate, isLate } from "@/lib/utils";
import { updateTaskStatus } from "@/app/actions/tasks";
import { TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/db/schema";
import type { TaskCardData } from "./task-card";
import type { Dictionary, Locale } from "@/lib/i18n";

export default function TaskListRow({
  task,
  projectId,
  locale,
  dict,
  projectKey,
}: {
  task: TaskCardData;
  projectId: string;
  locale: Locale;
  dict: Dictionary;
  projectKey?: string;
}) {
  const [current, setCurrent] = useState<TaskStatus>(task.status);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  void projectKey;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const late = isLate({ status: current, dueDate: task.dueDate });

  const changeStatus = (s: TaskStatus) => {
    setOpen(false);
    if (s === current) return;
    setCurrent(s);
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status: s });
      } catch (err) {
        console.error(err);
        setCurrent(task.status);
      }
    });
  };

  return (
    <tr
      style={{
        opacity: isPending ? 0.7 : 1,
        transition: "opacity 0.1s",
      }}
    >
      <td style={{ width: 24 }}>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
            aria-label="Change status"
          >
            <StatusDot s={current} />
          </button>
          {open && (
            <div
              style={{
                position: "absolute",
                top: 24,
                insetInlineStart: 0,
                background: "var(--panel)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                zIndex: 50,
                padding: 4,
                minWidth: 140,
              }}
            >
              {TASK_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeStatus(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    width: "100%",
                    fontSize: "var(--fs-sm)",
                    color: s === current ? "var(--accent)" : "var(--text)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--hover)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <StatusDot s={s} />
                  <span>{dict.status[s]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td>
        <Link
          href={`?task=${task.id}`}
          scroll={false}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <span className="mono" style={{ fontSize: 10, color: "var(--text-4)" }}>
            {task.code}
          </span>
          <span>{task.title}</span>
        </Link>
      </td>
      <td>
        <PriorityFlag p={task.priority as TaskPriority} />
      </td>
      <td>
        <AvatarStack users={task.assignees} max={3} />
      </td>
      <td style={{ width: 140 }}>
        <div
          className="progress thin"
          style={{ width: 80, display: "inline-block" }}
        >
          <i style={{ width: `${task.progress}%` }} />
        </div>
        <span className="mono" style={{ marginInlineStart: 8, fontSize: "var(--fs-xs)" }}>
          {task.progress}%
        </span>
      </td>
      <td className="mono" style={{ color: late ? "var(--s-late)" : "var(--text-3)" }}>
        {task.dueDate ? (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Icon name="calendar" size={10} /> {formatShortDate(task.dueDate)}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td
        className="mono"
        style={{ color: "var(--text-3)", fontSize: "var(--fs-xs)" }}
      >
        {task.estimatedHours ? `${task.estimatedHours}${dict.h}` : "—"}
      </td>
      <td>
        {task.tags && task.tags.length > 0 && (
          <span style={{ display: "inline-flex", gap: 4 }}>
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="chip"
                style={{ height: 16, fontSize: 10 }}
              >
                #{tag}
              </span>
            ))}
          </span>
        )}
      </td>
    </tr>
  );
}
