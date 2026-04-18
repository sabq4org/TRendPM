import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index";
import {
  users,
  workspaces,
  workspaceMembers,
  teams,
  teamMembers,
  projects,
  projectMembers,
  tasks,
  taskAssignees,
  taskDependencies,
  activities,
  comments,
} from "./schema";
import { sql } from "drizzle-orm";

type SeedUser = {
  localId: string;
  email: string;
  name: string;
  nameEn: string;
  role: string;
  initials: string;
  hue: number;
};

type SeedProject = {
  localId: string;
  key: string;
  name: string;
  nameEn: string;
  client: string;
  pmLocal: string;
  color: string;
  status: "active" | "on_hold" | "planning" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  startDate: string;
  plannedEndDate: string;
  budget: string;
  spent: string;
  tags: string[];
};

type SeedTask = {
  code: string;
  projectLocal: string;
  title: string;
  status: "todo" | "in_progress" | "in_review" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "critical";
  assigneeLocals: string[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  progress?: number;
  tags?: string[];
  dependsOn?: string[];
};

const TEAM_SEED: SeedUser[] = [
  { localId: "u1", email: "sarah@trend.sa", name: "سارة الراشد", nameEn: "Sarah Al-Rashed", role: "Product Manager", initials: "SR", hue: 180 },
  { localId: "u2", email: "omar@trend.sa", name: "عمر الزهراني", nameEn: "Omar Al-Zahrani", role: "Tech Lead", initials: "OZ", hue: 30 },
  { localId: "u3", email: "layla@trend.sa", name: "ليلى الحربي", nameEn: "Layla Al-Harbi", role: "Senior Backend", initials: "LH", hue: 320 },
  { localId: "u4", email: "youssef@trend.sa", name: "يوسف العتيبي", nameEn: "Youssef Al-Otaibi", role: "Frontend Dev", initials: "YO", hue: 260 },
  { localId: "u5", email: "maryam@trend.sa", name: "مريم الشمري", nameEn: "Maryam Al-Shammari", role: "UI/UX Designer", initials: "MS", hue: 140 },
  { localId: "u6", email: "khaled@trend.sa", name: "خالد القحطاني", nameEn: "Khaled Al-Qahtani", role: "DevOps", initials: "KQ", hue: 210 },
  { localId: "u7", email: "noura@trend.sa", name: "نورة السبيعي", nameEn: "Noura Al-Subaie", role: "QA Engineer", initials: "NS", hue: 350 },
  { localId: "u8", email: "faisal@trend.sa", name: "فيصل الدوسري", nameEn: "Faisal Al-Dosari", role: "Backend Dev", initials: "FD", hue: 80 },
  { localId: "u9", email: "reem@trend.sa", name: "ريم المطيري", nameEn: "Reem Al-Mutairi", role: "Data Engineer", initials: "RM", hue: 110 },
];

const PROJECTS_SEED: SeedProject[] = [
  { localId: "p1", key: "PAY", name: "بوابة الدفع الإلكتروني", nameEn: "Payment Gateway v2", client: "بنك الإتحاد", pmLocal: "u1", color: "#8B5CF6", status: "active", priority: "critical", startDate: "2026-02-15", plannedEndDate: "2026-05-30", budget: "420000", spent: "268000", tags: ["Fintech", "Backend"] },
  { localId: "p2", key: "CRM", name: "نظام إدارة العملاء الموحّد", nameEn: "Unified CRM", client: "ترند — داخلي", pmLocal: "u2", color: "#38BDF8", status: "active", priority: "high", startDate: "2026-01-08", plannedEndDate: "2026-06-20", budget: "310000", spent: "149000", tags: ["Internal", "Fullstack"] },
  { localId: "p3", key: "DSH", name: "لوحة التحليلات اللحظية", nameEn: "Realtime Analytics Dashboard", client: "مجموعة الأفق", pmLocal: "u1", color: "#F59E0B", status: "active", priority: "high", startDate: "2026-03-01", plannedEndDate: "2026-07-10", budget: "280000", spent: "92000", tags: ["Data", "Frontend"] },
  { localId: "p4", key: "MOB", name: "تطبيق iOS — الإصدار الثالث", nameEn: "iOS App v3", client: "ترند — عام", pmLocal: "u5", color: "#10B981", status: "active", priority: "medium", startDate: "2026-02-01", plannedEndDate: "2026-05-15", budget: "180000", spent: "124000", tags: ["Mobile", "iOS"] },
  { localId: "p5", key: "INF", name: "ترقية البنية السحابية", nameEn: "Cloud Infra Upgrade", client: "ترند — داخلي", pmLocal: "u6", color: "#F43F5E", status: "on_hold", priority: "medium", startDate: "2026-01-20", plannedEndDate: "2026-04-30", budget: "140000", spent: "86000", tags: ["DevOps", "Infra"] },
  { localId: "p6", key: "DOC", name: "بوابة التوثيق للمطورين", nameEn: "Developer Docs Portal", client: "ترند — عام", pmLocal: "u4", color: "#06B6D4", status: "planning", priority: "low", startDate: "2026-04-10", plannedEndDate: "2026-06-30", budget: "60000", spent: "0", tags: ["Docs"] },
];

const TASKS_SEED: SeedTask[] = [
  { code: "PAY-12", projectLocal: "p1", title: "إعادة هيكلة خدمة تفويض البطاقات", status: "in_progress", priority: "critical", assigneeLocals: ["u2", "u8"], startDate: "2026-04-06", dueDate: "2026-04-22", estimatedHours: 40, actualHours: 26, progress: 65, tags: ["backend", "security"] },
  { code: "PAY-13", projectLocal: "p1", title: "تكامل بوابة مدى — اختبار التشفير", status: "in_review", priority: "critical", assigneeLocals: ["u2"], startDate: "2026-04-10", dueDate: "2026-04-19", estimatedHours: 16, actualHours: 18, progress: 100, tags: ["backend"] },
  { code: "PAY-14", projectLocal: "p1", title: "تصميم شاشة الدفع — حالات الخطأ", status: "in_progress", priority: "high", assigneeLocals: ["u5"], startDate: "2026-04-08", dueDate: "2026-04-24", estimatedHours: 20, actualHours: 11, progress: 55, tags: ["design"] },
  { code: "PAY-15", projectLocal: "p1", title: "إعداد بيئة الاختبار للعميل", status: "blocked", priority: "high", assigneeLocals: ["u6"], startDate: "2026-04-12", dueDate: "2026-04-17", estimatedHours: 8, actualHours: 6, progress: 40, tags: ["devops"], dependsOn: ["PAY-12"] },
  { code: "PAY-16", projectLocal: "p1", title: "توثيق API للتكامل الخارجي", status: "todo", priority: "medium", assigneeLocals: ["u8"], startDate: "2026-04-22", dueDate: "2026-05-02", estimatedHours: 12, progress: 0, tags: ["docs"] },
  { code: "PAY-17", projectLocal: "p1", title: "اختبار الحمل — 10k req/s", status: "todo", priority: "high", assigneeLocals: ["u7", "u6"], startDate: "2026-05-01", dueDate: "2026-05-10", estimatedHours: 24, progress: 0, tags: ["qa"] },
  { code: "PAY-18", projectLocal: "p1", title: "معالجة حالة الاسترداد الجزئي", status: "todo", priority: "medium", assigneeLocals: ["u2"], startDate: "2026-05-05", dueDate: "2026-05-15", estimatedHours: 16, progress: 0, tags: ["backend"] },
  { code: "PAY-19", projectLocal: "p1", title: "مراجعة أمنية خارجية", status: "todo", priority: "critical", assigneeLocals: [], startDate: "2026-05-20", dueDate: "2026-05-28", estimatedHours: 32, progress: 0, tags: ["security"] },
  { code: "PAY-10", projectLocal: "p1", title: "ترحيل قاعدة البيانات إلى Postgres 17", status: "done", priority: "high", assigneeLocals: ["u9"], startDate: "2026-03-02", dueDate: "2026-03-18", estimatedHours: 24, actualHours: 22, progress: 100 },
  { code: "PAY-11", projectLocal: "p1", title: "إعداد مخطط العلاقات للمعاملات", status: "done", priority: "high", assigneeLocals: ["u8"], startDate: "2026-03-15", dueDate: "2026-03-28", estimatedHours: 16, actualHours: 14, progress: 100 },
  { code: "PAY-20", projectLocal: "p1", title: "إصلاح تسريب ذاكرة في العامل الخلفي", status: "in_progress", priority: "high", assigneeLocals: ["u2"], startDate: "2026-04-14", dueDate: "2026-04-16", estimatedHours: 6, actualHours: 5, progress: 75, tags: ["bug"] },

  { code: "CRM-22", projectLocal: "p2", title: "نموذج إضافة جهة اتصال — تحقق Zod", status: "in_progress", priority: "medium", assigneeLocals: ["u4"], startDate: "2026-04-08", dueDate: "2026-04-20", estimatedHours: 14, actualHours: 8, progress: 55, tags: ["frontend"] },
  { code: "CRM-23", projectLocal: "p2", title: "Import من Excel — مطابقة الحقول", status: "in_review", priority: "high", assigneeLocals: ["u4", "u8"], startDate: "2026-04-05", dueDate: "2026-04-18", estimatedHours: 20, actualHours: 22, progress: 100, tags: ["frontend", "backend"] },
  { code: "CRM-24", projectLocal: "p2", title: "فلاتر متقدّمة + حفظ الاستعلامات", status: "todo", priority: "medium", assigneeLocals: ["u4"], startDate: "2026-04-22", dueDate: "2026-05-05", estimatedHours: 18, progress: 0 },
  { code: "CRM-25", projectLocal: "p2", title: "تكامل مع الواتساب الرسمي", status: "blocked", priority: "high", assigneeLocals: ["u2"], startDate: "2026-04-12", dueDate: "2026-04-15", estimatedHours: 12, actualHours: 4, progress: 30, dependsOn: ["CRM-23"] },
  { code: "CRM-26", projectLocal: "p2", title: "تصميم صفحة العميل — الجدول الزمني", status: "in_progress", priority: "medium", assigneeLocals: ["u5"], startDate: "2026-04-10", dueDate: "2026-04-24", estimatedHours: 16, actualHours: 9, progress: 50 },
  { code: "CRM-27", projectLocal: "p2", title: "تقارير المبيعات الشهرية", status: "todo", priority: "low", assigneeLocals: ["u9"], startDate: "2026-05-01", dueDate: "2026-05-20", estimatedHours: 24, progress: 0 },
  { code: "CRM-20", projectLocal: "p2", title: "إعداد نموذج البيانات الأوّلي", status: "done", priority: "high", assigneeLocals: ["u2"], startDate: "2026-01-20", dueDate: "2026-02-10", estimatedHours: 30, actualHours: 28, progress: 100 },
  { code: "CRM-21", projectLocal: "p2", title: "Auth + Workspaces", status: "done", priority: "critical", assigneeLocals: ["u2", "u8"], startDate: "2026-02-05", dueDate: "2026-02-28", estimatedHours: 40, actualHours: 45, progress: 100 },

  { code: "DSH-8", projectLocal: "p3", title: "مخطط البيانات اللحظية — Kafka", status: "in_progress", priority: "high", assigneeLocals: ["u9", "u6"], startDate: "2026-04-02", dueDate: "2026-04-25", estimatedHours: 32, actualHours: 18, progress: 45 },
  { code: "DSH-9", projectLocal: "p3", title: "Widget محرر السحب والإفلات", status: "in_progress", priority: "high", assigneeLocals: ["u4"], startDate: "2026-04-05", dueDate: "2026-04-28", estimatedHours: 28, actualHours: 14, progress: 40 },
  { code: "DSH-10", projectLocal: "p3", title: "مخطط التدفق الجغرافي", status: "in_review", priority: "medium", assigneeLocals: ["u5", "u4"], startDate: "2026-04-01", dueDate: "2026-04-16", estimatedHours: 14, actualHours: 16, progress: 100 },
  { code: "DSH-11", projectLocal: "p3", title: "تصدير PDF/Excel", status: "todo", priority: "medium", assigneeLocals: ["u4"], startDate: "2026-04-28", dueDate: "2026-05-10", estimatedHours: 12, progress: 0 },
  { code: "DSH-12", projectLocal: "p3", title: "نظام التنبيهات — القواعد", status: "todo", priority: "high", assigneeLocals: ["u8"], startDate: "2026-05-01", dueDate: "2026-05-25", estimatedHours: 36, progress: 0 },
  { code: "DSH-13", projectLocal: "p3", title: "اختبار الأداء على 1M نقطة", status: "todo", priority: "high", assigneeLocals: ["u7"], startDate: "2026-05-20", dueDate: "2026-06-05", estimatedHours: 24, progress: 0 },
  { code: "DSH-7", projectLocal: "p3", title: "دراسة المتطلبات + Wireframes", status: "done", priority: "high", assigneeLocals: ["u1", "u5"], startDate: "2026-03-01", dueDate: "2026-03-20", estimatedHours: 40, actualHours: 36, progress: 100 },

  { code: "MOB-18", projectLocal: "p4", title: "شاشة التسجيل — OAuth Apple", status: "in_review", priority: "high", assigneeLocals: ["u5"], startDate: "2026-04-06", dueDate: "2026-04-18", estimatedHours: 16, actualHours: 15, progress: 100 },
  { code: "MOB-19", projectLocal: "p4", title: "إشعارات Push — APNs", status: "in_progress", priority: "medium", assigneeLocals: ["u6"], startDate: "2026-04-10", dueDate: "2026-04-22", estimatedHours: 12, actualHours: 7, progress: 60 },
  { code: "MOB-20", projectLocal: "p4", title: "وضع داكن — مراجعة التباين", status: "in_progress", priority: "low", assigneeLocals: ["u5"], startDate: "2026-04-08", dueDate: "2026-04-20", estimatedHours: 10, actualHours: 5, progress: 50 },
  { code: "MOB-21", projectLocal: "p4", title: "إصلاح تعطّل عند الشبكة البطيئة", status: "blocked", priority: "critical", assigneeLocals: [], startDate: "2026-04-12", dueDate: "2026-04-14", estimatedHours: 8, actualHours: 3, progress: 25, tags: ["bug"] },
  { code: "MOB-22", projectLocal: "p4", title: "إعداد Release للمتجر", status: "todo", priority: "high", assigneeLocals: ["u6"], startDate: "2026-05-01", dueDate: "2026-05-12", estimatedHours: 10, progress: 0 },

  { code: "INF-5", projectLocal: "p5", title: "ترحيل إلى Kubernetes 1.30", status: "blocked", priority: "high", assigneeLocals: ["u6"], startDate: "2026-03-20", dueDate: "2026-04-10", estimatedHours: 50, actualHours: 38, progress: 70 },
  { code: "INF-6", projectLocal: "p5", title: "إعادة هيكلة الـ CI/CD", status: "in_progress", priority: "medium", assigneeLocals: ["u6"], startDate: "2026-04-01", dueDate: "2026-04-25", estimatedHours: 30, actualHours: 16, progress: 55 },
  { code: "INF-7", projectLocal: "p5", title: "مراجعة تكلفة السحابة", status: "todo", priority: "low", assigneeLocals: ["u6"], startDate: "2026-04-20", dueDate: "2026-05-05", estimatedHours: 12, progress: 0 },

  { code: "DOC-2", projectLocal: "p6", title: "اختيار محرك التوثيق (Nextra/Docusaurus)", status: "todo", priority: "medium", assigneeLocals: ["u4"], startDate: "2026-04-15", dueDate: "2026-04-22", estimatedHours: 4, progress: 0 },
  { code: "DOC-3", projectLocal: "p6", title: "تصميم الهوية البصرية للبوابة", status: "todo", priority: "low", assigneeLocals: ["u5"], startDate: "2026-04-20", dueDate: "2026-05-05", estimatedHours: 16, progress: 0 },
];

async function main() {
  console.log("→ Clearing existing data (preserves schema)...");
  await db.execute(sql`
    TRUNCATE TABLE
      activities, comments, task_dependencies, task_assignees, checklist_items,
      attachments, task_tags, tasks, project_members, projects, team_members,
      teams, workspace_members, workspaces, users, notifications, tags
    RESTART IDENTITY CASCADE
  `);

  console.log("→ Creating users...");
  const insertedUsers = await db
    .insert(users)
    .values(
      TEAM_SEED.map((u) => ({
        email: u.email,
        name: u.name,
        nameEn: u.nameEn,
        role: u.role,
        initials: u.initials,
        hue: u.hue,
      }))
    )
    .returning();
  const userByLocal = new Map<string, string>();
  insertedUsers.forEach((u, i) => userByLocal.set(TEAM_SEED[i].localId, u.id));

  console.log("→ Creating workspace...");
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: "ترند",
      slug: "trend",
      ownerId: userByLocal.get("u1"),
    })
    .returning();

  console.log("→ Creating workspace members...");
  await db.insert(workspaceMembers).values(
    TEAM_SEED.map((u, idx) => ({
      workspaceId: workspace.id,
      userId: userByLocal.get(u.localId)!,
      role: idx === 0 ? "admin" : idx < 3 ? "project_manager" : "member",
    }))
  );

  console.log("→ Creating teams...");
  const TEAMS_DATA = [
    { name: "Backend", color: "#F59E0B", memberLocals: ["u2", "u3", "u8", "u9"] },
    { name: "Frontend", color: "#38BDF8", memberLocals: ["u4"] },
    { name: "Design", color: "#10B981", memberLocals: ["u5"] },
    { name: "DevOps", color: "#F43F5E", memberLocals: ["u6", "u7"] },
  ];
  const insertedTeams = await db
    .insert(teams)
    .values(TEAMS_DATA.map((t) => ({ workspaceId: workspace.id, name: t.name, color: t.color })))
    .returning();
  const teamMembersRows = TEAMS_DATA.flatMap((t, i) =>
    t.memberLocals.map((uLocal) => ({
      teamId: insertedTeams[i].id,
      userId: userByLocal.get(uLocal)!,
    }))
  );
  await db.insert(teamMembers).values(teamMembersRows);

  console.log("→ Creating projects...");
  const insertedProjects = await db
    .insert(projects)
    .values(
      PROJECTS_SEED.map((p) => ({
        workspaceId: workspace.id,
        key: p.key,
        name: p.name,
        nameEn: p.nameEn,
        client: p.client,
        projectManagerId: userByLocal.get(p.pmLocal),
        startDate: p.startDate,
        plannedEndDate: p.plannedEndDate,
        budget: p.budget,
        spent: p.spent,
        status: p.status,
        priority: p.priority,
        color: p.color,
      }))
    )
    .returning();
  const projectByLocal = new Map<string, string>();
  insertedProjects.forEach((p, i) => projectByLocal.set(PROJECTS_SEED[i].localId, p.id));

  console.log("→ Creating project members...");
  const projMembersRows: { projectId: string; userId: string; role: string }[] = [];
  PROJECTS_SEED.forEach((p) => {
    const pid = projectByLocal.get(p.localId)!;
    const pmUid = userByLocal.get(p.pmLocal)!;
    projMembersRows.push({ projectId: pid, userId: pmUid, role: "lead" });
    const others = TASKS_SEED.filter((t) => t.projectLocal === p.localId)
      .flatMap((t) => t.assigneeLocals)
      .filter((x) => x !== p.pmLocal);
    const unique = Array.from(new Set(others));
    for (const uLocal of unique) {
      const uid = userByLocal.get(uLocal);
      if (uid) projMembersRows.push({ projectId: pid, userId: uid, role: "member" });
    }
  });
  if (projMembersRows.length) {
    await db.insert(projectMembers).values(projMembersRows).onConflictDoNothing();
  }

  console.log("→ Creating tasks...");
  const insertedTasks = await db
    .insert(tasks)
    .values(
      TASKS_SEED.map((t, idx) => ({
        workspaceId: workspace.id,
        projectId: projectByLocal.get(t.projectLocal)!,
        code: t.code,
        title: t.title,
        status: t.status,
        priority: t.priority,
        progress: t.progress ?? 0,
        startDate: t.startDate,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours != null ? String(t.estimatedHours) : null,
        actualHours: t.actualHours != null ? String(t.actualHours) : null,
        position: idx,
        tags: t.tags ?? [],
        createdBy: userByLocal.get("u1"),
        completedAt: t.status === "done" ? new Date() : null,
      }))
    )
    .returning();
  const taskByCode = new Map<string, string>();
  insertedTasks.forEach((t, i) => taskByCode.set(TASKS_SEED[i].code, t.id));

  console.log("→ Creating task assignees...");
  const assigneeRows: { taskId: string; userId: string }[] = [];
  TASKS_SEED.forEach((t) => {
    const tid = taskByCode.get(t.code)!;
    for (const uLocal of t.assigneeLocals) {
      const uid = userByLocal.get(uLocal);
      if (uid) assigneeRows.push({ taskId: tid, userId: uid });
    }
  });
  if (assigneeRows.length) {
    await db.insert(taskAssignees).values(assigneeRows);
  }

  console.log("→ Creating task dependencies...");
  const depRows: { taskId: string; dependsOnTaskId: string; type: string }[] = [];
  TASKS_SEED.forEach((t) => {
    if (!t.dependsOn?.length) return;
    const tid = taskByCode.get(t.code)!;
    for (const depCode of t.dependsOn) {
      const depId = taskByCode.get(depCode);
      if (depId) depRows.push({ taskId: tid, dependsOnTaskId: depId, type: "blocks" });
    }
  });
  if (depRows.length) {
    await db.insert(taskDependencies).values(depRows);
  }

  console.log("→ Creating sample activities...");
  const sampleActivities = [
    { who: "u2", verb: "closed", target: "PAY-13", offsetMin: 12 },
    { who: "u4", verb: "commented", target: "CRM-23", offsetMin: 28 },
    { who: "u6", verb: "status_changed", target: "INF-5", offsetMin: 60 },
    { who: "u1", verb: "created", target: "PAY-20", offsetMin: 120 },
    { who: "u5", verb: "attachment_added", target: "MOB-18", offsetMin: 180 },
    { who: "u8", verb: "assigned", target: "PAY-12", offsetMin: 300 },
    { who: "u9", verb: "closed", target: "PAY-10", offsetMin: 1440 },
    { who: "u7", verb: "reviewed", target: "DSH-10", offsetMin: 1800 },
  ];
  const now = new Date();
  await db.insert(activities).values(
    sampleActivities
      .filter((a) => taskByCode.has(a.target))
      .map((a) => ({
        workspaceId: workspace.id,
        taskId: taskByCode.get(a.target)!,
        actorId: userByLocal.get(a.who)!,
        verb: a.verb,
        targetType: "task",
        targetId: taskByCode.get(a.target)!,
        createdAt: new Date(now.getTime() - a.offsetMin * 60_000),
      }))
  );

  console.log("→ Creating sample comments on PAY-12...");
  const pay12Id = taskByCode.get("PAY-12");
  if (pay12Id) {
    await db.insert(comments).values([
      {
        taskId: pay12Id,
        authorId: userByLocal.get("u2")!,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "بدأت بإعادة هيكلة الخدمة. أحتاج مراجعة من @ليلى الحربي على تصميم الـ middleware.",
                },
              ],
            },
          ],
        },
        contentText: "بدأت بإعادة هيكلة الخدمة. أحتاج مراجعة من @ليلى الحربي على تصميم الـ middleware.",
        mentions: [userByLocal.get("u3")!],
      },
      {
        taskId: pay12Id,
        authorId: userByLocal.get("u3")!,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "شفت الـ PR. أقترح فصل منطق التوقيع في module مستقل. التعليقات على GitHub.",
                },
              ],
            },
          ],
        },
        contentText: "شفت الـ PR. أقترح فصل منطق التوقيع في module مستقل. التعليقات على GitHub.",
        mentions: [],
      },
      {
        taskId: pay12Id,
        authorId: userByLocal.get("u2")!,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "تمام، سأطبّق التعديلات وأرفع نسخة جديدة قبل نهاية اليوم." },
              ],
            },
          ],
        },
        contentText: "تمام، سأطبّق التعديلات وأرفع نسخة جديدة قبل نهاية اليوم.",
        mentions: [],
      },
    ]);
  }

  console.log("");
  console.log("✓ Seed complete");
  console.log(`  Workspace: ${workspace.slug} (${workspace.id})`);
  console.log(`  Users: ${insertedUsers.length}`);
  console.log(`  Projects: ${insertedProjects.length}`);
  console.log(`  Tasks: ${insertedTasks.length}`);
  console.log(`  Assignees: ${assigneeRows.length}`);
  console.log(`  Dependencies: ${depRows.length}`);
}

main().catch((err) => {
  console.error("✗ Seed failed:");
  console.error(err);
  process.exit(1);
});
