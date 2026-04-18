"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  tasks,
  taskAssignees,
  activities,
  projects,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { and, eq, isNull, sql } from "drizzle-orm";

const TaskStatusEnum = z.enum(TASK_STATUSES);
const TaskPriorityEnum = z.enum(TASK_PRIORITIES);

// ─── updateTaskStatus ────────────────────────────────────────────────────────
const UpdateStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: TaskStatusEnum,
});

export async function updateTaskStatus(input: z.infer<typeof UpdateStatusSchema>) {
  const { taskId, status } = UpdateStatusSchema.parse(input);
  const user = await getCurrentUser();

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, user.workspaceId), isNull(tasks.deletedAt)))
    .limit(1);

  if (!existing) throw new Error("Task not found");

  await db
    .update(tasks)
    .set({
      status,
      progress: status === "done" ? 100 : existing.progress,
      completedAt: status === "done" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  await db.insert(activities).values({
    workspaceId: user.workspaceId,
    projectId: existing.projectId,
    taskId,
    actorId: user.id,
    verb: "status_changed",
    targetType: "task",
    targetId: taskId,
    metadata: { from: existing.status, to: status },
  });

  revalidatePath("/dashboard");
  revalidatePath("/my-tasks");
  revalidatePath(`/projects/${existing.projectId}`, "layout");
  return { ok: true };
}

// ─── reorderTasks (inside same status column) ───────────────────────────────
const ReorderSchema = z.object({
  projectId: z.string().uuid(),
  status: TaskStatusEnum,
  taskIds: z.array(z.string().uuid()),
});

export async function reorderTasks(input: z.infer<typeof ReorderSchema>) {
  const { projectId, taskIds } = ReorderSchema.parse(input);
  const user = await getCurrentUser();

  for (let i = 0; i < taskIds.length; i++) {
    await db
      .update(tasks)
      .set({ position: i, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskIds[i]), eq(tasks.workspaceId, user.workspaceId)));
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true };
}

// ─── moveAndReorder (cross-column drag in Kanban) ───────────────────────────
const MoveSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  toStatus: TaskStatusEnum,
  toIndex: z.number().int().nonnegative(),
});

export async function moveTask(input: z.infer<typeof MoveSchema>) {
  const { projectId, taskId, toStatus, toIndex } = MoveSchema.parse(input);
  const user = await getCurrentUser();

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, user.workspaceId), isNull(tasks.deletedAt)))
    .limit(1);
  if (!existing) throw new Error("Task not found");

  const siblings = await db
    .select({ id: tasks.id, position: tasks.position })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, user.workspaceId),
        eq(tasks.projectId, projectId),
        eq(tasks.status, toStatus),
        isNull(tasks.deletedAt),
        sql`${tasks.id} != ${taskId}`
      )
    )
    .orderBy(tasks.position);

  const ordered = [...siblings];
  ordered.splice(Math.min(toIndex, ordered.length), 0, { id: taskId, position: 0 });

  for (let i = 0; i < ordered.length; i++) {
    const t = ordered[i];
    const updates: {
      position: number;
      updatedAt: Date;
      status?: (typeof TASK_STATUSES)[number];
      progress?: number;
      completedAt?: Date | null;
    } = {
      position: i,
      updatedAt: new Date(),
    };
    if (t.id === taskId) {
      updates.status = toStatus;
      if (toStatus === "done") {
        updates.progress = 100;
        updates.completedAt = new Date();
      } else if (existing.status === "done") {
        updates.completedAt = null;
      }
    }
    await db.update(tasks).set(updates).where(eq(tasks.id, t.id));
  }

  if (existing.status !== toStatus) {
    await db.insert(activities).values({
      workspaceId: user.workspaceId,
      projectId,
      taskId,
      actorId: user.id,
      verb: "status_changed",
      targetType: "task",
      targetId: taskId,
      metadata: { from: existing.status, to: toStatus },
    });
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true };
}

// ─── createTask ──────────────────────────────────────────────────────────────
const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  status: TaskStatusEnum.default("todo"),
  priority: TaskPriorityEnum.default("medium"),
  dueDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional().default([]),
});

export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
  const parsed = CreateTaskSchema.parse(input);
  const user = await getCurrentUser();

  const [proj] = await db
    .select({ key: projects.key })
    .from(projects)
    .where(eq(projects.id, parsed.projectId))
    .limit(1);
  const projectKey = proj?.key ?? "TASK";

  const [nextRow] = await db
    .select({
      n: sql<number>`coalesce(max(cast(split_part(${tasks.code},'-',2) as int)),0)+1`,
    })
    .from(tasks)
    .where(eq(tasks.projectId, parsed.projectId));
  const nextNum = Number(nextRow?.n ?? 1);
  const code = `${projectKey}-${nextNum}`;

  const [maxPos] = await db
    .select({ m: sql<number>`coalesce(max(position),0)` })
    .from(tasks)
    .where(and(eq(tasks.projectId, parsed.projectId), eq(tasks.status, parsed.status)));

  const [created] = await db
    .insert(tasks)
    .values({
      workspaceId: user.workspaceId,
      projectId: parsed.projectId,
      code,
      title: parsed.title,
      status: parsed.status,
      priority: parsed.priority,
      dueDate: parsed.dueDate || null,
      createdBy: user.id,
      position: (maxPos?.m ?? 0) + 1,
    })
    .returning();

  if (parsed.assigneeIds.length) {
    await db.insert(taskAssignees).values(
      parsed.assigneeIds.map((uid) => ({ taskId: created.id, userId: uid }))
    );
  }

  await db.insert(activities).values({
    workspaceId: user.workspaceId,
    projectId: parsed.projectId,
    taskId: created.id,
    actorId: user.id,
    verb: "created",
    targetType: "task",
    targetId: created.id,
  });

  revalidatePath(`/projects/${parsed.projectId}`, "layout");
  return { ok: true, task: created };
}

// ─── updateTask (title, priority, dueDate, progress, description) ────────────
const UpdateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  priority: TaskPriorityEnum.optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  estimatedHours: z.number().nonnegative().nullable().optional(),
});

export async function updateTask(input: z.infer<typeof UpdateTaskSchema>) {
  const parsed = UpdateTaskSchema.parse(input);
  const user = await getCurrentUser();

  const [existing] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, parsed.taskId), eq(tasks.workspaceId, user.workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Task not found");

  const updates: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.dueDate !== undefined) updates.dueDate = parsed.dueDate;
  if (parsed.startDate !== undefined) updates.startDate = parsed.startDate;
  if (parsed.progress !== undefined) updates.progress = parsed.progress;
  if (parsed.estimatedHours !== undefined) {
    updates.estimatedHours = parsed.estimatedHours == null ? null : String(parsed.estimatedHours);
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, parsed.taskId));

  revalidatePath(`/projects/${existing.projectId}`, "layout");
  revalidatePath("/my-tasks");
  return { ok: true };
}

// ─── createProject ───────────────────────────────────────────────────────────
const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(150),
  nameEn: z.string().trim().optional(),
  key: z.string().trim().min(2).max(10).regex(/^[A-Z0-9]+$/),
  client: z.string().trim().optional(),
  color: z.string().optional(),
});

export async function createProject(input: z.infer<typeof CreateProjectSchema>) {
  const parsed = CreateProjectSchema.parse(input);
  const user = await getCurrentUser();

  const [created] = await db
    .insert(projects)
    .values({
      workspaceId: user.workspaceId,
      name: parsed.name,
      nameEn: parsed.nameEn,
      key: parsed.key,
      client: parsed.client,
      color: parsed.color ?? "#38BDF8",
      projectManagerId: user.id,
      status: "active",
      priority: "medium",
    })
    .returning();

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true, project: created };
}
