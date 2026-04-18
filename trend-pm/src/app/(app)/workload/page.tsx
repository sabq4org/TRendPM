import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getTasks, getWorkspaceMembers } from "@/lib/db/queries";
import { Avatar } from "@/components/primitives";
import { TODAY, toIsoDate, daysBetween } from "@/lib/utils";

export default async function WorkloadPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [members, tasks] = await Promise.all([
    getWorkspaceMembers(user.workspaceId),
    getTasks(user.workspaceId),
  ]);

  const DAYS = 14;
  const startDate = new Date(TODAY);
  startDate.setDate(startDate.getDate() - 4);

  const grid: Record<string, Record<string, number>> = {};
  for (const m of members) grid[m.id] = {};

  for (const t of tasks) {
    if (!t.startDate || !t.dueDate) continue;
    const ts = new Date(t.startDate);
    const te = new Date(t.dueDate);
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      if (d >= ts && d <= te) {
        for (const a of t.assignees) {
          if (!grid[a.id]) continue;
          const key = toIsoDate(d);
          grid[a.id][key] = (grid[a.id][key] || 0) + 1;
        }
      }
    }
  }

  const maxLoad = Math.max(
    1,
    ...members.flatMap((m) =>
      Object.values(grid[m.id] || {})
    )
  );

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{dict.workload}</h1>
        <span className="sub">
          {locale === "ar" ? "آخر 14 يوم" : "Last 14 days"}
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div className="panel" style={{ overflow: "auto" }}>
          <table
            className="tbl"
            style={{ minWidth: 200 + DAYS * 40, borderCollapse: "separate" }}
          >
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>
                  {locale === "ar" ? "العضو" : "Member"}
                </th>
                {days.map((d) => {
                  const isToday =
                    d.getDate() === TODAY.getDate() &&
                    d.getMonth() === TODAY.getMonth();
                  return (
                    <th
                      key={toIsoDate(d)}
                      className="num"
                      style={{
                        width: 40,
                        textAlign: "center",
                        background: isToday ? "var(--accent-soft)" : undefined,
                      }}
                    >
                      <div style={{ fontSize: 9, color: "var(--text-4)" }}>
                        {dict.days[d.getDay()]}
                      </div>
                      <div style={{ fontSize: 11 }}>{d.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const total = Object.values(grid[m.id] || {}).reduce(
                  (s, n) => s + n,
                  0
                );
                return (
                  <tr key={m.id}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Avatar user={m} />
                        <span
                          className="truncate"
                          style={{ fontSize: "var(--fs-sm)" }}
                        >
                          {locale === "ar" ? m.name : m.nameEn ?? m.name}
                        </span>
                        <span
                          className="mono"
                          style={{
                            marginInlineStart: 6,
                            fontSize: "var(--fs-xxs)",
                            color: "var(--text-4)",
                          }}
                        >
                          {total}
                        </span>
                      </span>
                    </td>
                    {days.map((d) => {
                      const n = grid[m.id]?.[toIsoDate(d)] ?? 0;
                      const intensity = n / maxLoad;
                      const isToday =
                        d.getDate() === TODAY.getDate() &&
                        d.getMonth() === TODAY.getMonth();
                      return (
                        <td
                          key={toIsoDate(d)}
                          style={{
                            textAlign: "center",
                            padding: 2,
                            background: isToday ? "var(--accent-soft)" : undefined,
                          }}
                        >
                          <span
                            title={`${n} ${locale === "ar" ? "مهام" : "tasks"}`}
                            style={{
                              display: "inline-block",
                              width: 26,
                              height: 18,
                              borderRadius: 3,
                              background:
                                n === 0
                                  ? "var(--hover)"
                                  : `color-mix(in oklch, var(--accent) ${Math.round(
                                      intensity * 100
                                    )}%, var(--hover))`,
                              fontSize: 10,
                              color:
                                n === 0
                                  ? "var(--text-4)"
                                  : intensity > 0.5
                                  ? "var(--accent-fg)"
                                  : "var(--text-2)",
                              fontFamily: "var(--font-mono)",
                              lineHeight: "18px",
                            }}
                          >
                            {n || ""}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  // unused helper silencer
  void daysBetween;
}
