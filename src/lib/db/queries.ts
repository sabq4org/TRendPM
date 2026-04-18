import "server-only";
import { db } from "./index";
import {
  projects,
  tasks,
  taskAssignees,
  users,
  workspaces,
  activities,
  comments,
  projectMembers,
  teams,
  teamMembers,
} from "./schema";
import { and, desc, eq, inArray, isNull, sql, asc } from "drizzle-orm";
import type { TaskStatus } from "./schema";

export async function getWorkspaceBySlug(slug: string) {
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.slug, slug), isNull(workspaces.deletedAt)))
    .limit(1);
  return ws;
}

export async function getWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      nameEn: users.nameEn,
      initials: users.initials,
      hue: users.hue,
      role: users.role,
    })
    .from(users)
    .innerJoin(
      sql`workspace_members wm`,
      sql`wm.user_id = ${users.id} and wm.workspace_id = ${workspaceId} and wm.deleted_at is null`
    )
    .where(isNull(users.deletedAt));
}

export async function getProjects(workspaceId: string) {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.priority));
}

export async function getProject(workspaceId: string, id: string) {
  const [p] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
    .limit(1);
  return p;
}

export type TaskWithAssignees = Awaited<ReturnType<typeof getTasks>>[number];

export async function getTasks(workspaceId: string, opts?: { projectId?: string }) {
  const where = opts?.projectId
    ? and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.projectId, opts.projectId),
        isNull(tasks.deletedAt)
      )
    : and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt));

  const rows = await db
    .select({
      id: tasks.id,
      code: tasks.code,
      projectId: tasks.projectId,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      progress: tasks.progress,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      estimatedHours: tasks.estimatedHours,
      actualHours: tasks.actualHours,
      position: tasks.position,
      tags: tasks.tags,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(where)
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  const ids = rows.map((r) => r.id);
  if (!ids.length) return rows.map((r) => ({ ...r, assignees: [] as AssigneeInfo[] }));

  const assigneeRows = await db
    .select({
      taskId: taskAssignees.taskId,
      userId: taskAssignees.userId,
      id: users.id,
      name: users.name,
      nameEn: users.nameEn,
      initials: users.initials,
      hue: users.hue,
    })
    .from(taskAssignees)
    .leftJoin(users, eq(taskAssignees.userId, users.id))
    .where(inArray(taskAssignees.taskId, ids));

  const byTask = new Map<string, AssigneeInfo[]>();
  for (const a of assigneeRows) {
    if (!a.userId || !a.name) continue;
    const arr = byTask.get(a.taskId) ?? [];
    arr.push({
      id: a.userId,
      name: a.name,
      nameEn: a.nameEn,
      initials: a.initials,
      hue: a.hue,
    });
    byTask.set(a.taskId, arr);
  }

  return rows.map((r) => ({
    ...r,
    assignees: byTask.get(r.id) ?? [],
  }));
}

export type AssigneeInfo = {
  id: string;
  name: string;
  nameEn: string | null;
  initials: string | null;
  hue: number | null;
};

export async function getTaskById(workspaceId: string, taskId: string) {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)))
    .limit(1);
  return row;
}

export async function getMyTasks(workspaceId: string, userId: string) {
  const rows = await db
    .select({
      id: tasks.id,
      code: tasks.code,
      projectId: tasks.projectId,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      progress: tasks.progress,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      estimatedHours: tasks.estimatedHours,
      actualHours: tasks.actualHours,
      position: tasks.position,
      tags: tasks.tags,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(taskAssignees.userId, userId),
        isNull(tasks.deletedAt)
      )
    )
    .orderBy(asc(tasks.dueDate));
  return rows;
}

export async function getRecentActivity(workspaceId: string, limit = 10) {
  return db
    .select({
      id: activities.id,
      verb: activities.verb,
      targetType: activities.targetType,
      targetId: activities.targetId,
      createdAt: activities.createdAt,
      actorId: activities.actorId,
      actorName: users.name,
      actorNameEn: users.nameEn,
      actorInitials: users.initials,
      actorHue: users.hue,
      taskCode: tasks.code,
      taskTitle: tasks.title,
    })
    .from(activities)
    .leftJoin(users, eq(activities.actorId, users.id))
    .leftJoin(tasks, eq(activities.taskId, tasks.id))
    .where(eq(activities.workspaceId, workspaceId))
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}

export async function getCommentsForTask(taskId: string) {
  return db
    .select({
      id: comments.id,
      content: comments.content,
      contentText: comments.contentText,
      mentions: comments.mentions,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorNameEn: users.nameEn,
      authorInitials: users.initials,
      authorHue: users.hue,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.taskId, taskId), isNull(comments.deletedAt)))
    .orderBy(asc(comments.createdAt));
}

export async function getProjectMembers(projectId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      nameEn: users.nameEn,
      initials: users.initials,
      hue: users.hue,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
}

export async function getTeams(workspaceId: string) {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      color: teams.color,
    })
    .from(teams)
    .where(and(eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)));
  if (!rows.length) return rows.map((t) => ({ ...t, memberCount: 0 }));

  const counts = await db
    .select({
      teamId: teamMembers.teamId,
      count: sql<number>`count(*)::int`,
    })
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, rows.map((r) => r.id)))
    .groupBy(teamMembers.teamId);

  const map = new Map(counts.map((c) => [c.teamId, c.count]));
  return rows.map((t) => ({ ...t, memberCount: map.get(t.id) ?? 0 }));
}

export function statusColumnCount(
  tasksList: { status: string }[]
): Record<TaskStatus, number> {
  const out: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    blocked: 0,
    done: 0,
  };
  for (const t of tasksList) {
    if (t.status in out) out[t.status as TaskStatus]++;
  }
  return out;
}
