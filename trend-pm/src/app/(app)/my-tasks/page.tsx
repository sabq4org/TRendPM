import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getMyTasks, getProjects } from "@/lib/db/queries";
import { Icon } from "@/components/icon";
import { PriorityFlag, StatusDot, Progress, Chip } from "@/components/primitives";
import type { TaskPriority, TaskStatus } from "@/lib/db/schema";
import { TODAY, daysBetween, formatShortDate, isLate, toIsoDate } from "@/lib/utils";

export default async function MyTasksPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [rows, projects] = await Promise.all([
    getMyTasks(user.workspaceId, user.id),
    getProjects(user.workspaceId),
  ]);
  const projById = new Map(projects.map((p) => [p.id, p]));

  const groups = {
    overdue: [] as typeof rows,
    today: [] as typeof rows,
    thisWeek: [] as typeof rows,
    later: [] as typeof rows,
    done: [] as typeof rows,
  };
  const todayStr = toIsoDate(TODAY);
  for (const t of rows) {
    if (t.status === "done") {
      groups.done.push(t);
      continue;
    }
    if (!t.dueDate) {
      groups.later.push(t);
      continue;
    }
    const d = daysBetween(todayStr, t.dueDate);
    if (d < 0) groups.overdue.push(t);
    else if (d === 0) groups.today.push(t);
    else if (d <= 7) groups.thisWeek.push(t);
    else groups.later.push(t);
  }

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{dict.myTasks}</h1>
        <span className="sub">{user.name}</span>
        <Chip>{rows.filter((r) => r.status !== "done").length}</Chip>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <button className="btn sm" type="button">
            <Icon name="filter" size={12} /> {dict.filter}
          </button>
        </div>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <GroupPanel
          title={dict.overdue}
          color="var(--s-late)"
          tasks={groups.overdue}
          projById={projById}
          locale={locale}
          dict={dict}
        />
        <GroupPanel
          title={dict.today}
          color="var(--s-progress)"
          tasks={groups.today}
          projById={projById}
          locale={locale}
          dict={dict}
        />
        <GroupPanel
          title={dict.thisWeek}
          color="var(--accent)"
          tasks={groups.thisWeek}
          projById={projById}
          locale={locale}
          dict={dict}
        />
        <GroupPanel
          title={locale === "ar" ? "لاحقاً" : "Later"}
          color="var(--text-3)"
          tasks={groups.later}
          projById={projById}
          locale={locale}
          dict={dict}
        />
        <GroupPanel
          title={dict.status.done}
          color="var(--s-done)"
          tasks={groups.done}
          projById={projById}
          locale={locale}
          dict={dict}
        />
      </div>
    </div>
  );
}

function GroupPanel({
  title,
  color,
  tasks,
  projById,
  locale,
  dict,
}: {
  title: string;
  color: string;
  tasks: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    priority: string;
    progress: number;
    dueDate: string | null;
    projectId: string;
  }>;
  projById: Map<string, { id: string; key: string; name: string; nameEn: string | null; color: string | null }>;
  locale: "ar" | "en";
  dict: ReturnType<typeof getDictionary>;
}) {
  if (!tasks.length) return null;
  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <div className="panel-head">
        <span style={{ width: 6, height: 6, borderRadius: 2, background: color }} />
        <h3>{title}</h3>
        <Chip>{tasks.length}</Chip>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 28 }}></th>
            <th>{locale === "ar" ? "المهمة" : "Task"}</th>
            <th>{locale === "ar" ? "المشروع" : "Project"}</th>
            <th style={{ width: 40 }}>{locale === "ar" ? "أولوية" : "Prio"}</th>
            <th style={{ width: 140 }}>{dict.progress}</th>
            <th style={{ width: 100 }}>{dict.due}</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const p = projById.get(t.projectId);
            const late = isLate({ status: t.status, dueDate: t.dueDate });
            return (
              <tr key={t.id}>
                <td>
                  <StatusDot s={t.status as TaskStatus} />
                </td>
                <td>
                  <Link
                    href={`/projects/${t.projectId}/list?task=${t.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-4)" }}>
                      {t.code}
                    </span>
                    <span>{t.title}</span>
                  </Link>
                </td>
                <td>
                  {p && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 2,
                          background: p.color ?? "var(--text-3)",
                        }}
                      />
                      <span
                        className="truncate"
                        style={{ fontSize: "var(--fs-sm)" }}
                      >
                        {locale === "ar" ? p.name : p.nameEn ?? p.name}
                      </span>
                    </span>
                  )}
                </td>
                <td>
                  <PriorityFlag p={t.priority as TaskPriority} />
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Progress value={t.progress} thin />
                    <span className="mono" style={{ fontSize: "var(--fs-xs)" }}>
                      {t.progress}%
                    </span>
                  </div>
                </td>
                <td
                  className="mono"
                  style={{ color: late ? "var(--s-late)" : "var(--text-3)" }}
                >
                  {formatShortDate(t.dueDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
