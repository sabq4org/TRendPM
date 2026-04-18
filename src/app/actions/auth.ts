"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSession, destroySession, readSessionCookie } from "@/lib/auth/session";

export type AuthState = { ok: true } | { ok: false; error: string };

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signInAction(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "بيانات غير صحيحة." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || user.deletedAt || !user.passwordHash) {
    return { ok: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, user.id), isNull(workspaces.deletedAt)))
    .limit(1);

  const hdrs = await headers();
  await createSession({
    userId: user.id,
    workspaceId: membership?.workspaceId ?? null,
    userAgent: hdrs.get("user-agent"),
    ip: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
  });

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "كلمة المرور الجديدة 8 أحرف على الأقل."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين.",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const payload = await readSessionCookie();
  if (!payload?.sub) return { ok: false, error: "يجب تسجيل الدخول." };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة." };
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user?.passwordHash) return { ok: false, error: "حساب غير صالح." };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "كلمة المرور الحالية غير صحيحة." };

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

  return { ok: true };
}
