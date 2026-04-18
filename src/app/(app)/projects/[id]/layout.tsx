import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getProject, getProjectMembers, getTasks, statusColumnCount } from "@/lib/db/queries";
import { Avatar, AvatarStack, Chip, PriorityDot, Progress } from "@/components/primitives";
import { Icon } from "@/components/icon";
import { isLate } from "@/lib/utils";
import type { TaskPriority } from "@/lib/db/schema";
import TaskPanel from "@/components/task-panel";
import TabLink from "@/components/tab-link";
import NewTaskButton from "@/components/tasks/new-task-button";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const tabs = [
    { href: `/projects/${id}/overview`, label: dict.overview },
    { href: `/projects/${id}/board`, label: dict.board },
    { href: `/projects/${id}/list`, label: dict.list },
    { href: `/projects/${id}/gantt`, label: dict.gantt },
    { href: `/projects/${id}/calendar`, label: dict.calendar },
  ];

  return (
    <>
      <div className="subhead">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: project.color ?? "var(--text-3)",
          }}
        />
        <span
          className="mono"
          style={{ color: "var(--text-4)", fontSize: "var(--fs-xs)" }}
        >
          {project.key}
        </span>
        <h1>{locale === "ar" ? project.name : project.nameEn ?? project.name}</h1>
        <PriorityDot p={project.priority as TaskPriority} />
        <Chip>{project.status}</Chip>
        <span
          className="mono"
          style={{ color: "var(--text-3)", fontSize: "var(--fs-xs)" }}
        >
          {project.client}
        </span>
        <span style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <AvatarStack users={members} max={5} size="md" />
          <NewTaskButton
            projectId={id}
            assignees={members.map((m) => ({
              id: m.id,
              name: locale === "ar" ? m.name : m.nameEn ?? m.name,
              initials: m.initials ?? null,
            }))}
            label={dict.newTask}
            locale={locale}
          />
        </span>
      </div>
      <div className="toolbar">
        <div className="tabs">
          {tabs.map((t) => (
            <TabLink key={t.href} href={t.href} label={t.label} />
          ))}
        </div>
        <div
          style={{
            marginInlineStart: "auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: "var(--fs-xs)",
            color: "var(--text-3)",
          }}
        >
          <span className="mono">
            <b style={{ color: "var(--text)" }}>{tasks.length}</b>{" "}
            {locale === "ar" ? "مهمة" : "tasks"}
          </span>
          <span className="mono">
            <b style={{ color: "var(--text)" }}>{tasks.length - counts.done}</b>{" "}
            {locale === "ar" ? "مفتوحة" : "open"}
          </span>
          <span className="mono" style={{ color: lateCount > 0 ? "var(--s-late)" : undefined }}>
            <b>{lateCount}</b> {locale === "ar" ? "متأخرة" : "late"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 130 }}>
            <Progress value={totalProgress} thin />
            <span className="mono">{totalProgress}%</span>
          </span>
          {project.projectManagerId && (
            <Avatar user={members.find((m) => m.id === project.projectManagerId) ?? null} />
          )}
        </div>
      </div>
      {children}
      <TaskPanel locale={locale} dict={dict} currentUserId={user.id} />
    </>
  );
}
