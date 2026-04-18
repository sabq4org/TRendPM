import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getProjects, getTasks } from "@/lib/db/queries";
import { Avatar, AvatarStack, Chip, PriorityDot, Progress } from "@/components/primitives";
import { Icon } from "@/components/icon";
import { isLate, formatShortDate } from "@/lib/utils";
import type { TaskPriority } from "@/lib/db/schema";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [projects, allTasks] = await Promise.all([
    getProjects(user.workspaceId),
    getTasks(user.workspaceId),
  ]);

  const byProject = new Map<string, typeof allTasks>();
  for (const t of allTasks) {
    const arr = byProject.get(t.projectId) ?? [];
    arr.push(t);
    byProject.set(t.projectId, arr);
  }

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{dict.projects}</h1>
        <Chip>{projects.length}</Chip>
        <div style={{ marginInlineStart: "auto" }}>
          <button className="btn primary sm" type="button">
            <Icon name="plus" size={12} /> {dict.newProject}
          </button>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="panel" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>{locale === "ar" ? "المشروع" : "Project"}</th>
                <th>{dict.pm}</th>
                <th>{locale === "ar" ? "الفريق" : "Team"}</th>
                <th className="num">{dict.completion}</th>
                <th className="num">{locale === "ar" ? "مهام مفتوحة" : "Open"}</th>
                <th className="num">{dict.late}</th>
                <th>{dict.due}</th>
                <th>{locale === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const ts = byProject.get(p.id) ?? [];
                const open = ts.filter((t) => t.status !== "done").length;
                const late = ts.filter((t) =>
                  isLate({ status: t.status, dueDate: t.dueDate })
                ).length;
                const assignees = Array.from(
                  new Map(ts.flatMap((t) => t.assignees).map((a) => [a.id, a])).values()
                );
                const progress = ts.length
                  ? Math.round(ts.reduce((s, t) => s + t.progress, 0) / ts.length)
                  : 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          background: p.color ?? "var(--text-3)",
                          borderRadius: 2,
                          display: "inline-block",
                        }}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/projects/${p.id}`}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <span
                          className="mono"
                          style={{ fontSize: 10, color: "var(--text-4)" }}
                        >
                          {p.key}
                        </span>
                        <span>{locale === "ar" ? p.name : p.nameEn ?? p.name}</span>
                        <PriorityDot p={p.priority as TaskPriority} />
                      </Link>
                    </td>
                    <td>—</td>
                    <td>
                      <AvatarStack users={assignees} max={4} />
                    </td>
                    <td className="num" style={{ width: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Progress value={progress} />
                        <span style={{ minWidth: 32, textAlign: "end" }}>
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="num">{open}</td>
                    <td
                      className="num"
                      style={{ color: late > 0 ? "var(--s-late)" : "var(--text-3)" }}
                    >
                      {late || "—"}
                    </td>
                    <td className="mono" style={{ color: "var(--text-3)" }}>
                      {formatShortDate(p.plannedEndDate)}
                    </td>
                    <td>
                      <Chip>{p.status}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
