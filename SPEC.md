# Trend PM — المواصفات التقنية (SPEC)

هذا الملف يحتوي على كل ما يحتاجه المطوّر لبناء النظام من الصفر، دون الحاجة للرجوع لأي مرجع آخر باستثناء `Trend PM.html` كمرجع بصري.

---

## 1. نموذج البيانات (Database Schema)

### 1.1 القواعد العامة
- **UUIDs** لكل الجداول (PK و FK) — استخدم `uuid_generate_v4()` أو `gen_random_uuid()`.
- **Timestamps**: كل جدول يحتوي `created_at`, `updated_at`, `deleted_at` (soft delete).
- **Multi-tenant**: كل صف مرتبط بـ `workspace_id` (ما عدا `users` و `workspaces` نفسها).
- **RLS (Row Level Security)**: مفعّل على كل الجداول — السياسة الأساسية: المستخدم يرى فقط صفوف الـ workspace الذي هو عضو فيه.
- **Indexes** على: `project_id`, `assignee_id`, `due_date`, `status`, `workspace_id`.

### 1.2 الجداول

#### `users`
```sql
id              uuid PK
email           text UNIQUE NOT NULL
name            text NOT NULL
avatar_url      text
locale          text DEFAULT 'ar'          -- 'ar' | 'en'
timezone        text DEFAULT 'Asia/Riyadh'
two_factor_secret text
created_at, updated_at, deleted_at
```

#### `workspaces`
```sql
id              uuid PK
name            text NOT NULL
slug            text UNIQUE NOT NULL
logo_url        text
owner_id        uuid REFERENCES users(id)
created_at, updated_at, deleted_at
```

#### `workspace_members`
```sql
id              uuid PK
workspace_id    uuid REFERENCES workspaces(id)
user_id         uuid REFERENCES users(id)
role            text NOT NULL              -- 'admin' | 'project_manager' | 'member' | 'viewer'
joined_at       timestamptz
created_at, updated_at, deleted_at
UNIQUE (workspace_id, user_id)
```

#### `teams`
```sql
id              uuid PK
workspace_id    uuid REFERENCES workspaces(id)
name            text NOT NULL             -- e.g. "Backend", "Design"
description     text
color           text                      -- hex أو oklch
created_at, updated_at, deleted_at
```

#### `team_members`
```sql
id              uuid PK
team_id         uuid REFERENCES teams(id)
user_id         uuid REFERENCES users(id)
created_at, updated_at, deleted_at
UNIQUE (team_id, user_id)
```

#### `projects`
```sql
id              uuid PK
workspace_id    uuid REFERENCES workspaces(id)
name            text NOT NULL
description     text
client          text
project_manager_id uuid REFERENCES users(id)
start_date      date
planned_end_date date
budget          numeric(12,2)
status          text NOT NULL             -- 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
priority        text NOT NULL             -- 'low' | 'medium' | 'high' | 'critical'
color           text                      -- hex
icon            text                      -- اسم أيقونة lucide
archived_at     timestamptz
created_at, updated_at, deleted_at
```

#### `project_members`
```sql
id              uuid PK
project_id      uuid REFERENCES projects(id)
user_id         uuid REFERENCES users(id)
role            text                      -- 'lead' | 'member'
created_at, updated_at, deleted_at
UNIQUE (project_id, user_id)
```

#### `tasks`
```sql
id              uuid PK
workspace_id    uuid REFERENCES workspaces(id)     -- denormalized للـ RLS
project_id      uuid REFERENCES projects(id)
parent_task_id  uuid REFERENCES tasks(id)          -- للمهام الفرعية
title           text NOT NULL
description     jsonb                              -- Tiptap JSON
status          text NOT NULL                      -- 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done'
priority        text NOT NULL                      -- 'low' | 'medium' | 'high' | 'critical'
progress        int DEFAULT 0                      -- 0-100
start_date      date
due_date        date
estimated_hours numeric(6,2)
actual_hours    numeric(6,2)
position        int                                -- للترتيب داخل الحالة (Kanban)
created_by      uuid REFERENCES users(id)
completed_at    timestamptz
created_at, updated_at, deleted_at

INDEX (project_id, status)
INDEX (due_date) WHERE deleted_at IS NULL AND status != 'done'
```

#### `task_assignees`
```sql
id              uuid PK
task_id         uuid REFERENCES tasks(id)
user_id         uuid REFERENCES users(id)
team_id         uuid REFERENCES teams(id)          -- أو team بدل user
created_at
CHECK (user_id IS NOT NULL OR team_id IS NOT NULL)
```

#### `task_dependencies`
```sql
id              uuid PK
task_id         uuid REFERENCES tasks(id)          -- المهمة المحجوبة
depends_on_task_id uuid REFERENCES tasks(id)       -- تعتمد على
type            text DEFAULT 'blocks'              -- 'blocks' | 'relates_to'
created_at
UNIQUE (task_id, depends_on_task_id)
```

#### `checklist_items`
```sql
id              uuid PK
task_id         uuid REFERENCES tasks(id)
content         text NOT NULL
done            boolean DEFAULT false
position        int
created_at, updated_at
```

#### `comments`
```sql
id              uuid PK
task_id         uuid REFERENCES tasks(id)
author_id       uuid REFERENCES users(id)
content         jsonb                              -- Tiptap JSON (يدعم @mentions)
mentions        uuid[]                             -- array of user_ids
edited_at       timestamptz
created_at, updated_at, deleted_at
```

#### `attachments`
```sql
id              uuid PK
task_id         uuid REFERENCES tasks(id)
uploader_id     uuid REFERENCES users(id)
filename        text NOT NULL
mime_type       text
size_bytes      bigint
storage_url     text NOT NULL
created_at, deleted_at
```

#### `activities`
```sql
id              uuid PK
workspace_id    uuid REFERENCES workspaces(id)
project_id      uuid
task_id         uuid
actor_id        uuid REFERENCES users(id)
verb            text NOT NULL          -- 'created' | 'updated' | 'commented' | 'assigned' | 'status_changed' | ...
target_type     text                   -- 'task' | 'project' | 'comment'
target_id       uuid
metadata        jsonb                  -- old/new values
created_at

INDEX (project_id, created_at DESC)
INDEX (workspace_id, created_at DESC)
```

#### `notifications`
```sql
id              uuid PK
user_id         uuid REFERENCES users(id)
type            text NOT NULL          -- 'assigned' | 'mentioned' | 'due_soon' | 'status_changed' | 'commented'
title           text NOT NULL
body            text
link            text                   -- /projects/{id}/tasks/{id}
read_at         timestamptz
created_at

INDEX (user_id, read_at, created_at DESC)
```

#### `tags` & `task_tags`
```sql
tags:
id              uuid PK
workspace_id    uuid
name            text NOT NULL
color           text
UNIQUE (workspace_id, name)

task_tags:
task_id         uuid
tag_id          uuid
PRIMARY KEY (task_id, tag_id)
```

---

## 2. API Contracts

### 2.1 النمط المعتمد
- **Server Actions** لكل mutation (create/update/delete).
- **Route Handlers** (`/api/...`) للقراءات التي تحتاج HTTP (مثل webhooks أو exports).
- **tRPC** (اختياري) لو الفريق يريد type safety كاملة بين client و server.
- كل طلب mutation يمرّ بـ **Zod schema** للتحقق قبل DB.

### 2.2 Server Actions — أمثلة

```ts
// lib/actions/tasks.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.any().optional(),        // Tiptap JSON
  priority: z.enum(['low','medium','high','critical']),
  status: z.enum(['todo','in_progress','in_review','blocked','done']).default('todo'),
  dueDate: z.string().datetime().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  parentTaskId: z.string().uuid().optional(),
});

export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
  const session = await auth();
  if (!session) throw new Error('UNAUTHORIZED');

  const data = CreateTaskSchema.parse(input);
  // ... insert + assignees + activity log
}
```

### 2.3 Endpoints المطلوبة (تقريبياً)

| العملية | النوع | الوصف |
|---|---|---|
| `getProjects(workspaceId)` | query | قائمة المشاريع مع KPIs محسوبة |
| `getProject(id)` | query | تفاصيل مشروع + أعضاء + مهام مختصرة |
| `createProject / updateProject / archiveProject` | action | CRUD |
| `getTasks(projectId, filter)` | query | مهام المشروع مع filters |
| `getMyTasks(userId)` | query | مهام المستخدم عبر كل المشاريع |
| `createTask / updateTask / deleteTask` | action | CRUD |
| `updateTaskStatus(id, status)` | action | تحديث حالة (optimistic) |
| `reorderTasks(statusChanges)` | action | لحفظ ترتيب Kanban |
| `addTaskDependency / removeTaskDependency` | action | |
| `getWorkload(workspaceId, weekStart)` | query | حمل العمل لكل عضو |
| `getActivityFeed(projectId, limit)` | query | Activity stream |
| `getDashboard(workspaceId)` | query | KPIs + top overdue + overloaded members + velocity |
| `addComment / editComment / deleteComment` | action | |
| `uploadAttachment` | action | يرجع presigned URL |
| `markNotificationRead(id)` | action | |
| `exportProjectReport(projectId, format)` | route handler | PDF/Excel |

### 2.4 Realtime Channels (Supabase Realtime)

```
workspace:{workspaceId}:activities        → Activity feed live
project:{projectId}:tasks                 → Kanban updates
task:{taskId}:comments                    → Comments live
user:{userId}:notifications               → توصيل الإشعارات
```

---

## 3. الشاشات (Screens)

المرجع البصري الكامل في `Trend PM.html`. فيما يلي قائمة الشاشات المطلوبة ومكوّنات shadcn/ui التي يحتاجها كل منها.

### 3.1 Auth Screens
| الشاشة | المسار | shadcn components |
|---|---|---|
| Landing | `/` | — (صفحة هبوط بسيطة) |
| Login | `/login` | Card, Input, Button, Separator |
| Signup / Magic Link | `/signup` | Card, Input, Button |
| Verify OTP | `/verify` | InputOTP, Button |
| Onboarding (3 خطوات) | `/onboarding` | Steps + Form + Card |

### 3.2 App Shell
- **Sidebar** (ثابت يسار في LTR / يمين في RTL): Dashboard, Projects, My Tasks, Team, Workload, Settings + قائمة المشاريع الحديثة.
- **Topbar**: Breadcrumb + Search (فتح Cmd+K) + Notifications bell + Theme toggle + Language toggle + User menu.
- **Command Palette** (`cmdk` + shadcn): البحث عن مشروع/مهمة + اختصارات.

### 3.3 Main Views

| الشاشة | المسار | المحتوى |
|---|---|---|
| **Dashboard** | `/dashboard` | KPIs (مشاريع نشطة، مهام مفتوحة، متأخرة، Velocity) · قائمة المشاريع مع Progress Bars · Top 5 overdue · Overloaded members · Activity feed · Velocity chart |
| **Projects list** | `/projects` | جدول/شبكة بكل المشاريع + filter بـ status و priority |
| **Project Detail** | `/projects/[id]` | Header (اسم، حالة، %، فريق) + tabs: Overview / Kanban / List / Gantt / Calendar / Activity |
| Kanban | `/projects/[id]/kanban` | 5 أعمدة (To Do / In Progress / In Review / Blocked / Done) + dnd-kit |
| List | `/projects/[id]/list` | DataTable (TanStack Table) قابل للفرز والفلترة + status dropdown inline |
| Gantt | `/projects/[id]/gantt` | visx Timeline + dependency lines + drag لتغيير التواريخ |
| Calendar | `/projects/[id]/calendar` | شهري/أسبوعي (FullCalendar أو مخصّص) |
| **My Tasks** | `/my-tasks` | كل مهام المستخدم عبر كل المشاريع، مجمّعة حسب: Today / This Week / Later / Overdue |
| **Workload** | `/workload` | Heatmap أفقي: صف لكل عضو × أعمدة أيام الأسبوع، ملوّن حسب الحمل (hours) |
| **Team** | `/team` | قائمة الأعضاء + كارد لكل عضو |
| Member Profile | `/team/[id]` | مهام العضو + metrics (completion rate, avg delay) |
| **Settings** | `/settings` | Profile / Workspace / Notifications / Integrations / Appearance |

### 3.4 مكوّن Task Side Panel (مهم)
ينفتح من أي مكان ينقر فيه المستخدم على مهمة. يحتوي:
- العنوان (قابل للتعديل inline)
- Status dropdown + Priority + Assignees + Due date
- Description (Tiptap editor)
- Checklist
- Dependencies (blocked by / blocks)
- Attachments
- Comments (مع @mentions + Markdown/Tiptap)
- Activity log للمهمة

---

## 4. التصميم والثيم (Design Tokens)

### 4.1 الخطوط
```css
--font-ar: 'IBM Plex Sans Arabic', system-ui, sans-serif;
--font-en: 'IBM Plex Sans', system-ui, sans-serif;
--font-mono: 'IBM Plex Mono', 'Menlo', monospace;     /* للأرقام والـ IDs */
```

### 4.2 الألوان (Dark — الافتراضي)
```css
--bg:           oklch(14% 0.005 240);
--bg-elev:      oklch(18% 0.005 240);
--border:       oklch(26% 0.005 240);
--fg:           oklch(96% 0.005 240);
--fg-muted:     oklch(65% 0.01 240);
--accent:       oklch(72% 0.14 162);   /* أخضر هادئ */
--accent-fg:    oklch(14% 0.005 240);

/* حالات */
--status-todo:        oklch(65% 0.01 240);
--status-progress:    oklch(70% 0.14 230);
--status-review:      oklch(75% 0.14 80);
--status-blocked:     oklch(65% 0.18 25);
--status-done:        oklch(70% 0.14 150);

/* أولويات */
--priority-low:       oklch(65% 0.01 240);
--priority-medium:    oklch(75% 0.14 80);
--priority-high:      oklch(70% 0.16 50);
--priority-critical:  oklch(65% 0.18 25);
```

### 4.3 Light mode
نفس المتغيّرات بقيم معكوسة. استخدم `[data-theme="light"]` أو Tailwind `dark:`.

### 4.4 Spacing & Radii
- Radii: `4px` للأزرار والمدخلات، `8px` للبطاقات، `12px` للـ Panels.
- Spacing scale: Tailwind الافتراضي (4px-based).
- كثافة Linear-like: `text-sm` (13-14px) هو الحجم الأساسي في القوائم والجداول.

### 4.5 Motion
- `duration-150` للـ micro-interactions.
- `duration-300` لفتح Side Panel.
- Framer Motion لـ page transitions فقط عند الحاجة (لا تبالغ).

---

## 5. i18n و RTL

### 5.1 مكتبة i18n
استخدم **next-intl** (أو next-i18next).

```
i18n/
├── ar.json       ← الافتراضية
└── en.json
```

### 5.2 قواعد RTL
- **لا تستخدم** `ml-4`, `mr-4`, `pl-2`, `pr-2`, `left-0`, `right-0`.
- **استخدم** `ms-4`, `me-4`, `ps-2`, `pe-2`, `start-0`, `end-0`.
- في `app/layout.tsx`:
  ```tsx
  <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
  ```
- الأيقونات الاتجاهية (chevron, arrow) يجب أن تنعكس في RTL — استخدم `rtl:rotate-180` أو أيقونات مختلفة.
- الأرقام **دائماً** Latin numerals (1, 2, 3)، ليس Arabic-Indic (١، ٢، ٣) — التاريخ والإحصائيات أوضح بهذا الشكل.

---

## 6. Auth & Security

### 6.1 استراتيجية التسجيل
- **Magic Link عبر Email** (أساسي)
- **Google OAuth** (ثانوي)
- **2FA اختياري** (TOTP)
- **Session** عبر cookie HTTPOnly + Secure + SameSite=Lax

### 6.2 الأدوار والصلاحيات
| الدور | الصلاحيات |
|---|---|
| `admin` | كل شيء داخل الـ workspace |
| `project_manager` | CRUD على المشاريع التي هو PM لها + كل المهام |
| `member` | CRUD على المهام المسندة له + قراءة المشاريع التي هو عضو فيها |
| `viewer` | قراءة فقط |

### 6.3 RLS Policies (مثال)
```sql
CREATE POLICY "workspace_members_can_read_tasks"
  ON tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );
```
كرّر هذه السياسة لكل جدول تابع للـ workspace.

### 6.4 Rate limiting
- استخدم **Upstash Rate Limit** على endpoints حساسة: login, signup, magic-link.
- Login: 5 محاولات / 15 دقيقة / IP.

---

## 7. الأداء (Performance)

### الأهداف
- **FCP < 1.5s** (محلياً على 4G متوسط)
- **TTI < 3s**
- **Lighthouse Performance ≥ 90**

### الاستراتيجيات
- **Server Components** لكل الشاشات القابلة.
- **Streaming** بـ `<Suspense>` حول الأجزاء الثقيلة.
- **Lazy load** Gantt و Calendar (dynamic import).
- **Edge runtime** للـ auth routes.
- **ISR أو cached queries** للـ dashboard metrics (revalidate كل دقيقة).
- **React Query** مع `staleTime` مناسب لكل resource.

---

## 8. Accessibility (WCAG AA)

- كل عنصر تفاعلي له `aria-label` واضح بالعربية والإنجليزية.
- Keyboard nav كامل — كل الإجراءات مُنفّذة بدون ماوس.
- تباين نصوص ≥ 4.5:1 (للنص العادي) و ≥ 3:1 (للنص الكبير).
- `focus-visible` مرئي على كل العناصر التفاعلية.
- `prefers-reduced-motion` محترم.
- صور بديلة (`alt`) لكل الأيقونات الدلالية.

---

## 9. Testing

### Unit (Vitest)
- كل Server Action له test: happy path + validation errors + authorization.
- كل Zod schema له test.
- Utility functions (date calculations, progress calculations).

### Integration (Vitest + testcontainers)
- DB queries الرئيسية.

### E2E (Playwright)
- Flow 1: تسجيل دخول → إنشاء مشروع → إضافة مهمة → تغيير حالتها.
- Flow 2: دعوة عضو → تكليفه بمهمة → تحقّق من الإشعار.
- Flow 3: سحب مهمة على Kanban + تحقّق من الـ DB.

---

## 10. Seed Data

ملف `lib/db/seed.ts` ينشئ:
- 1 workspace باسم "ترند"
- 12 مستخدم (بأسماء واقعية من فريق ترند) + 3 فرق (Backend, Frontend, Design)
- 6 مشاريع متنوّعة الحالات
- 40+ مهمة موزّعة مع assignees + dates + dependencies
- 15 تعليق + 20 activity

> استخدم `Trend PM.html` كمرجع لأسماء المشاريع والأعضاء والمهام المستخدمة في النموذج.
