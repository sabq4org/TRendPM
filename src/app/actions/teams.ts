"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams, teamMembers, users, workspaceMembers } from "@/lib/db/schema";
import { requireUser, requireWorkspaceAdmin } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  color: z.string().optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});

export type CreateTeamState =
  | { ok: true; teamId: string }
  | { ok: false; error: string }
  | null;

export async function createTeamAction(
  _prev: CreateTeamState,
  formData: FormData
): Promise<CreateTeamState> {
  const admin = await requireWorkspaceAdmin();

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    color: formData.get("color") || undefined,
    memberIds: formData.getAll("memberIds").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة." };
  }

  const [team] = await db
    .insert(teams)
    .values({
      workspaceId: admin.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color ?? "#38BDF8",
    })
    .returning({ id: teams.id });

  if (parsed.data.memberIds.length) {
    await db.insert(teamMembers).values(
      parsed.data.memberIds.map((userId) => ({ teamId: team.id, userId }))
    );
  }

  revalidatePath("/settings/teams");
  revalidatePath("/", "layout");
  return { ok: true, teamId: team.id };
}

const updateSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  color: z.string().optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});

export async function updateTeamAction(
  input: z.infer<typeof updateSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireWorkspaceAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة." };

  const [exists] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, parsed.data.teamId), eq(teams.workspaceId, admin.workspaceId)))
    .limit(1);
  if (!exists) return { ok: false, error: "الفريق غير موجود." };

  await db
    .update(teams)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, parsed.data.teamId));

  // Replace members
  await db.delete(teamMembers).where(eq(teamMembers.teamId, parsed.data.teamId));
  if (parsed.data.memberIds.length) {
    await db.insert(teamMembers).values(
      parsed.data.memberIds.map((userId) => ({
        teamId: parsed.data.teamId,
        userId,
      }))
    );
  }

  revalidatePath("/settings/teams");
  revalidatePath("/", "layout");
  return { ok: true };
}

const deleteSchema = z.object({ teamId: z.string().uuid() });

export async function deleteTeamAction(
  input: z.infer<typeof deleteSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireWorkspaceAdmin();
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة." };

  await db
    .delete(teams)
    .where(and(eq(teams.id, parsed.data.teamId), eq(teams.workspaceId, admin.workspaceId)));

  revalidatePath("/settings/teams");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function listTeamsWithMembers() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      color: teams.color,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .where(eq(teams.workspaceId, user.workspaceId))
    .orderBy(teams.name);

  if (rows.length === 0) return [];

  const memberRows = await db
    .select({
      teamId: teamMembers.teamId,
      userId: users.id,
      name: users.name,
      nameEn: users.nameEn,
      initials: users.initials,
      hue: users.hue,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(
      inArray(
        teamMembers.teamId,
        rows.map((t) => t.id)
      )
    );

  const byTeam = new Map<string, typeof memberRows>();
  for (const m of memberRows) {
    const arr = byTeam.get(m.teamId) ?? [];
    arr.push(m);
    byTeam.set(m.teamId, arr);
  }

  return rows.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    members: byTeam.get(t.id) ?? [],
  }));
}

export async function listWorkspaceUsers() {
  const user = await requireUser();
  return db
    .select({
      id: users.id,
      name: users.name,
      nameEn: users.nameEn,
      initials: users.initials,
      hue: users.hue,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, user.workspaceId))
    .orderBy(users.name);
}
