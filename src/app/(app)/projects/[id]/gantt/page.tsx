import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { getDictionary } from "@/lib/i18n";
import { getTasks } from "@/lib/db/queries";
import { TODAY, daysBetween, toIsoDate } from "@/lib/utils";
import { StatusDot } from "@/components/primitives";
import type { TaskStatus } from "@/lib/db/schema";
import Link from "next/link";

const ROW_HEIGHT = 28;
const DAY_WIDTH = 22;
const LEFT_COL = 260;

export default async function GanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const tasks = await getTasks(user.workspaceId, { projectId: id });
  const dated = tasks.filter((t) => t.startDate && t.dueDate);
  if (!dated.length) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: "var(--fs-sm)",
        }}
      >
        {locale === "ar" ? "لا توجد مهام ذات تواريخ بدء ونهاية." : "No tasks with both start and due dates."}
      </div>
    );
  }

  const minDate = new Date(
    Math.min(...dated.map((t) => new Date(t.startDate!).getTime()))
  );
  const maxDate = new Date(
    Math.max(...dated.map((t) => new Date(t.dueDate!).getTime()))
  );
  const totalDays = daysBetween(minDate, maxDate) + 1;
  const width = totalDays * DAY_WIDTH;
  const todayIdx = daysBetween(minDate, TODAY);

  const statusColor: Record<TaskStatus, string> = {
    todo: "var(--s-todo)",
    in_progress: "var(--s-progress)",
    in_review: "var(--s-review)",
    blocked: "var(--s-blocked)",
    done: "var(--s-done)",
  };

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    return d;
  });
  const monthsShort = [
    locale === "ar" ? "ينا" : "Jan",
    locale === "ar" ? "فبر" : "Feb",
    locale === "ar" ? "مار" : "Mar",
    locale === "ar" ? "أبر" : "Apr",
    locale === "ar" ? "ماي" : "May",
    locale === "ar" ? "يون" : "Jun",
    locale === "ar" ? "يول" : "Jul",
    locale === "ar" ? "أغس" : "Aug",
    locale === "ar" ? "سبت" : "Sep",
    locale === "ar" ? "أكت" : "Oct",
    locale === "ar" ? "نوف" : "Nov",
    locale === "ar" ? "ديس" : "Dec",
  ];

  return (
    <div className="scroll" style={{ padding: 16 }}>
      <div className="panel" style={{ overflow: "hidden" }}>
        <div
          className="panel-head"
          style={{ justifyContent: "space-between" }}
        >
          <h3>{dict.gantt}</h3>
          <span className="tail mono">
            {toIsoDate(minDate)} → {toIsoDate(maxDate)}
          </span>
        </div>
        <div style={{ overflow: "auto" }}>
          <div style={{ minWidth: LEFT_COL + width, position: "relative" }}>
            {/* Header row */}
            <div
              style={{
                position: "sticky",
                top: 0,
                background: "var(--panel)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                height: 36,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: LEFT_COL,
                  borderInlineEnd: "1px solid var(--border)",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "var(--fs-xs)",
                  color: "var(--text-3)",
                }}
              >
                {locale === "ar" ? "المهمة" : "Task"}
              </div>
              <div style={{ display: "flex", position: "relative" }}>
                {days.map((d, i) => {
                  const isMonthStart = d.getDate() === 1 || i === 0;
                  return (
                    <div
                      key={i}
                      style={{
                        width: DAY_WIDTH,
                        textAlign: "center",
                        fontSize: 9,
                        color: "var(--text-4)",
                        fontFamily: "var(--font-mono)",
                        borderInlineEnd: isMonthStart
                          ? "1px solid var(--border-strong)"
                          : "none",
                        paddingTop: 4,
                      }}
                    >
                      {isMonthStart && <div>{monthsShort[d.getMonth()]}</div>}
                      <div>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today marker */}
            {todayIdx >= 0 && todayIdx <= totalDays && (
              <div
                style={{
                  position: "absolute",
                  insetInlineStart: LEFT_COL + todayIdx * DAY_WIDTH,
                  top: 36,
                  bottom: 0,
                  width: 1,
                  background: "var(--accent)",
                  opacity: 0.6,
                  zIndex: 1,
                }}
              />
            )}

            {/* Rows */}
            {dated.map((t) => {
              const start = new Date(t.startDate!);
              const end = new Date(t.dueDate!);
              const startIdx = daysBetween(minDate, start);
              const len = daysBetween(start, end) + 1;
              return (
                <Link
                  key={t.id}
                  href={`?task=${t.id}`}
                  scroll={false}
                  style={{
                    display: "flex",
                    borderBottom: "1px solid var(--border)",
                    height: ROW_HEIGHT,
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      width: LEFT_COL,
                      borderInlineEnd: "1px solid var(--border)",
                      padding: "0 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "var(--fs-sm)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <StatusDot s={t.status as TaskStatus} />
                    <span
                      className="mono"
                      style={{ fontSize: 10, color: "var(--text-4)" }}
                    >
                      {t.code}
                    </span>
                    <span className="truncate">{t.title}</span>
                  </div>
                  <div style={{ position: "relative", height: "100%", flex: 1 }}>
                    <div
                      style={{
                        position: "absolute",
                        insetInlineStart: startIdx * DAY_WIDTH + 2,
                        top: 6,
                        height: 16,
                        width: Math.max(len * DAY_WIDTH - 4, 6),
                        background: statusColor[t.status as TaskStatus],
                        borderRadius: 3,
                        opacity: 0.8,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          insetInlineStart: 0,
                          top: 0,
                          bottom: 0,
                          width: `${t.progress}%`,
                          background: "var(--accent)",
                          borderRadius: 3,
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
