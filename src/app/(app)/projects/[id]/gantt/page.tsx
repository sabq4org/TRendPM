import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { getDictionary } from "@/lib/i18n";
import { getTasks } from "@/lib/db/queries";
import { TODAY, daysBetween, isLate, toIsoDate } from "@/lib/utils";
import { AvatarStack, StatusDot } from "@/components/primitives";
import { TASK_STATUSES, type TaskStatus } from "@/lib/db/schema";
import Link from "next/link";

const DAY_W = 20;

const STATUS_CLS: Record<TaskStatus, string> = {
  todo: "todo",
  in_progress: "progress",
  in_review: "review",
  blocked: "blocked",
  done: "done",
};

const STATUS_CSS_VAR: Record<TaskStatus, string> = {
  todo: "var(--s-todo)",
  in_progress: "var(--s-progress)",
  in_review: "var(--s-review)",
  blocked: "var(--s-blocked)",
  done: "var(--s-done)",
};

const STATUS_ORDER: TaskStatus[] = [
  "in_progress",
  "in_review",
  "blocked",
  "todo",
  "done",
];
void TASK_STATUSES;

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
  minD = addDays(minD, -7);
  let maxD = new Date(Math.max(...ends));
  maxD = addDays(maxD, 7);
  // round up to a multiple of 7 days so the last week cell is complete
  const rawDays = daysBetween(toIsoDate(minD), toIsoDate(maxD)) + 1;
  const totalDays = Math.ceil(rawDays / 7) * 7;
  maxD = addDays(minD, totalDays - 1);

  const minIso = toIsoDate(minD);
  const width = totalDays * DAY_W;

  const weeks: { d: Date; label: string }[] = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = addDays(minD, i);
    weeks.push({
      d,
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
    return { left: off, width: Math.max(w, 10) };
  };

  // ── Group by status ──
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: dated
      .filter(({ task }) => (task.status as TaskStatus) === status)
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
  })).filter((g) => g.items.length > 0);

  const overallProgress =
    Math.round(
      dated.reduce((s, { task }) => s + task.progress, 0) / dated.length
    ) || 0;

  const headerText = locale === "ar" ? "المهمة" : "Task";
  const rangeLabel = `${weekShort(minD)} → ${weekShort(maxD)}`;

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
      {/* Summary bar */}
      <div className="gantt-summary">
        <span className="mono gs-range">{rangeLabel}</span>
        <span className="gs-progress-wrap">
          <span className="gs-progress-val mono">{overallProgress}%</span>
          <span className="gs-progress-bar">
            <span style={{ width: `${overallProgress}%` }} />
          </span>
        </span>
        <span className="mono gs-count">
          {dated.length}
          <span className="gs-count-label">
            {locale === "ar" ? " مهمة مجدولة" : " scheduled"}
          </span>
        </span>
      </div>

      <div className="gantt" style={{ flex: 1, minHeight: 0 }}>
        <div className="gantt-left">
          <div className="gantt-header gantt-left-head">
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
            {grouped.map((group) => (
              <div key={group.status}>
                <div
                  className="gantt-group-row"
                  style={{
                    ["--group-color" as string]: STATUS_CSS_VAR[group.status],
                  }}
                >
                  <span
                    className="gantt-group-swatch"
                    style={{ background: STATUS_CSS_VAR[group.status] }}
                  />
                  <span className="gantt-group-label">
                    {dict.status[group.status]}
                  </span>
                  <span className="gantt-group-count mono">
                    {group.items.length}
                  </span>
                </div>
                {group.items.map(({ task }) => (
                  <Link
                    key={task.id}
                    href={`?task=${task.id}`}
                    scroll={false}
                    className="gantt-row"
                    style={{
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "inherit",
                    }}
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
            ))}
          </div>
        </div>

        <div
          className="gantt-right"
          style={{ position: "relative", minWidth: width }}
        >
          <div className="gantt-header" style={{ width }}>
            {weeks.map((w, i) => (
              <div
                key={i}
                className="gh-cell"
                style={{
                  width: 7 * DAY_W,
                  position: "relative",
                }}
              >
                <span>{w.label}</span>
                {w.d.getDate() <= 7 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      insetInlineStart: 4,
                      fontSize: 8,
                      color: "var(--text-4)",
                      textTransform: "uppercase",
                    }}
                  >
                    {monthShort(w.d, locale)}
                  </span>
                )}
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
            {grouped.map((group) => (
              <div key={group.status}>
                <div
                  className="gantt-group-track"
                  style={{
                    width,
                    ["--group-color" as string]: STATUS_CSS_VAR[group.status],
                  }}
                >
                  <span className="gantt-group-line" />
                </div>
                {group.items.map(({ task, start, end }) => {
                  const { left, width: w } = posFor(start, end);
                  const late = isLate({
                    status: task.status,
                    dueDate: task.dueDate,
                  });
                  const statusCls =
                    STATUS_CLS[task.status as TaskStatus] ?? "todo";
                  return (
                    <Link
                      key={task.id}
                      href={`?task=${task.id}`}
                      scroll={false}
                      className="gantt-track"
                      style={{
                        display: "block",
                        textDecoration: "none",
                      }}
                    >
                      <div
                        className={`gantt-bar ${statusCls}${late ? " late" : ""}`}
                        style={{ insetInlineStart: left, width: w }}
                        title={`${task.code} · ${task.title}`}
                      >
                        {w > 56 && (
                          <span className="truncate gantt-bar-label">
                            {task.title}
                          </span>
                        )}
                        {task.progress > 0 && task.progress < 100 && (
                          <div
                            className="gantt-bar-fill"
                            style={{ width: `${task.progress}%` }}
                          />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer legend */}
      <div className="gantt-legend">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="gantt-legend-item">
            <span
              className="gantt-legend-swatch"
              style={{ background: STATUS_CSS_VAR[s] }}
            />
            {dict.status[s]}
          </span>
        ))}
        <span className="gantt-legend-item">
          <span
            className="gantt-legend-swatch"
            style={{
              background: "transparent",
              outline: "1px dashed var(--s-late)",
              outlineOffset: -1,
            }}
          />
          {locale === "ar" ? "متأخرة" : "Late"}
        </span>
      </div>
    </div>
  );
}

function weekShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthShort(d: Date, locale: "ar" | "en"): string {
  const ar = [
    "ينا",
    "فبر",
    "مار",
    "أبر",
    "ماي",
    "يون",
    "يول",
    "أغس",
    "سبت",
    "أكت",
    "نوف",
    "ديس",
  ];
  const en = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return (locale === "ar" ? ar : en)[d.getMonth()];
}
