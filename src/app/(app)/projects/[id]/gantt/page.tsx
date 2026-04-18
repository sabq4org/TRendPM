import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { getDictionary } from "@/lib/i18n";
import { getTasks } from "@/lib/db/queries";
import { TODAY, daysBetween, isLate, toIsoDate } from "@/lib/utils";
import { AvatarStack, StatusDot } from "@/components/primitives";
import type { TaskStatus } from "@/lib/db/schema";
import Link from "next/link";

const DAY_W = 18;

const STATUS_CLS: Record<TaskStatus, string> = {
  todo: "todo",
  in_progress: "progress",
  in_review: "review",
  blocked: "blocked",
  done: "done",
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeekMon(d: Date): Date {
  const r = new Date(d);
  const dow = r.getDay();
  const offset = (dow + 6) % 7;
  r.setDate(r.getDate() - offset);
  r.setHours(0, 0, 0, 0);
  return r;
}

export default async function GanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const tasks = await getTasks(user.workspaceId, { projectId: id });

  const dated = tasks
    .map((t) => {
      let start = t.startDate ? new Date(t.startDate) : null;
      let end = t.dueDate ? new Date(t.dueDate) : null;
      if (!start && end) start = addDays(end, -2);
      if (!end && start) end = addDays(start, 2);
      if (!start || !end) return null;
      if (end.getTime() < start.getTime()) end = start;
      return { task: t, start, end };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (dated.length === 0) {
    const hasTasks = tasks.length > 0;
    return (
      <div className="scroll" style={{ padding: 16 }}>
        <div
          className="panel"
          style={{
            padding: "60px 24px",
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: "var(--fs-sm)",
            lineHeight: 1.7,
          }}
        >
          {hasTasks ? (
            locale === "ar" ? (
              <>
                لعرض الـ Gantt، أضف <b style={{ color: "var(--text)" }}>تاريخ بدء</b> أو{" "}
                <b style={{ color: "var(--text)" }}>تاريخ استحقاق</b> للمهام من لوحة التفاصيل.
                <br />
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-4)" }}>
                  المهام الحالية: {tasks.length}
                </span>
              </>
            ) : (
              <>
                Add a <b style={{ color: "var(--text)" }}>start date</b> or{" "}
                <b style={{ color: "var(--text)" }}>due date</b> to your tasks to see them on the Gantt.
                <br />
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-4)" }}>
                  Current tasks: {tasks.length}
                </span>
              </>
            )
          ) : locale === "ar" ? (
            "لا توجد مهام بعد."
          ) : (
            "No tasks yet."
          )}
        </div>
      </div>
    );
  }

  const starts = dated.map((x) => x.start.getTime());
  const ends = dated.map((x) => x.end.getTime());
  let minD = startOfWeekMon(new Date(Math.min(...starts)));
  minD = addDays(minD, -3);
  let maxD = new Date(Math.max(...ends));
  maxD = addDays(maxD, 3);

  const minIso = toIsoDate(minD);
  const maxIso = toIsoDate(maxD);
  const totalDays = daysBetween(minIso, maxIso) + 1;
  const width = totalDays * DAY_W;

  const weeks: { label: string }[] = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = addDays(minD, i);
    weeks.push({
      label: `${String(d.getDate()).padStart(2, "0")}.${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`,
    });
  }

  const todayIso = toIsoDate(TODAY);
  const todayOffset = daysBetween(minIso, todayIso) * DAY_W;
  const todayInRange = todayOffset >= 0 && todayOffset <= width;

  const posFor = (start: Date, end: Date) => {
    const off = daysBetween(minIso, toIsoDate(start)) * DAY_W;
    const w = (daysBetween(toIsoDate(start), toIsoDate(end)) + 1) * DAY_W;
    return { left: off, width: Math.max(w, 12) };
  };

  const headerText = locale === "ar" ? "المهمة" : "Task";

  return (
    <div
      className="scroll"
      style={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div className="gantt" style={{ flex: 1, minHeight: 0 }}>
        <div className="gantt-left">
          <div
            className="gantt-header"
            style={{ padding: "0 10px", alignItems: "center" }}
          >
            <span
              style={{
                fontSize: "var(--fs-xxs)",
                textTransform: "uppercase",
                color: "var(--text-3)",
                letterSpacing: "0.04em",
              }}
            >
              {headerText}
            </span>
            <span
              className="mono"
              style={{
                marginInlineStart: "auto",
                fontSize: "var(--fs-xxs)",
                color: "var(--text-4)",
              }}
            >
              {dated.length} / {tasks.length}
            </span>
          </div>
          <div className="gantt-body">
            {dated.map(({ task }) => (
              <Link
                key={task.id}
                href={`?task=${task.id}`}
                scroll={false}
                className="gantt-row"
                style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}
              >
                <StatusDot s={task.status as TaskStatus} />
                <span
                  className="mono"
                  style={{
                    fontSize: "var(--fs-xxs)",
                    color: "var(--text-4)",
                    width: 54,
                    flexShrink: 0,
                  }}
                >
                  {task.code}
                </span>
                <span
                  className="truncate"
                  style={{ flex: 1, minWidth: 0, color: "var(--text)" }}
                >
                  {task.title}
                </span>
                {task.assignees.length > 0 && (
                  <AvatarStack users={task.assignees} max={2} />
                )}
              </Link>
            ))}
          </div>
        </div>
        <div
          className="gantt-right"
          style={{ position: "relative", minWidth: width }}
        >
          <div className="gantt-header" style={{ width }}>
            {weeks.map((w, i) => (
              <div key={i} className="gh-cell" style={{ width: 7 * DAY_W }}>
                {w.label}
              </div>
            ))}
          </div>
          <div className="gantt-body" style={{ width, position: "relative" }}>
            {todayInRange && (
              <div
                className="gantt-today"
                style={{ insetInlineStart: todayOffset }}
              />
            )}
            {dated.map(({ task, start, end }) => {
              const { left, width: w } = posFor(start, end);
              const late = isLate({ status: task.status, dueDate: task.dueDate });
              const statusCls = STATUS_CLS[task.status as TaskStatus] ?? "todo";
              return (
                <Link
                  key={task.id}
                  href={`?task=${task.id}`}
                  scroll={false}
                  className="gantt-track"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <div
                    className={`gantt-bar ${statusCls}${late ? " late" : ""}`}
                    style={{ insetInlineStart: left, width: w }}
                    title={`${task.code} · ${task.title}`}
                  >
                    {w > 80 && (
                      <span className="truncate" style={{ fontSize: 10 }}>
                        {task.title}
                      </span>
                    )}
                    {task.progress > 0 && task.progress < 100 && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: `linear-gradient(to right, rgba(0,0,0,0.28) ${task.progress}%, transparent ${task.progress}%)`,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      {/* Legend below */}
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "8px 16px",
          borderTop: "1px solid var(--border)",
          fontSize: "var(--fs-xxs)",
          color: "var(--text-3)",
          background: "var(--panel)",
          flexWrap: "wrap",
        }}
      >
        <LegendDot cls="todo" label={dict.status.todo} />
        <LegendDot cls="progress" label={dict.status.in_progress} />
        <LegendDot cls="review" label={dict.status.in_review} />
        <LegendDot cls="blocked" label={dict.status.blocked} />
        <LegendDot cls="done" label={dict.status.done} />
        <span style={{ marginInlineStart: "auto", fontFamily: "var(--font-mono)" }}>
          {toIsoDate(minD)} → {toIsoDate(maxD)}
        </span>
      </div>
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        className={`gantt-bar ${cls}`}
        style={{
          position: "static",
          width: 14,
          height: 10,
          padding: 0,
          top: 0,
        }}
      />
      {label}
    </span>
  );
}
