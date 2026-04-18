import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getProject, getProjectMembers, getTasks, statusColumnCount } from "@/lib/db/queries";
import { Avatar, AvatarStack, Progress } from "@/components/primitives";
import { isLate, formatShortDate } from "@/lib/utils";
import type { TaskStatus } from "@/lib/db/schema";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const project = await getProject(user.workspaceId, id);
  if (!project) notFound();

  const [members, tasks] = await Promise.all([
    getProjectMembers(id),
    getTasks(user.workspaceId, { projectId: id }),
  ]);
  const counts = statusColumnCount(tasks);
  const lateCount = tasks.filter((t) => isLate({ status: t.status, dueDate: t.dueDate })).length;
  const totalProgress = tasks.length
    ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
    : 0;

  const statusOrder: TaskStatus[] = ["todo", "in_progress", "in_review", "blocked", "done"];

  return (
    <div className="scroll" style={{ padding: 16 }}>
      <div className="dash">
        <div className="col-8 panel">
          <div className="panel-head">
            <h3>{dict.overview}</h3>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--text-3)",
                  marginBottom: 6,
                }}
              >
                {dict.description}
              </div>
              <div style={{ fontSize: "var(--fs-sm)", lineHeight: 1.6 }}>
                {project.description ||
                  (locale === "ar"
                    ? "لا يوجد وصف مفصّل لهذا المشروع بعد."
                    : "No detailed description for this project yet.")}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: "var(--fs-sm)" }}>
              <Row k={dict.pm}>
                {project.projectManagerId && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Avatar user={members.find((m) => m.id === project.projectManagerId) ?? null} />
                    <span>
                      {members.find((m) => m.id === project.projectManagerId)?.name}
                    </span>
                  </span>
                )}
              </Row>
              <Row k={dict.client}>{project.client || "—"}</Row>
              <Row k={locale === "ar" ? "تاريخ البدء" : "Start"}>
                <span className="mono">{formatShortDate(project.startDate)}</span>
              </Row>
              <Row k={dict.due}>
                <span className="mono">{formatShortDate(project.plannedEndDate)}</span>
              </Row>
              <Row k={dict.budget}>
                <span className="mono">
                  {Number(project.budget || 0).toLocaleString()} SAR
                </span>
              </Row>
              <Row k={dict.spent}>
                <span className="mono">
                  {Number(project.spent || 0).toLocaleString()} SAR
                </span>
              </Row>
              <Row k={dict.progress}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, width: 220 }}>
                  <Progress value={totalProgress} />
                  <span className="mono">{totalProgress}%</span>
                </span>
              </Row>
            </div>
          </div>
        </div>

        <div className="col-4 panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "توزيع الحالات" : "Status breakdown"}</h3>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {statusOrder.map((s) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "var(--fs-sm)",
                }}
              >
                <span style={{ minWidth: 110 }}>{dict.status[s]}</span>
                <span
                  style={{
                    flex: 1,
                    height: 6,
                    background: "var(--hover)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${tasks.length ? (counts[s] / tasks.length) * 100 : 0}%`,
                      background: "var(--accent)",
                    }}
                  />
                </span>
                <span className="mono" style={{ minWidth: 24, textAlign: "end" }}>
                  {counts[s]}
                </span>
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                paddingTop: 10,
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--fs-xs)",
                color: "var(--text-3)",
              }}
            >
              <span>{locale === "ar" ? "متأخرة:" : "Late:"}</span>
              <span
                className="mono"
                style={{ color: lateCount > 0 ? "var(--s-late)" : undefined }}
              >
                {lateCount}
              </span>
            </div>
          </div>
        </div>

        <div className="col-12 panel">
          <div className="panel-head">
            <h3>{locale === "ar" ? "أعضاء المشروع" : "Project members"}</h3>
            <span style={{ marginInlineStart: "auto" }}>
              <AvatarStack users={members} max={10} />
            </span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>{locale === "ar" ? "العضو" : "Member"}</th>
                <th>{locale === "ar" ? "الدور" : "Role"}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <Avatar user={m} />
                      <span>{locale === "ar" ? m.name : m.nameEn ?? m.name}</span>
                    </span>
                  </td>
                  <td style={{ color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>
                    {m.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <span style={{ color: "var(--text-3)" }}>{k}</span>
      <span>{children}</span>
    </>
  );
}
