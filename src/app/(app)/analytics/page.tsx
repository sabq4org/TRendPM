import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getProjects, getTasks, getWorkspaceMembers } from "@/lib/db/queries";
import { isLate } from "@/lib/utils";
import { Avatar, Chip, Progress } from "@/components/primitives";
import { VelocityChart, Sparkline } from "@/components/charts";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [projects, tasks, members] = await Promise.all([
    getProjects(user.workspaceId),
    getTasks(user.workspaceId),
    getWorkspaceMembers(user.workspaceId),
  ]);

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const open = total - done;
  const late = tasks.filter((t) => isLate({ status: t.status, dueDate: t.dueDate })).length;
  const completion = total ? Math.round((done / total) * 100) : 0;

  const byStatus: Record<string, number> = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    blocked: 0,
    done: 0,
  };
  for (const t of tasks) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;

  const byPriority: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const t of tasks) byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;

  const memberLoad = members
    .map((m) => {
      const own = tasks.filter(
        (t) => t.status !== "done" && t.assignees.some((a) => a.id === m.id)
      ).length;
      return { m, own };
    })
    .sort((a, b) => b.own - a.own);

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{dict.analytics}</h1>
      </div>
      <div className="dash" style={{ padding: 16 }}>
        <KPI label={dict.projectsCount} value={projects.length} spark={[2, 3, 3, 4, 4, 5, 6, 6]} />
        <KPI label={dict.openTasks} value={open} spark={[30, 32, 28, 34, 36, 33, 35, 37]} />
        <KPI label={dict.overdue} value={late} spark={[2, 2, 3, 4, 3, 4, 5, 6]} color="var(--s-late)" />
        <KPI label={dict.completion + " %"} value={completion} spark={[20, 22, 28, 30, 34, 38, 42, 45]} />

        <div className="col-6 panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "توزيع الحالات" : "Status distribution"}</h3>
            <Chip>{total}</Chip>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(byStatus).map(([s, n]) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ minWidth: 110, fontSize: "var(--fs-sm)" }}>
                  {dict.status[s as keyof typeof dict.status]}
                </span>
                <Progress value={total ? (n / total) * 100 : 0} />
                <span className="mono" style={{ minWidth: 40, textAlign: "end" }}>
                  {n}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-6 panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "توزيع الأولويات" : "Priority distribution"}</h3>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(byPriority).map(([p, n]) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ minWidth: 110, fontSize: "var(--fs-sm)" }}>
                  {dict.priority[p as keyof typeof dict.priority]}
                </span>
                <Progress value={total ? (n / total) * 100 : 0} />
                <span className="mono" style={{ minWidth: 40, textAlign: "end" }}>
                  {n}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-8 panel">
          <div className="panel-head">
            <h3>{dict.velocityTrend}</h3>
          </div>
          <div style={{ padding: 16 }}>
            <VelocityChart />
          </div>
        </div>

        <div className="col-4 panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "حمل الأعضاء" : "Member load"}</h3>
          </div>
          <div style={{ padding: 10 }}>
            {memberLoad.slice(0, 8).map(({ m, own }) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Avatar user={m} />
                <span
                  className="truncate"
                  style={{ flex: 1, fontSize: "var(--fs-sm)" }}
                >
                  {locale === "ar" ? m.name : m.nameEn ?? m.name}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: "var(--fs-xs)", color: "var(--text-3)" }}
                >
                  {own}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  spark,
  color,
}: {
  label: string;
  value: number;
  spark: number[];
  color?: string;
}) {
  return (
    <div className="col-3 kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value num" style={{ color }}>
        {value}
      </span>
      <span className="kpi-sub">
        <span style={{ marginInlineStart: "auto" }}>
          <Sparkline data={spark} color={color} />
        </span>
      </span>
    </div>
  );
}
