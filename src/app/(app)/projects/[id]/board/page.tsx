import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getTasks, getProjectMembers } from "@/lib/db/queries";
import KanbanBoard from "@/components/kanban";
import type { TaskStatus, TaskPriority } from "@/lib/db/schema";
import type { TaskCardData } from "@/components/task-card";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const [tasks, members] = await Promise.all([
    getTasks(user.workspaceId, { projectId: id }),
    getProjectMembers(id),
  ]);
  const cards: TaskCardData[] = tasks.map((t) => ({
    id: t.id,
    code: t.code,
    title: t.title,
    status: t.status as TaskStatus,
    priority: t.priority as TaskPriority,
    dueDate: t.dueDate,
    progress: t.progress,
    tags: t.tags ?? [],
    assignees: t.assignees,
    estimatedHours: t.estimatedHours,
  }));

  const assigneeOptions = members.map((m) => ({
    id: m.id,
    name: locale === "ar" ? m.name : m.nameEn ?? m.name,
    initials: m.initials ?? null,
  }));

  return (
    <KanbanBoard
      projectId={id}
      tasks={cards}
      dict={dict}
      locale={locale}
      assignees={assigneeOptions}
    />
  );
}
