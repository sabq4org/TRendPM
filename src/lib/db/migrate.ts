import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("→ Creating migrations meta table...");
  await sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const drizzleDir = join(process.cwd(), "drizzle");
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = await sql`SELECT hash FROM __drizzle_migrations`;
  const appliedHashes = new Set((applied as { hash: string }[]).map((r) => r.hash));

  for (const file of files) {
    if (appliedHashes.has(file)) {
      console.log(`→ Skipping (already applied): ${file}`);
      continue;
    }
    console.log(`→ Applying: ${file}`);
    const raw = readFileSync(join(drizzleDir, file), "utf-8");
    const firstPass = raw.includes("--> statement-breakpoint")
      ? raw.split("--> statement-breakpoint")
      : [raw];
    const statements = firstPass
      .flatMap((chunk) =>
        chunk
          .split(/\n/)
          .filter((l) => !l.trim().startsWith("--"))
          .join("\n")
          .split(";")
      )
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await sql.query(stmt);
      } catch (err) {
        console.error(`✗ Failed on statement:\n${stmt.slice(0, 200)}...`);
        throw err;
      }
    }

    await sql`INSERT INTO __drizzle_migrations (hash) VALUES (${file})`;
    console.log(`✓ Applied: ${file}`);
  }

  console.log("✓ All migrations applied successfully");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
