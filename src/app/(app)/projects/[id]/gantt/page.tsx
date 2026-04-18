import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { getDictionary } from "@/lib/i18n";
import { getTasks } from "@/lib/db/queries";
import { TODAY, daysBetween, isLate, toIsoDate } from "@/lib/utils";
import { AvatarStack, StatusDot } from "@/components/primitives";
import { TASK_STATUSES, type TaskStatus } from "@/lib/db/schema";
import Link from "next/link";

const DAY_W = 22;
const MIN_TOTAL_DAYS = 84; // ~12 weeks -> ensures timeline fills the viewport
const DEFAULT_DURATION_DAYS = 5;

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

function durationFromEstimate(hours: string | null | undefined): number | null {
  if (!hours) return null;
  const n = Number(hours);
  if (!Number.isFinite(n) || n <= 0) return null;
  // ~8 hours per work day, at least 1 day
  return Math.max(1, Math.round(n / 8));
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

  // Always place every task on the chart. Synthesize sensible ranges when
  // dates are missing so bars are visible and span a meaningful duration.
  const dated = tasks.map((t) => {
    const est = durationFromEstimate(t.estimatedHours);
    let start = t.startDate ? new Date(t.startDate) : null;
    let end = t.dueDate ? new Date(t.dueDate) : null;

    if (start && end) {
      if (end.getTime() < start.getTime()) end = start;
    } else if (start && !end) {
      end = addDays(start, est ?? DEFAULT_DURATION_DAYS);
    } else if (!start && end) {
      start = addDays(end, -(est ?? DEFAULT_DURATION_DAYS));
    } else {
      // No dates -> anchor to createdAt (or today) and extend by estimate/default
      const anchor = t.createdAt ? new Date(t.createdAt) : new Date();
      anchor.setHours(0, 0, 0, 0);
      start = anchor;
      end = addDays(anchor, est ?? DEFAULT_DURATION_DAYS);
    }
    return {
      task: t,
      start: start!,
      end: end!,
      synthetic: !t.startDate || !t.dueDate,
    };
  });

  if (dated.length === 0) {
    return (
      <div className="scroll" style={{ padding: 16 }}>
        <div
          className="panel"
          style={{
            padding: "60px 24px",
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: "var(--fs-sm)",
          }}
        >
          {locale === "ar" ? "لا توجد مهام بعد." : "No tasks yet."}
        </div>
      </div>
    );
  }

  const starts = dated.map((x) => x.start.getTime());
  const ends = dated.map((x) => x.end.getTime());
  let minD = startOfWeekMon(new Date(Math.min(...starts)));
  minD = addDays(minD, -7);
  let maxD = new Date(Math.max(...ends));
  maxD = addDays(maxD, 14);

  let rawDays = daysBetween(toIsoDate(minD), toIsoDate(maxD)) + 1;
  if (rawDays < MIN_TOTAL_DAYS) {
    maxD = addDays(minD, MIN_TOTAL_DAYS - 1);
    rawDays = MIN_TOTAL_DAYS;
  }
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
    return { left: off, width: Math.max(w, 20) };
  };

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
              {tasks.length}
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
                      style={{
                        flex: 1,
                        minWidth: 0,
                        color: "var(--text)",
                        fontSize: "var(--fs-sm)",
                      }}
                      title={task.title}
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
                style={{ width: 7 * DAY_W, position: "relative" }}
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
                {group.items.map(({ task, start, end, synthetic }) => {
                  const { left, width: w } = posFor(start, end);
                  const late = isLate({
                    status: task.status,
                    dueDate: task.dueDate,
                  });
                  const statusCls =
                    STATUS_CLS[task.status as TaskStatus] ?? "todo";
                  const bg = task.color ?? undefined;
                  return (
                    <Link
                      key={task.id}
                      href={`?task=${task.id}`}
                      scroll={false}
                      className="gantt-track"
                      style={{ display: "block", textDecoration: "none" }}
                    >
                      <div
                        className={`gantt-bar ${statusCls}${late ? " late" : ""}${synthetic ? " synthetic" : ""}`}
                        style={{
                          insetInlineStart: left,
                          width: w,
                          ...(bg
                            ? {
                                background: bg,
                                boxShadow: "0 1px 0 0 rgba(0,0,0,0.25)",
                              }
                            : null),
                        }}
                        title={`${task.code} · ${task.title}${synthetic ? (locale === "ar" ? " (تقديرية)" : " (estimated)") : ""}`}
                      >
                        {w > 42 && (
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
        <span className="gantt-legend-item">
          <span
            className="gantt-legend-swatch"
            style={{
              background: "repeating-linear-gradient(45deg, var(--text-4) 0 3px, transparent 3px 6px)",
            }}
          />
          {locale === "ar" ? "تقديرية" : "Estimated"}
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
