import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getTaskById, getCommentsForTask } from "@/lib/db/queries";
import { db } from "@/lib/db";
import {
  taskAssignees,
  users,
  projects,
  checklistItems,
  workspaceMembers,
} from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser();

  const task = await getTaskById(user.workspaceId, id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [commentsList, members, assigneeRows, projRows, checklistRows] =
    await Promise.all([
      getCommentsForTask(id),
      db
        .select({
          id: users.id,
          name: users.name,
          nameEn: users.nameEn,
          initials: users.initials,
          hue: users.hue,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(
          and(
            eq(workspaceMembers.workspaceId, user.workspaceId),
            isNull(users.deletedAt),
            isNull(workspaceMembers.deletedAt)
          )
        ),
      db
        .select({
          userId: taskAssignees.userId,
          id: users.id,
          name: users.name,
          nameEn: users.nameEn,
          initials: users.initials,
          hue: users.hue,
        })
        .from(taskAssignees)
        .leftJoin(users, eq(taskAssignees.userId, users.id))
        .where(eq(taskAssignees.taskId, id)),
      db
        .select({
          id: projects.id,
          key: projects.key,
          name: projects.name,
          nameEn: projects.nameEn,
          color: projects.color,
        })
        .from(projects)
        .where(and(eq(projects.id, task.projectId)))
        .limit(1),
      db
        .select({
          id: checklistItems.id,
          content: checklistItems.content,
          done: checklistItems.done,
          position: checklistItems.position,
        })
        .from(checklistItems)
        .where(eq(checklistItems.taskId, id))
        .orderBy(asc(checklistItems.position), asc(checklistItems.createdAt)),
    ]);

  return NextResponse.json({
    task: {
      id: task.id,
      code: task.code,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      progress: task.progress,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      tags: task.tags,
      projectId: task.projectId,
      color: task.color,
    },
    project: projRows[0] ?? null,
    assignees: assigneeRows
      .filter((r) => r.id && r.name)
      .map((r) => ({
        id: r.id!,
        name: r.name!,
        nameEn: r.nameEn,
        initials: r.initials,
        hue: r.hue,
      })),
    comments: commentsList.map((c) => ({
      id: c.id,
      text: c.contentText,
      createdAt: c.createdAt,
      author: c.authorId
        ? {
            id: c.authorId,
            name: c.authorName || "",
            nameEn: c.authorNameEn,
            initials: c.authorInitials,
            hue: c.authorHue,
          }
        : null,
    })),
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      nameEn: m.nameEn,
      initials: m.initials,
      hue: m.hue,
      role: m.role,
    })),
    checklist: checklistRows.map((c) => ({
      id: c.id,
      content: c.content,
      done: c.done,
      position: c.position,
    })),
  });
}
