"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, workspaceMembers } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { requireWorkspaceAdmin } from "@/lib/auth";
import { WORKSPACE_ROLES } from "@/lib/workspace-roles";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase() || "U";
}

export type InviteState =
  | { ok: true; email: string; password: string; generated: boolean }
  | { ok: false; error: string }
  | null;

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().optional(),
  role: z.enum(WORKSPACE_ROLES),
  password: z.string().optional(),
});

export async function inviteMemberAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const admin = await requireWorkspaceAdmin();

  const parsed = inviteSchema.safeParse({
    email: (formData.get("email") as string | null)?.toLowerCase().trim(),
    name: formData.get("name"),
    nameEn: formData.get("nameEn") || undefined,
    role: formData.get("role") || "member",
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة." };
  }

  const existing = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  const existingUser = existing[0];

  let userId: string;
  let rawPassword = parsed.data.password?.trim() || "";
  let generated = false;
  if (!rawPassword) {
    rawPassword = randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
    generated = true;
  }

  if (existingUser && !existingUser.deletedAt) {
    userId = existingUser.id;
    // Only update password if caller provided one explicitly
    if (parsed.data.password?.trim()) {
      const hash = await hashPassword(rawPassword);
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));
    } else {
      rawPassword = "";
      generated = false;
    }
  } else {
    const passwordHash = await hashPassword(rawPassword);
    const [inserted] = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        name: parsed.data.name,
        nameEn: parsed.data.nameEn,
        initials: initialsFrom(parsed.data.name),
        hue: Math.floor(Math.random() * 360),
        locale: "ar",
        passwordHash,
      })
      .returning({ id: users.id });
    userId = inserted.id;
  }

  const already = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, admin.workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  if (already[0]) {
    return {
      ok: false,
      error: "هذا المستخدم عضو بالفعل في مساحة العمل.",
    };
  }

  await db.insert(workspaceMembers).values({
    workspaceId: admin.workspaceId,
    userId,
    role: parsed.data.role,
  });

  revalidatePath("/settings/members");
  revalidatePath("/", "layout");
  return {
    ok: true,
    email: parsed.data.email,
    password: rawPassword,
    generated,
  };
}

const updateRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(WORKSPACE_ROLES),
});

export async function updateMemberRoleAction(
  input: z.infer<typeof updateRoleSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireWorkspaceAdmin();
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة." };

  await db
    .update(workspaceMembers)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(
      and(
        eq(workspaceMembers.id, parsed.data.memberId),
        eq(workspaceMembers.workspaceId, admin.workspaceId)
      )
    );

  revalidatePath("/settings/members");
  return { ok: true };
}

const removeSchema = z.object({ memberId: z.string().uuid() });

export async function removeMemberAction(
  input: z.infer<typeof removeSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireWorkspaceAdmin();
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة." };

  // Prevent removing yourself
  const [row] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, parsed.data.memberId),
        eq(workspaceMembers.workspaceId, admin.workspaceId)
      )
    )
    .limit(1);

  if (!row) return { ok: false, error: "العضو غير موجود." };
  if (row.userId === admin.id) {
    return { ok: false, error: "لا يمكنك إزالة نفسك من مساحة العمل." };
  }

  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, parsed.data.memberId));

  revalidatePath("/settings/members");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Helper query for the members list
export async function listWorkspaceMembers() {
  const admin = await requireWorkspaceAdmin();
  void isNull; // silence unused
  return db
    .select({
      memberId: workspaceMembers.id,
      userId: users.id,
      email: users.email,
      name: users.name,
      nameEn: users.nameEn,
      initials: users.initials,
      hue: users.hue,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, admin.workspaceId))
    .orderBy(workspaceMembers.joinedAt);
}
