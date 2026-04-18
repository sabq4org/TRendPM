"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Avatar, AvatarStack, PriorityFlag, StatusDot } from "./primitives";
import { Icon } from "./icon";
import { updateTask, updateTaskStatus } from "@/app/actions/tasks";
import type { Dictionary, Locale } from "@/lib/i18n";
import { TASK_STATUSES, TASK_PRIORITIES, type TaskStatus, type TaskPriority } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";

type TaskDetail = {
  id: string;
  code: string;
  title: string;
  description: unknown;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: string | null;
  actualHours: string | null;
  tags: string[];
  projectId: string;
};

type Assignee = {
  id: string;
  name: string;
  nameEn: string | null;
  initials: string | null;
  hue: number | null;
};

type Comment = {
  id: string;
  text: string | null;
  createdAt: string;
  author: Assignee | null;
};

type ProjectBrief = {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  color: string | null;
};

type PanelData = {
  task: TaskDetail;
  project: ProjectBrief | null;
  assignees: Assignee[];
  comments: Comment[];
  members: Assignee[];
};

export default function TaskPanel({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const taskId = searchParams.get("task");
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  void isPending;

  useEffect(() => {
    if (!taskId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tasks/${taskId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: PanelData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  });

  const close = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  };

  if (!taskId) return null;

  return (
    <div className="side" role="dialog" aria-label="Task details">
      <div className="side-head">
        {loading && !data ? (
          <span style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>
            {dict.loading}
          </span>
        ) : !data ? (
          <span style={{ color: "var(--s-blocked)", fontSize: "var(--fs-sm)" }}>
            {dict.noResults}
          </span>
        ) : (
          <>
            <span
              className="mono"
              style={{ color: "var(--text-4)", fontSize: "var(--fs-xs)" }}
            >
              {data.task.code}
            </span>
            {data.project && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 2,
                  background: data.project.color ?? "var(--text-3)",
                }}
              />
            )}
            <span
              style={{
                fontSize: "var(--fs-sm)",
                color: "var(--text-3)",
                marginInlineEnd: "auto",
              }}
            >
              {data.project && (locale === "ar" ? data.project.name : data.project.nameEn ?? data.project.name)}
            </span>
          </>
        )}
        <button
          className="btn ghost icon sm"
          onClick={close}
          aria-label="Close"
          type="button"
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      {data && (
        <div className="side-body">
          <TitleEditor task={data.task} />

          <div style={{ marginTop: 16 }}>
            <SideRow k={dict.status.todo.replace(/./, "") || "Status"}>
              <StatusSelector task={data.task} dict={dict} />
            </SideRow>
            <SideRow k={locale === "ar" ? "الأولوية" : "Priority"}>
              <PrioritySelector task={data.task} dict={dict} />
            </SideRow>
            <SideRow k={dict.assignee}>
              <AvatarStack users={data.assignees} max={4} />
              {data.assignees.length === 0 && (
                <span style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>
                  {dict.unassigned}
                </span>
              )}
            </SideRow>
            <SideRow k={dict.due}>
              <DateEditor
                taskId={data.task.id}
                initial={data.task.dueDate}
                locale={locale}
              />
            </SideRow>
            <SideRow k={dict.progress}>
              <ProgressEditor task={data.task} />
            </SideRow>
            <SideRow k={dict.estimate}>
              <span
                className="mono"
                style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)" }}
              >
                {data.task.estimatedHours ? `${data.task.estimatedHours}${dict.h}` : "—"}
              </span>
            </SideRow>
            {data.task.tags?.length ? (
              <SideRow k={locale === "ar" ? "الوسوم" : "Tags"}>
                <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                  {data.task.tags.map((t) => (
                    <span
                      key={t}
                      className="chip"
                      style={{ height: 18, fontSize: 10 }}
                    >
                      #{t}
                    </span>
                  ))}
                </span>
              </SideRow>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: "var(--fs-xs)",
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              {dict.comments} · {data.comments.length}
            </div>
            {data.comments.map((c) => (
              <div key={c.id} className="comment">
                {c.author && <Avatar user={c.author} />}
                <div className="c-body">
                  <div className="c-head">
                    <span className="who">
                      {c.author
                        ? locale === "ar"
                          ? c.author.name
                          : c.author.nameEn ?? c.author.name
                        : "—"}
                    </span>
                    <span>
                      {formatDistanceToNowStrict(new Date(c.createdAt), {
                        locale: locale === "ar" ? arLocale : enUS,
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="c-text">{c.text}</div>
                </div>
              </div>
            ))}
            {data.comments.length === 0 && (
              <div
                style={{
                  padding: 12,
                  color: "var(--text-3)",
                  fontSize: "var(--fs-sm)",
                }}
              >
                {dict.empty}
              </div>
            )}
            <textarea
              placeholder={dict.addComment}
              style={{
                width: "100%",
                minHeight: 60,
                marginTop: 10,
                padding: 8,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--panel-2)",
                fontSize: "var(--fs-sm)",
                color: "var(--text-3)",
                resize: "vertical",
              }}
              disabled
              title="Coming soon"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SideRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="side-row">
      <span className="k">{k}</span>
      <span className="v">{children}</span>
    </div>
  );
}

function TitleEditor({ task }: { task: TaskDetail }) {
  const [title, setTitle] = useState(task.title);
  const [isPending, startTransition] = useTransition();
  const original = useRef(task.title);

  useEffect(() => {
    setTitle(task.title);
    original.current = task.title;
  }, [task.id, task.title]);

  const save = () => {
    const next = title.trim();
    if (!next || next === original.current) return;
    startTransition(async () => {
      await updateTask({ taskId: task.id, title: next });
      original.current = next;
    });
  };

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      disabled={isPending}
      style={{
        width: "100%",
        fontSize: "var(--fs-md)",
        fontWeight: 600,
        color: "var(--text)",
        padding: "6px 0",
      }}
    />
  );
}

function StatusSelector({ task, dict }: { task: TaskDetail; dict: Dictionary }) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setStatus(task.status), [task.id, task.status]);

  const change = (s: TaskStatus) => {
    if (s === status) return;
    setStatus(s);
    startTransition(async () => {
      await updateTaskStatus({ taskId: task.id, status: s });
    });
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <StatusDot s={status} />
      <select
        value={status}
        onChange={(e) => change(e.target.value as TaskStatus)}
        disabled={isPending}
        style={{
          fontSize: "var(--fs-sm)",
          color: "var(--text)",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "2px 6px",
        }}
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {dict.status[s]}
          </option>
        ))}
      </select>
    </span>
  );
}

function PrioritySelector({ task, dict }: { task: TaskDetail; dict: Dictionary }) {
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setPriority(task.priority), [task.id, task.priority]);

  const change = (p: TaskPriority) => {
    if (p === priority) return;
    setPriority(p);
    startTransition(async () => {
      await updateTask({ taskId: task.id, priority: p });
    });
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <PriorityFlag p={priority} />
      <select
        value={priority}
        onChange={(e) => change(e.target.value as TaskPriority)}
        disabled={isPending}
        style={{
          fontSize: "var(--fs-sm)",
          color: "var(--text)",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "2px 6px",
        }}
      >
        {TASK_PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {dict.priority[p]}
          </option>
        ))}
      </select>
    </span>
  );
}

function DateEditor({
  taskId,
  initial,
  locale,
}: {
  taskId: string;
  initial: string | null;
  locale: Locale;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => setValue(initial ?? ""), [taskId, initial]);

  const save = (next: string) => {
    startTransition(async () => {
      await updateTask({ taskId, dueDate: next || null });
    });
  };

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        save(e.target.value);
      }}
      disabled={isPending}
      lang={locale === "ar" ? "ar-SA" : "en-US"}
      style={{
        fontSize: "var(--fs-sm)",
        color: "var(--text)",
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "2px 6px",
        colorScheme: "dark",
      }}
    />
  );
}

function ProgressEditor({ task }: { task: TaskDetail }) {
  const [value, setValue] = useState(task.progress);
  const [isPending, startTransition] = useTransition();
  useEffect(() => setValue(task.progress), [task.id, task.progress]);

  const save = (next: number) => {
    startTransition(async () => {
      await updateTask({ taskId: task.id, progress: next });
    });
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={() => save(value)}
        onTouchEnd={() => save(value)}
        disabled={isPending}
        style={{ width: 120 }}
      />
      <span className="mono" style={{ fontSize: "var(--fs-sm)" }}>{value}%</span>
    </span>
  );
}

// unused import suppressant
void formatDate;
