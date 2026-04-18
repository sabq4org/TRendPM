"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  tasks,
  taskAssignees,
  checklistItems,
  comments,
  activities,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

// ─── helpers ─────────────────────────────────────────────────────────────────
async function assertTaskInWorkspace(taskId: string, workspaceId: string) {
  const [row] = await db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  if (!row) throw new Error("Task not found");
  return row;
}

// ─── setTaskAssignees (replace) ──────────────────────────────────────────────
const SetAssigneesSchema = z.object({
  taskId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).max(20),
});

export async function setTaskAssignees(input: z.infer<typeof SetAssigneesSchema>) {
  const { taskId, userIds } = SetAssigneesSchema.parse(input);
  const user = await requireUser();
  const t = await assertTaskInWorkspace(taskId, user.workspaceId);

  await db
    .delete(taskAssignees)
    .where(and(eq(taskAssignees.taskId, taskId), sql`${taskAssignees.userId} IS NOT NULL`));

  if (userIds.length > 0) {
    await db
      .insert(taskAssignees)
      .values(userIds.map((uid) => ({ taskId, userId: uid })));
  }

  await db.insert(activities).values({
    workspaceId: user.workspaceId,
    projectId: t.projectId,
    taskId,
    actorId: user.id,
    verb: "assignees_changed",
    targetType: "task",
    targetId: taskId,
    metadata: { count: userIds.length },
  });

  revalidatePath(`/projects/${t.projectId}`, "layout");
  revalidatePath("/my-tasks");
  return { ok: true };
}

// ─── updateTaskDescription ───────────────────────────────────────────────────
const UpdateDescriptionSchema = z.object({
  taskId: z.string().uuid(),
  description: z.string().max(8000),
});

export async function updateTaskDescription(
  input: z.infer<typeof UpdateDescriptionSchema>
) {
  const { taskId, description } = UpdateDescriptionSchema.parse(input);
  const user = await requireUser();
  const t = await assertTaskInWorkspace(taskId, user.workspaceId);

  const trimmed = description.trim();
  await db
    .update(tasks)
    .set({
      description: trimmed.length ? { type: "text", text: trimmed } : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  revalidatePath(`/projects/${t.projectId}`, "layout");
  return { ok: true };
}

// ─── addChecklistItem ────────────────────────────────────────────────────────
const AddChecklistSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().trim().min(1).max(300),
});

export async function addChecklistItem(
  input: z.infer<typeof AddChecklistSchema>
) {
  const { taskId, content } = AddChecklistSchema.parse(input);
  const user = await requireUser();
  const t = await assertTaskInWorkspace(taskId, user.workspaceId);

  const [pos] = await db
    .select({ m: sql<number>`coalesce(max(position),0)+1` })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId));

  const [created] = await db
    .insert(checklistItems)
    .values({ taskId, content, position: Number(pos?.m ?? 1) })
    .returning();

  revalidatePath(`/projects/${t.projectId}`, "layout");
  return { ok: true, item: created };
}

// ─── toggleChecklistItem ─────────────────────────────────────────────────────
const ToggleChecklistSchema = z.object({
  itemId: z.string().uuid(),
  done: z.boolean(),
});

export async function toggleChecklistItem(
  input: z.infer<typeof ToggleChecklistSchema>
) {
  const { itemId, done } = ToggleChecklistSchema.parse(input);
  const user = await requireUser();

  const [row] = await db
    .select({ id: checklistItems.id, taskId: checklistItems.taskId })
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);
  if (!row) throw new Error("Item not found");
  const t = await assertTaskInWorkspace(row.taskId, user.workspaceId);

  await db
    .update(checklistItems)
    .set({ done, updatedAt: new Date() })
    .where(eq(checklistItems.id, itemId));

  revalidatePath(`/projects/${t.projectId}`, "layout");
  return { ok: true };
}

// ─── deleteChecklistItem ─────────────────────────────────────────────────────
const DeleteChecklistSchema = z.object({ itemId: z.string().uuid() });

export async function deleteChecklistItem(
  input: z.infer<typeof DeleteChecklistSchema>
) {
  const { itemId } = DeleteChecklistSchema.parse(input);
  const user = await requireUser();

  const [row] = await db
    .select({ id: checklistItems.id, taskId: checklistItems.taskId })
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);
  if (!row) return { ok: true };
  const t = await assertTaskInWorkspace(row.taskId, user.workspaceId);

  await db.delete(checklistItems).where(eq(checklistItems.id, itemId));

  revalidatePath(`/projects/${t.projectId}`, "layout");
  return { ok: true };
}

// ─── addComment ──────────────────────────────────────────────────────────────
const AddCommentSchema = z.object({
  taskId: z.string().uuid(),
  text: z.string().trim().min(1).max(4000),
});

export async function addComment(input: z.infer<typeof AddCommentSchema>) {
  const { taskId, text } = AddCommentSchema.parse(input);
  const user = await requireUser();
  const t = await assertTaskInWorkspace(taskId, user.workspaceId);

  const [created] = await db
    .insert(comments)
    .values({
      taskId,
      authorId: user.id,
      content: { type: "text", text },
      contentText: text,
    })
    .returning();

  await db.insert(activities).values({
    workspaceId: user.workspaceId,
    projectId: t.projectId,
    taskId,
    actorId: user.id,
    verb: "commented",
    targetType: "task",
    targetId: taskId,
    metadata: { commentId: created.id },
  });

  revalidatePath(`/projects/${t.projectId}`, "layout");
  return { ok: true, comment: created };
}

// ─── deleteComment (soft delete) ─────────────────────────────────────────────
const DeleteCommentSchema = z.object({ commentId: z.string().uuid() });

export async function deleteComment(
  input: z.infer<typeof DeleteCommentSchema>
) {
  const { commentId } = DeleteCommentSchema.parse(input);
  const user = await requireUser();

  const [row] = await db
    .select({
      id: comments.id,
      taskId: comments.taskId,
      authorId: comments.authorId,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  if (!row) return { ok: true };

  if (row.authorId !== user.id && user.workspaceRole !== "admin") {
    throw new Error("Forbidden");
  }
  const t = await assertTaskInWorkspace(row.taskId, user.workspaceId);

  await db
    .update(comments)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(comments.id, commentId));

  revalidatePath(`/projects/${t.projectId}`, "layout");
  return { ok: true };
}

// ─── updateEstimate ──────────────────────────────────────────────────────────
const UpdateEstimateSchema = z.object({
  taskId: z.string().uuid(),
  hours: z.number().nonnegative().nullable(),
});

export async function updateEstimate(
  input: z.infer<typeof UpdateEstimateSchema>
) {
  const { taskId, hours } = UpdateEstimateSchema.parse(input);
  const user = await requireUser();
  const t = await assertTaskInWorkspace(taskId, user.workspaceId);

  await db
    .update(tasks)
    .set({
      estimatedHours: hours == null ? null : String(hours),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  revalidatePath(`/projects/${t.projectId}`, "layout");
  return { ok: true };
}
