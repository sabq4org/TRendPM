import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getTasks } from "@/lib/db/queries";
import TaskListRow from "@/components/task-list-row";
import type { TaskStatus, TaskPriority } from "@/lib/db/schema";
import type { TaskCardData } from "@/components/task-card";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const rows = await getTasks(user.workspaceId, { projectId: id });
  const cards: TaskCardData[] = rows.map((t) => ({
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

  return (
    <div className="scroll" style={{ padding: 16 }}>
      <div className="panel" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th>{locale === "ar" ? "المهمة" : "Task"}</th>
              <th style={{ width: 40 }}>{locale === "ar" ? "أولوية" : "Prio"}</th>
              <th style={{ width: 120 }}>{dict.assignee}</th>
              <th style={{ width: 160 }}>{dict.progress}</th>
              <th style={{ width: 100 }}>{dict.due}</th>
              <th style={{ width: 80 }}>{dict.estimate}</th>
              <th>{locale === "ar" ? "وسوم" : "Tags"}</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((t) => (
              <TaskListRow
                key={t.id}
                task={t}
                projectId={id}
                locale={locale}
                dict={dict}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
