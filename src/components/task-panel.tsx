"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Avatar, AvatarStack, PriorityFlag, StatusDot } from "./primitives";
import { Icon } from "./icon";
import { deleteTask, updateTask, updateTaskStatus } from "@/app/actions/tasks";
import {
  setTaskAssignees,
  updateTaskDescription,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  addComment,
  deleteComment,
  updateEstimate,
} from "@/app/actions/task-details";
import type { Dictionary, Locale } from "@/lib/i18n";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/db/schema";
import { formatDistanceToNowStrict } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";

type TaskDescription = { type?: string; text?: string } | null | unknown;

type TaskDetail = {
  id: string;
  code: string;
  title: string;
  description: TaskDescription;
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
  author: (Assignee & { id: string }) | null;
};

type ProjectBrief = {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  color: string | null;
};

type ChecklistItem = {
  id: string;
  content: string;
  done: boolean;
  position: number;
};

type PanelData = {
  task: TaskDetail;
  project: ProjectBrief | null;
  assignees: Assignee[];
  comments: Comment[];
  members: Assignee[];
  checklist: ChecklistItem[];
};

function descriptionText(d: TaskDescription): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  if (typeof d === "object" && d !== null && "text" in (d as Record<string, unknown>)) {
    const v = (d as Record<string, unknown>).text;
    return typeof v === "string" ? v : "";
  }
  return "";
}

export default function TaskPanel({
  locale,
  dict,
  currentUserId,
}: {
  locale: Locale;
  dict: Dictionary;
  currentUserId?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const taskId = searchParams.get("task");
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [isPending, startTransition] = useTransition();
  void isPending;

  const reload = () => {
    setReloadTick((t) => t + 1);
    router.refresh();
  };

  useEffect(() => {
    if (!taskId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tasks/${taskId}`, { cache: "no-store" })
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
  }, [taskId, reloadTick]);

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

  const L = {
    description: locale === "ar" ? "الوصف" : "Description",
    descriptionPlaceholder:
      locale === "ar"
        ? "اكتب وصفاً للمهمة…"
        : "Write a task description…",
    subtasks: locale === "ar" ? "المهام الفرعية" : "Subtasks",
    addSubtask: locale === "ar" ? "أضف مهمة فرعية" : "Add a subtask",
    addPerson: locale === "ar" ? "إضافة شخص" : "Add assignee",
    sendComment: locale === "ar" ? "إرسال" : "Send",
    commentPlaceholder:
      locale === "ar" ? "أضف تعليقاً… (@ للإشارة)" : "Add a comment… (@ to mention)",
    deleteComment: locale === "ar" ? "حذف التعليق" : "Delete comment",
    deleteSubtask: locale === "ar" ? "حذف" : "Delete",
    hours: dict.h,
    estimate: dict.estimate,
    hoursUnit: locale === "ar" ? "س" : "h",
  };

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
              {data.project &&
                (locale === "ar"
                  ? data.project.name
                  : data.project.nameEn ?? data.project.name)}
            </span>
          </>
        )}
        {data && (
          <button
            className="btn ghost icon sm"
            type="button"
            aria-label={locale === "ar" ? "حذف المهمة" : "Delete task"}
            title={locale === "ar" ? "حذف المهمة" : "Delete task"}
            onClick={() => {
              const msg =
                locale === "ar"
                  ? "هل أنت متأكد من حذف هذه المهمة؟"
                  : "Are you sure you want to delete this task?";
              if (!confirm(msg)) return;
              startTransition(async () => {
                try {
                  await deleteTask({ taskId: data.task.id });
                  close();
                  router.refresh();
                } catch (err) {
                  console.error(err);
                }
              });
            }}
          >
            <Icon name="trash" size={12} />
          </button>
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
            <SideRow k={locale === "ar" ? "الحالة" : "Status"}>
              <StatusSelector task={data.task} dict={dict} />
            </SideRow>
            <SideRow k={locale === "ar" ? "الأولوية" : "Priority"}>
              <PrioritySelector task={data.task} dict={dict} />
            </SideRow>
            <SideRow k={dict.assignee}>
              <AssigneePicker
                task={data.task}
                assignees={data.assignees}
                members={data.members}
                dict={dict}
                locale={locale}
                onChanged={reload}
              />
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
            <SideRow k={L.estimate}>
              <EstimateEditor task={data.task} hoursUnit={L.hoursUnit} />
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

          {/* Description */}
          <SectionHeader label={L.description} />
          <DescriptionEditor
            task={data.task}
            placeholder={L.descriptionPlaceholder}
          />

          {/* Subtasks / Checklist */}
          <SectionHeader
            label={`${L.subtasks} · ${data.checklist.filter((c) => c.done).length}/${data.checklist.length}`}
          />
          <ChecklistWidget
            taskId={data.task.id}
            items={data.checklist}
            onChanged={reload}
            addLabel={L.addSubtask}
            deleteLabel={L.deleteSubtask}
          />

          {/* Comments */}
          <SectionHeader label={`${dict.comments} · ${data.comments.length}`} />
          <CommentsSection
            taskId={data.task.id}
            comments={data.comments}
            currentUserId={currentUserId}
            locale={locale}
            placeholder={L.commentPlaceholder}
            sendLabel={L.sendComment}
            deleteLabel={L.deleteComment}
            emptyLabel={dict.empty}
            onChanged={reload}
          />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 14,
        borderTop: "1px solid var(--border)",
        fontSize: "var(--fs-xs)",
        color: "var(--text-3)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 8,
      }}
    >
      {label}
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

function EstimateEditor({
  task,
  hoursUnit,
}: {
  task: TaskDetail;
  hoursUnit: string;
}) {
  const initial = task.estimatedHours ? Number(task.estimatedHours) : 0;
  const [value, setValue] = useState<string>(initial ? String(initial) : "");
  const [isPending, startTransition] = useTransition();
  const original = useRef<string>(value);

  useEffect(() => {
    const v = task.estimatedHours ? String(Number(task.estimatedHours)) : "";
    setValue(v);
    original.current = v;
  }, [task.id, task.estimatedHours]);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed === original.current) return;
    const n = trimmed === "" ? null : Number(trimmed);
    if (n !== null && (Number.isNaN(n) || n < 0)) {
      setValue(original.current);
      return;
    }
    startTransition(async () => {
      await updateEstimate({ taskId: task.id, hours: n });
      original.current = trimmed;
    });
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input
        type="number"
        min={0}
        step={0.5}
        value={value}
        placeholder="0"
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        disabled={isPending}
        style={{
          width: 64,
          fontSize: "var(--fs-sm)",
          color: "var(--text)",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "2px 6px",
          textAlign: "center",
        }}
      />
      <span
        className="mono"
        style={{ fontSize: "var(--fs-sm)", color: "var(--text-3)" }}
      >
        {hoursUnit}
      </span>
    </span>
  );
}

function AssigneePicker({
  task,
  assignees,
  members,
  dict,
  locale,
  onChanged,
}: {
  task: TaskDetail;
  assignees: Assignee[];
  members: Assignee[];
  dict: Dictionary;
  locale: Locale;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const currentIds = new Set(assignees.map((a) => a.id));
  const toggle = (uid: string) => {
    const next = new Set(currentIds);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    startTransition(async () => {
      try {
        await setTaskAssignees({
          taskId: task.id,
          userIds: Array.from(next),
        });
        onChanged();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <span
      ref={ref}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        position: "relative",
      }}
    >
      {assignees.length > 0 ? (
        <button
          type="button"
          className="assignee-btn"
          onClick={() => setOpen((o) => !o)}
          aria-label={dict.assignee}
        >
          <AvatarStack users={assignees} max={4} />
        </button>
      ) : (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setOpen((o) => !o)}
          style={{ fontSize: "var(--fs-sm)", color: "var(--text-3)" }}
        >
          <Icon name="plus" size={10} />
          <span style={{ marginInlineStart: 4 }}>{dict.unassigned}</span>
        </button>
      )}
      {open && (
        <div
          className="popover"
          role="listbox"
          aria-label={dict.assignee}
          style={{ insetInlineEnd: 0 }}
        >
          <div className="popover-head">
            {locale === "ar" ? "اختر الأعضاء" : "Select members"}
          </div>
          {members.length === 0 && (
            <div className="popover-empty">
              {locale === "ar" ? "لا يوجد أعضاء" : "No members"}
            </div>
          )}
          {members.map((m) => {
            const active = currentIds.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                disabled={isPending}
                className={`popover-item${active ? " active" : ""}`}
                onClick={() => toggle(m.id)}
              >
                <Avatar user={m} />
                <span className="pi-name">
                  {locale === "ar" ? m.name : m.nameEn ?? m.name}
                </span>
                {active && <Icon name="check" size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}

function DescriptionEditor({
  task,
  placeholder,
}: {
  task: TaskDetail;
  placeholder: string;
}) {
  const initial = descriptionText(task.description);
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const original = useRef(initial);

  useEffect(() => {
    const next = descriptionText(task.description);
    setValue(next);
    original.current = next;
  }, [task.id, task.description]);

  const save = () => {
    const next = value;
    if (next === original.current) return;
    startTransition(async () => {
      try {
        await updateTaskDescription({ taskId: task.id, description: next });
        original.current = next;
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      placeholder={placeholder}
      disabled={isPending}
      className="desc-editor"
      rows={3}
    />
  );
}

function ChecklistWidget({
  taskId,
  items,
  onChanged,
  addLabel,
  deleteLabel,
}: {
  taskId: string;
  items: ChecklistItem[];
  onChanged: () => void;
  addLabel: string;
  deleteLabel: string;
}) {
  const [local, setLocal] = useState<ChecklistItem[]>(items);
  const [newText, setNewText] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => setLocal(items), [items]);

  const onToggle = (item: ChecklistItem) => {
    setLocal((xs) =>
      xs.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x))
    );
    startTransition(async () => {
      try {
        await toggleChecklistItem({ itemId: item.id, done: !item.done });
        onChanged();
      } catch (err) {
        console.error(err);
      }
    });
  };

  const onDelete = (item: ChecklistItem) => {
    setLocal((xs) => xs.filter((x) => x.id !== item.id));
    startTransition(async () => {
      try {
        await deleteChecklistItem({ itemId: item.id });
        onChanged();
      } catch (err) {
        console.error(err);
      }
    });
  };

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const content = newText.trim();
    if (!content) return;
    setNewText("");
    startTransition(async () => {
      try {
        await addChecklistItem({ taskId, content });
        onChanged();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="checklist">
      {local.map((item) => (
        <div key={item.id} className="checklist-row">
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => onToggle(item)}
            disabled={isPending}
            aria-label={item.content}
          />
          <span className={`cl-text${item.done ? " done" : ""}`}>
            {item.content}
          </span>
          <button
            type="button"
            className="btn ghost icon sm cl-del"
            aria-label={deleteLabel}
            title={deleteLabel}
            onClick={() => onDelete(item)}
          >
            <Icon name="trash" size={10} />
          </button>
        </div>
      ))}
      <form className="checklist-add" onSubmit={onAdd}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={addLabel}
          maxLength={300}
        />
        <button
          type="submit"
          className="btn ghost icon sm"
          disabled={!newText.trim() || isPending}
          aria-label={addLabel}
        >
          <Icon name="plus" size={12} />
        </button>
      </form>
    </div>
  );
}

function CommentsSection({
  taskId,
  comments,
  currentUserId,
  locale,
  placeholder,
  sendLabel,
  deleteLabel,
  emptyLabel,
  onChanged,
}: {
  taskId: string;
  comments: Comment[];
  currentUserId?: string;
  locale: Locale;
  placeholder: string;
  sendLabel: string;
  deleteLabel: string;
  emptyLabel: string;
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    startTransition(async () => {
      try {
        await addComment({ taskId, text: body });
        onChanged();
      } catch (err) {
        console.error(err);
      }
    });
  };

  const onDelete = (commentId: string) => {
    const msg =
      locale === "ar"
        ? "حذف هذا التعليق؟"
        : "Delete this comment?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      try {
        await deleteComment({ commentId });
        onChanged();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <>
      {comments.map((c) => (
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
              {c.author && currentUserId === c.author.id && (
                <button
                  type="button"
                  className="c-del"
                  aria-label={deleteLabel}
                  title={deleteLabel}
                  onClick={() => onDelete(c.id)}
                >
                  <Icon name="trash" size={10} />
                </button>
              )}
            </div>
            <div className="c-text">{c.text}</div>
          </div>
        </div>
      ))}
      {comments.length === 0 && (
        <div
          style={{
            padding: 12,
            color: "var(--text-3)",
            fontSize: "var(--fs-sm)",
          }}
        >
          {emptyLabel}
        </div>
      )}
      <form className="comment-form" onSubmit={onSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          rows={2}
          maxLength={4000}
        />
        <div className="comment-form-actions">
          <button
            type="submit"
            className="btn primary sm"
            disabled={!text.trim() || isPending}
          >
            {sendLabel}
          </button>
        </div>
      </form>
    </>
  );
}
