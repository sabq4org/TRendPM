import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getTasks } from "@/lib/db/queries";
import KanbanBoard from "@/components/kanban";
import type { TaskStatus, TaskPriority } from "@/lib/db/schema";
import type { TaskCardData } from "@/components/task-card";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const tasks = await getTasks(user.workspaceId, { projectId: id });
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

  return <KanbanBoard projectId={id} tasks={cards} dict={dict} />;
}
