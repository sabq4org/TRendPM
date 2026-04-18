import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  date,
  boolean,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  check,
  bigint,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums as text with check-like constraints handled at app level via Zod ───
// Status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done'
// Priority: 'low' | 'medium' | 'high' | 'critical'
// Project status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
// Workspace member role: 'admin' | 'project_manager' | 'member' | 'viewer'

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

// ─── users ─────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  avatarUrl: text("avatar_url"),
  initials: text("initials"),
  hue: integer("hue"),
  role: text("role"),
  locale: text("locale").notNull().default("ar"),
  timezone: text("timezone").notNull().default("Asia/Riyadh"),
  passwordHash: text("password_hash"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  twoFactorSecret: text("two_factor_secret"),
  ...timestamps,
});

// ─── workspaces ─────────────────────────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

// ─── workspace_members ──────────────────────────────────────────────────────
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => ({
    wsMemberUnique: uniqueIndex("ws_member_unique").on(t.workspaceId, t.userId),
    wsMemberWs: index("ws_member_ws_idx").on(t.workspaceId),
  })
);

// ─── teams ──────────────────────────────────────────────────────────────────
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  ...timestamps,
});

// ─── team_members ───────────────────────────────────────────────────────────
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => ({
    teamMemberUnique: uniqueIndex("team_member_unique").on(t.teamId, t.userId),
  })
);

// ─── projects ───────────────────────────────────────────────────────────────
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    description: text("description"),
    client: text("client"),
    projectManagerId: uuid("project_manager_id").references(() => users.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date"),
    plannedEndDate: date("planned_end_date"),
    budget: numeric("budget", { precision: 14, scale: 2 }),
    spent: numeric("spent", { precision: 14, scale: 2 }),
    status: text("status").notNull().default("active"),
    priority: text("priority").notNull().default("medium"),
    color: text("color"),
    icon: text("icon"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    projectWsIdx: index("project_ws_idx").on(t.workspaceId),
    projectKeyWs: uniqueIndex("project_key_ws_unique").on(t.workspaceId, t.key),
  })
);

// ─── project_members ────────────────────────────────────────────────────────
export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    ...timestamps,
  },
  (t) => ({
    projectMemberUnique: uniqueIndex("project_member_unique").on(t.projectId, t.userId),
  })
);

// ─── tasks ──────────────────────────────────────────────────────────────────
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentTaskId: uuid("parent_task_id"),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: jsonb("description"),
    status: text("status").notNull().default("todo"),
    priority: text("priority").notNull().default("medium"),
    progress: integer("progress").notNull().default(0),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
    actualHours: numeric("actual_hours", { precision: 8, scale: 2 }),
    position: integer("position").notNull().default(0),
    tags: text("tags").array().notNull().default(sql`'{}'`),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    taskProjectStatus: index("task_project_status_idx").on(t.projectId, t.status),
    taskDueDate: index("task_due_date_idx").on(t.dueDate),
    taskWs: index("task_ws_idx").on(t.workspaceId),
    taskCodeUnique: uniqueIndex("task_code_unique").on(t.workspaceId, t.code),
  })
);

// ─── task_assignees ─────────────────────────────────────────────────────────
export const taskAssignees = pgTable(
  "task_assignees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    taskAssigneeCheck: check(
      "task_assignee_target_chk",
      sql`${t.userId} IS NOT NULL OR ${t.teamId} IS NOT NULL`
    ),
    taskAssigneeUserUnique: uniqueIndex("task_assignee_user_unique")
      .on(t.taskId, t.userId)
      .where(sql`${t.userId} IS NOT NULL`),
    taskAssigneeIdx: index("task_assignee_task_idx").on(t.taskId),
    taskAssigneeUserIdx: index("task_assignee_user_idx").on(t.userId),
  })
);

// ─── task_dependencies ──────────────────────────────────────────────────────
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("blocks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    depUnique: uniqueIndex("task_dep_unique").on(t.taskId, t.dependsOnTaskId),
  })
);

// ─── checklist_items ────────────────────────────────────────────────────────
export const checklistItems = pgTable(
  "checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    checklistTaskIdx: index("checklist_task_idx").on(t.taskId),
  })
);

// ─── comments ───────────────────────────────────────────────────────────────
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: jsonb("content").notNull(),
    contentText: text("content_text"),
    mentions: uuid("mentions").array().notNull().default(sql`'{}'`),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    commentsTaskIdx: index("comments_task_idx").on(t.taskId),
  })
);

// ─── attachments ────────────────────────────────────────────────────────────
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  uploaderId: uuid("uploader_id").references(() => users.id, { onDelete: "set null" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  storageUrl: text("storage_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── activities ─────────────────────────────────────────────────────────────
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    taskId: uuid("task_id"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    verb: text("verb").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activityProjectIdx: index("activity_project_created_idx").on(t.projectId, t.createdAt),
    activityWsIdx: index("activity_ws_created_idx").on(t.workspaceId, t.createdAt),
  })
);

// ─── notifications ──────────────────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    notifUserIdx: index("notif_user_idx").on(t.userId, t.readAt, t.createdAt),
  })
);

// ─── tags ───────────────────────────────────────────────────────────────────
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tagUnique: uniqueIndex("tag_unique").on(t.workspaceId, t.name),
  })
);

// ─── task_tags ──────────────────────────────────────────────────────────────
export const taskTags = pgTable(
  "task_tags",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.tagId] }),
  })
);

// ─── Relations ──────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaceMembers),
  assignedTasks: many(taskAssignees),
  authoredComments: many(comments),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  projects: many(projects),
  teams: many(teams),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  projectManager: one(users, {
    fields: [projects.projectManagerId],
    references: [users.id],
  }),
  members: many(projectMembers),
  tasks: many(tasks),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id],
  }),
  assignees: many(taskAssignees),
  dependencies: many(taskDependencies, { relationName: "taskDeps" }),
  checklist: many(checklistItems),
  commentsList: many(comments),
  attachmentsList: many(attachments),
  taskTags: many(taskTags),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, { fields: [taskAssignees.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskAssignees.userId], references: [users.id] }),
  team: one(teams, { fields: [taskAssignees.teamId], references: [teams.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [teams.workspaceId],
    references: [workspaces.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

// ─── sessions ───────────────────────────────────────────────────────────────
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionsUserIdx: index("sessions_user_idx").on(t.userId),
    sessionsExpiresIdx: index("sessions_expires_idx").on(t.expiresAt),
  })
);

// ─── Type exports ───────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskAssignee = typeof taskAssignees.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Team = typeof teams.$inferSelect;

export const TASK_STATUSES = ["todo", "in_progress", "in_review", "blocked", "done"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
