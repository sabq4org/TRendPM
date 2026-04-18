/**
 * Wipes ALL application data (projects, tasks, users, workspaces, etc.)
 * but preserves the schema and migration history.
 *
 * Use: pnpm db:clean
 */
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

const TABLES = [
  "sessions",
  "activities",
  "notifications",
  "attachments",
  "comments",
  "task_tags",
  "tags",
  "task_assignees",
  "tasks",
  "project_members",
  "projects",
  "team_members",
  "teams",
  "workspace_members",
  "workspaces",
  "users",
] as const;

async function main() {
  console.log("⚠️  Truncating all application tables...");
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await sql.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  console.log("✓ All data wiped. Schema preserved.");
  console.log("  Next step: pnpm db:bootstrap");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
