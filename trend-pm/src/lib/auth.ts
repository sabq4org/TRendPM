import { cache } from "react";
import { db } from "./db";
import { users, workspaces, workspaceMembers } from "./db/schema";
import { eq, and, isNull } from "drizzle-orm";

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
};

export const supabaseEnabled = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

/**
 * Returns the current authenticated user.
 *
 * - If Supabase env vars are present, reads the Supabase session and matches by supabase_auth_id.
 *   (Stub for now — the SSR client reads from cookies; fill in when real session cookies exist.)
 * - Otherwise returns a "dev default" user (first user in DB — Sarah Al-Rashed, workspace owner)
 *   so the app stays usable without authentication.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  if (supabaseEnabled()) {
    // TODO: real Supabase session read. For now falls through to dev default.
  }

  const [ws] = await db.select().from(workspaces).where(isNull(workspaces.deletedAt)).limit(1);
  if (!ws) {
    throw new Error(
      "No workspace in the database. Run `pnpm db:seed` to populate initial data."
    );
  }

  const [row] = await db
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
    .innerJoin(
      workspaceMembers,
      and(eq(workspaceMembers.userId, users.id), eq(workspaceMembers.workspaceId, ws.id))
    )
    .where(eq(users.email, "omar@trend.sa"))
    .limit(1);

  if (!row) {
    throw new Error("Dev default user (omar@trend.sa) not found — run pnpm db:seed");
  }

  return { ...row, workspaceId: ws.id };
});
