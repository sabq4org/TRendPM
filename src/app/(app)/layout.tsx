import Sidebar, { type SidebarProject, type SidebarTeam } from "@/components/shell/sidebar";
import Topbar from "@/components/shell/topbar";
import AppShell from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale, getTheme } from "@/lib/preferences";
import { db } from "@/lib/db";
import { projects, tasks, taskAssignees } from "@/lib/db/schema";
import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import { getTeams } from "@/lib/db/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme, user] = await Promise.all([getLocale(), getTheme(), requireUser()]);
  const dict = getDictionary(locale);

  const projRows = await db
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      nameEn: projects.nameEn,
      color: projects.color,
    })
    .from(projects)
    .where(and(eq(projects.workspaceId, user.workspaceId), isNull(projects.deletedAt)));

  const projIds = projRows.map((p) => p.id);
  let openMap = new Map<string, number>();
  if (projIds.length) {
    const counts = await db
      .select({
        projectId: tasks.projectId,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(
        and(
          inArray(tasks.projectId, projIds),
          sql`${tasks.status} <> 'done'`,
          isNull(tasks.deletedAt)
        )
      )
      .groupBy(tasks.projectId);
    openMap = new Map(counts.map((c) => [c.projectId, c.count]));
  }

  const sidebarProjects: SidebarProject[] = projRows.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    nameEn: p.nameEn,
    color: p.color,
    openTasks: openMap.get(p.id) ?? 0,
  }));

  const teamsRows = await getTeams(user.workspaceId);
  const sidebarTeams: SidebarTeam[] = teamsRows.map((t) => ({
    id: t.id,
    name: t.name,
    memberCount: t.memberCount,
  }));

  const [{ count: myTasksOpen } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
    .where(
      and(
        eq(taskAssignees.userId, user.id),
        eq(tasks.workspaceId, user.workspaceId),
        sql`${tasks.status} <> 'done'`,
        isNull(tasks.deletedAt)
      )
    );

  return (
    <AppShell
      topbar={
        <Topbar
          locale={locale}
          theme={theme}
          dict={dict}
          currentUser={user}
          crumbs={[]}
        />
      }
      sidebar={
        <Sidebar
          locale={locale}
          dict={dict}
          projects={sidebarProjects}
          teams={sidebarTeams}
          myTasksCount={myTasksOpen}
        />
      }
    >
      {children}
    </AppShell>
  );
}
