# Trend PM

نظام إدارة مشاريع متقدم — Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Drizzle ORM + Neon Postgres + مصادقة مدمجة (JWT + bcrypt).

---

## المميزات

- **لوحة معلومات** تعرض مؤشرات الأداء والمشاريع النشطة والمهام المتأخرة.
- **إدارة المشاريع** — قائمة المشاريع + صفحة تفصيلية لكل مشروع مع:
  - `Overview` — ملخص المشروع والأعضاء والحالة.
  - `Board` — لوحة Kanban بـ Drag & Drop (`@dnd-kit/core`) مع زر "إضافة مهمة" لكل عمود.
  - `List` — جدول مع قائمة منسدلة مباشرة لتغيير الحالة.
  - `Gantt` — عرض للقراءة فقط لمُخطَّط زمني.
  - `Calendar` — عرض تقويمي للمهام حسب تاريخ الاستحقاق.
- **Task Side Panel** — عرض/تعديل/حذف المهمة عبر Server Actions.
- **My Tasks** — مهام المستخدم الحالي (متأخرة / اليوم / هذا الأسبوع / لاحقاً / مكتملة).
- **Workload** — خريطة حرارية لتوزيع الحمل على 14 يوم.
- **Analytics** — توزيع الحالات والأولويات وسرعة الإنجاز.
- **إدارة الأعضاء والفرق** — صفحات إدارية لدعوة الأعضاء، تغيير الأدوار، وإنشاء فرق.
- **المصادقة المدمجة** — تسجيل دخول بالبريد + كلمة مرور (bcrypt)، جلسات JWT في HTTP-only cookies، حماية كل الصفحات عبر middleware.
- **ثنائي اللغة RTL/LTR** — عربي (افتراضي) + إنجليزي.
- **Dark / Light themes** + اختيار لون رئيسي (Accent).

---

## المتطلبات

- Node.js 20+
- pnpm (أو npm/yarn)
- حساب [Neon](https://neon.tech) أو أي PostgreSQL 14+

---

## البدء السريع (لأول مرة)

```bash
git clone https://github.com/sabq4org/TRendPM.git
cd TRendPM
pnpm install
cp .env.example .env.local   # ثم عبّئ القيم (انظر أدناه)

# تهيئة قاعدة البيانات
pnpm db:migrate              # تطبيق الهجرات (ينشئ كل الجداول)
pnpm db:bootstrap            # إنشاء مستخدم Admin وWorkspace فارغ

pnpm dev                     # http://localhost:3000
```

### متغيرات `.env.local` المطلوبة

```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
AUTH_SECRET="<شغّل: openssl rand -hex 32>"

# تُستخدم مرّة واحدة فقط عند تشغيل pnpm db:bootstrap
ADMIN_EMAIL="you@example.com"
ADMIN_NAME="اسمك"
ADMIN_PASSWORD=""             # اتركه فارغاً لتوليد كلمة مرور عشوائية
WORKSPACE_NAME="شركتي"
WORKSPACE_SLUG="my-company"
```

---

## أوامر قاعدة البيانات

| الأمر              | الوصف                                                        |
| ------------------ | ------------------------------------------------------------ |
| `pnpm db:migrate`  | تطبيق جميع الهجرات الموجودة في `drizzle/`                    |
| `pnpm db:bootstrap`| إنشاء Admin + Workspace من متغيرات البيئة (مرة واحدة)        |
| `pnpm db:clean`    | **مسح جميع البيانات** (مع الإبقاء على الـ schema)            |
| `pnpm db:reset`    | حذف schema.public بالكامل (⚠️ تدميري — يستخدم قبل `db:migrate`) |
| `pnpm db:generate` | توليد ملف SQL جديد من تغييرات schema                         |
| `pnpm db:studio`   | فتح Drizzle Studio لتصفح القاعدة                             |

### إعادة التهيئة من الصفر

```bash
pnpm db:clean        # امسح كل البيانات (يبقي الجداول)
pnpm db:bootstrap    # أنشئ Admin + Workspace جديد
```

---

## تسجيل الدخول لأول مرة

بعد تشغيل `pnpm db:bootstrap`، سيطبع السكربت بيانات الدخول:

```
─── Sign-in credentials ───
Email:    ali@alhazmi.org
Password: xxxxxxxxxxxx   ← مولّدة عشوائياً، احفظها الآن!
───────────────────────────
```

- افتح `http://localhost:3000` → ستُحوَّل تلقائياً إلى `/login`.
- أدخل البيانات → ستصل إلى `/dashboard` الفارغ.
- من `الإعدادات ← الأعضاء` يمكنك دعوة بقية أعضاء الفريق.
- من `الإعدادات ← الفرق` يمكنك إنشاء فرق وإضافة أعضاء.
- من `الإعدادات ← تغيير كلمة المرور` يمكنك تغيير كلمة المرور.

---

## المعمارية

```
src/
├── app/
│   ├── (app)/                  # صفحات محميَّة (تتطلب تسجيل دخول)
│   │   ├── dashboard/
│   │   ├── projects/[id]/
│   │   ├── settings/members/   # إدارة الأعضاء (admin فقط)
│   │   └── settings/teams/     # إدارة الفرق (admin فقط)
│   ├── (auth)/login/            # صفحة تسجيل الدخول
│   ├── actions/                 # Server Actions (tasks, auth, members, teams)
│   └── api/auth/signout/        # Logout endpoint
├── components/
│   ├── shell/                   # layout: AppShell, Sidebar, Topbar
│   ├── modal.tsx
│   ├── kanban.tsx
│   ├── task-panel.tsx
│   ├── tasks/new-task-button.tsx
│   ├── projects/new-project-button.tsx
│   └── projects/project-row-actions.tsx
├── lib/
│   ├── auth/                    # JWT, bcrypt, session helpers
│   ├── auth.ts                  # getCurrentUser / requireUser / requireWorkspaceAdmin
│   └── db/                      # Drizzle schema, migrations, queries, bootstrap
└── middleware.ts                # يحمي كل المسارات عدا /login و/api/auth/*
```

### المصادقة

- **Hashing:** `bcryptjs` (12 rounds).
- **Session:** JWT موقَّع بـ `AUTH_SECRET` (HS256) + صف في جدول `sessions` لدعم الإلغاء.
- **Cookie:** `trend_session`, HTTP-only, SameSite=Lax, 30 يوم.
- **Middleware:** يتحقق من الكوكي على كل طلب ويحوّل غير المسجَّلين إلى `/login`.

### الأدوار (Workspace roles)

- `admin` — كل شيء + إدارة الأعضاء والفرق.
- `project_manager` — إنشاء مشاريع وإدارة مهامها.
- `member` — عرض وإنشاء مهام في المشاريع التي هو عضو فيها.
- `viewer` — قراءة فقط.

---

## النشر على Vercel

1. ادفع الريبو إلى GitHub.
2. استورد المشروع في Vercel (Framework: Next.js، Root Directory: `./`).
3. في Environment Variables أضف:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL` (رابط النشر)
4. بعد أول نشر ناجح، على جهازك المحلي شغّل `pnpm db:migrate` ثم `pnpm db:bootstrap` مع نفس `DATABASE_URL` لتهيئة البيانات.
5. ادخل إلى الموقع وسجّل الدخول.

---

## الاختبار المحلي

```bash
pnpm dev         # تطوير على http://localhost:3000
pnpm build       # بناء إنتاجي
pnpm lint        # فحص ESLint
```

---

## المساهمون

- © 2026 — Trend (سبق) — جميع الحقوق محفوظة.
