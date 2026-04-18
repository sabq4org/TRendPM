-- Optional per-task color (overrides status color in Gantt bars)
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "color" text;
