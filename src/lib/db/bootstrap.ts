/**
 * Bootstraps a fresh, production-ready install:
 *  - Creates the initial workspace
 *  - Creates the admin user with a hashed password
 *  - Creates the workspace_members row tying admin to workspace
 *
 * Env vars (read from .env.local):
 *   ADMIN_EMAIL      — admin user email          (required)
 *   ADMIN_NAME       — admin user display name   (default: "Admin")
 *   ADMIN_PASSWORD   — initial password          (default: random, logged to console)
 *   WORKSPACE_NAME   — workspace name            (default: "Trend")
 *   WORKSPACE_SLUG   — workspace slug            (default: derived from name)
 *
 * Use: pnpm db:bootstrap
 */
import { randomBytes } from "node:crypto";
import { db } from "../db";
import { users, workspaces, workspaceMembers } from "./schema";
import { hashPassword } from "../auth/password";
import { eq } from "drizzle-orm";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase() || "U";
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is required. Set it in .env.local.");

  const name = process.env.ADMIN_NAME || "Admin";
  const workspaceName = process.env.WORKSPACE_NAME || "Trend";
  const workspaceSlug = process.env.WORKSPACE_SLUG || slugify(workspaceName) || "workspace";

  let password = process.env.ADMIN_PASSWORD;
  let passwordWasGenerated = false;
  if (!password) {
    password = randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
    passwordWasGenerated = true;
  }

  console.log("→ Bootstrapping workspace and admin user...");
  console.log(`  • Workspace: ${workspaceName} (${workspaceSlug})`);
  console.log(`  • Admin:     ${name} <${email}>`);

  // Check existing
  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    throw new Error(
      `User ${email} already exists. Run \`pnpm db:clean\` first if you want to start over.`
    );
  }
  const [existingWs] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, workspaceSlug))
    .limit(1);
  if (existingWs) {
    throw new Error(
      `Workspace slug "${workspaceSlug}" already exists. Set WORKSPACE_SLUG to something unique.`
    );
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email,
      name,
      initials: initialsFrom(name),
      hue: Math.floor(Math.random() * 360),
      role: "owner",
      locale: "ar",
      passwordHash,
      emailVerifiedAt: new Date(),
    })
    .returning();

  const [ws] = await db
    .insert(workspaces)
    .values({
      name: workspaceName,
      slug: workspaceSlug,
      ownerId: user.id,
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: ws.id,
    userId: user.id,
    role: "admin",
  });

  console.log("");
  console.log("✓ Bootstrap complete.");
  console.log("");
  console.log("  ─── Sign-in credentials ───");
  console.log(`  Email:    ${email}`);
  if (passwordWasGenerated) {
    console.log(`  Password: ${password}   ← generated, save this now!`);
  } else {
    console.log(`  Password: (as provided in ADMIN_PASSWORD)`);
  }
  console.log("  ──────────────────────────");
  console.log("");
  console.log("  You can change the password from Settings after signing in.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
