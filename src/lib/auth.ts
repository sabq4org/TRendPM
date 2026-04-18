import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { users, workspaces, workspaceMembers, sessions } from "./db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { readSessionCookie } from "./auth/session";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  nameEn: string | null;
  initials: string | null;
  hue: number | null;
  role: string | null;
  locale: string;
  workspaceId: string;
  workspaceRole: string;
};

/**
 * Returns the current authenticated user, or null if not signed in.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const payload = await readSessionCookie();
  if (!payload?.sub || !payload.sid) return null;

  const [session] = await db
    .select({ id: sessions.id, expiresAt: sessions.expiresAt, userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, payload.sid))
    .limit(1);

  if (!session || session.userId !== payload.sub) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      nameEn: users.nameEn,
      initials: users.initials,
      hue: users.hue,
      role: users.role,
      locale: users.locale,
    })
    .from(users)
    .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)))
    .limit(1);

  if (!user) return null;

  // Figure out active workspace: JWT-preferred, else first membership.
  let workspaceId = payload.ws ?? null;
  let workspaceRole: string | null = null;

  if (workspaceId) {
    const [wm] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, user.id),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      )
      .limit(1);
    workspaceRole = wm?.role ?? null;
    if (!wm) workspaceId = null;
  }

  if (!workspaceId) {
    const [first] = await db
      .select({ id: workspaces.id, role: workspaceMembers.role })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(and(eq(workspaceMembers.userId, user.id), isNull(workspaces.deletedAt)))
      .limit(1);
    if (!first) return null;
    workspaceId = first.id;
    workspaceRole = first.role;
  }

  return {
    ...user,
    workspaceId,
    workspaceRole: workspaceRole ?? "member",
  };
});

/**
 * Throws a redirect to /login if the user is not authenticated.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireWorkspaceAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.workspaceRole !== "admin") {
    throw new Error("Forbidden: admin access required.");
  }
  return user;
}
