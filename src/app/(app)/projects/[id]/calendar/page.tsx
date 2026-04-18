import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getTasks } from "@/lib/db/queries";
import { TODAY, toIsoDate } from "@/lib/utils";
import type { TaskStatus } from "@/lib/db/schema";
import { StatusDot } from "@/components/primitives";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const tasks = await getTasks(user.workspaceId, { projectId: id });
  const month = TODAY.getMonth();
  const year = TODAY.getFullYear();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const firstDayOfWeek = firstOfMonth.getDay();
  const daysInMonth = lastOfMonth.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const key = t.dueDate;
    const arr = byDate.get(key) ?? [];
    arr.push(t);
    byDate.set(key, arr);
  }

  return (
    <div className="scroll" style={{ padding: 16 }}>
      <div className="panel" style={{ overflow: "hidden" }}>
        <div className="panel-head">
          <h3>
            {dict.months[month]} {year}
          </h3>
          <span className="tail mono">{tasks.filter((t) => t.dueDate).length} tasks</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderTop: "1px solid var(--border)",
          }}
        >
          {dict.days.map((d) => (
            <div
              key={d}
              style={{
                padding: "6px 10px",
                fontSize: "var(--fs-xxs)",
                color: "var(--text-3)",
                borderBottom: "1px solid var(--border)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {d}
            </div>
          ))}
          {cells.map((cell, i) => {
            const key = cell ? toIsoDate(cell) : `empty-${i}`;
            const isToday =
              cell &&
              cell.getDate() === TODAY.getDate() &&
              cell.getMonth() === TODAY.getMonth() &&
              cell.getFullYear() === TODAY.getFullYear();
            const dayTasks = cell ? byDate.get(toIsoDate(cell)) ?? [] : [];
            return (
              <div
                key={key}
                style={{
                  minHeight: 96,
                  borderInlineEnd: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: 6,
                  background: isToday ? "var(--accent-soft)" : "var(--panel)",
                }}
              >
                {cell && (
                  <>
                    <div
                      style={{
                        fontSize: "var(--fs-xs)",
                        color: isToday ? "var(--accent)" : "var(--text-3)",
                        fontWeight: isToday ? 600 : 400,
                        marginBottom: 4,
                      }}
                    >
                      {cell.getDate()}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {dayTasks.slice(0, 3).map((t) => (
                        <Link
                          key={t.id}
                          href={`?task=${t.id}`}
                          scroll={false}
                          className="chip"
                          style={{
                            fontSize: 10,
                            height: 18,
                            padding: "0 4px",
                            textDecoration: "none",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <StatusDot s={t.status as TaskStatus} />
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.title}
                          </span>
                        </Link>
                      ))}
                      {dayTasks.length > 3 && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-3)",
                          }}
                        >
                          +{dayTasks.length - 3}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
