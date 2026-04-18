# Trend PM

نظام إدارة مشاريع متقدم — Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + Drizzle ORM + Neon Postgres + Supabase Auth.

تم بناؤه بتحويل البروتوتايب الموجود في الجذر (`Trend PM.html` + `data.js` + `styles.css`) إلى تطبيق إنتاجي كامل يعتمد على قاعدة بيانات حقيقية و App Router.

---

## المميزات

- **لوحة معلومات** تعرض مؤشرات الأداء (المشاريع النشطة، المهام المفتوحة، المهام المتأخرة، سرعة الإنجاز) مع جداول وتخطيطات للنشاط الأخير.
- **إدارة المشاريع** — قائمة المشاريع + صفحة تفصيلية لكل مشروع مع تبويبات:
  - `Overview` — ملخص المشروع والأعضاء والحالة.
  - `Board` — لوحة Kanban بـ Drag & Drop (`@dnd-kit/core`).
  - `List` — جدول مع قائمة منسدلة مباشرة لتغيير الحالة.
  - `Gantt` — عرض للقراءة فقط لمُخطَّط زمني.
  - `Calendar` — عرض تقويمي للمهام حسب تاريخ الاستحقاق.
- **Task Side Panel** — لوحة جانبية ديناميكية لعرض/تعديل المهمة (عنوان، حالة، أولوية، تاريخ استحقاق، تقدم، تعليقات) عبر Server Actions.
- **My Tasks** — مهام المستخدم الحالي مجمَّعة (متأخرة / اليوم / هذا الأسبوع / لاحقاً / مكتملة).
- **Workload** — خريطة حرارية لتوزيع الحمل على 14 يوم.
- **Analytics** — توزيع الحالات والأولويات، سرعة الإنجاز، حمل الأعضاء.
- **Settings** — ضبط السمة، اللغة، واللون الرئيسي.
- **ثنائي اللغة RTL/LTR** — عربي (افتراضي) + إنجليزي عبر كوكيز + Server Actions.
- **Dark / Light themes** + اختيار لون رئيسي (Accent).
- **مصادقة** — Supabase Auth مُهيَّأ مع وضع تطوير fallback.

---

## المتطلبات

- Node.js 20+
- pnpm (مُستخدَم في التطوير) أو npm
- حساب [Neon](https://neon.tech) (قاعدة بيانات Postgres)
- (اختياري) مشروع Supabase Auth

---

## البدء السريع

```bash
cd trend-pm
pnpm install
cp .env.example .env.local   # ثم عبّئ القيم
pnpm db:reset                # (تحذير: يمسح schema.public)
pnpm db:migrate              # تطبيق الهجرات
pnpm db:seed                 # تعبئة بيانات البروتوتايب
pnpm dev
```

افتح <http://localhost:3000> — سيتم توجيهك إلى `/dashboard`.

في وضع التطوير (عندما لا تكون متغيرات Supabase مُعبّأة) يدخل التطبيق تلقائياً بمستخدم `omar@trend.sa` من بيانات الـ seed.

---

## متغيرات البيئة (`.env.local`)

```env
# Neon Postgres (مطلوب)
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Supabase Auth (اختياري — اتركها فارغة لاستخدام وضع التطوير)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## أوامر قاعدة البيانات

| الأمر | الوصف |
|---|---|
| `pnpm db:generate` | توليد ملفات SQL migrations من schema.ts |
| `pnpm db:migrate` | تطبيق الهجرات على Neon (سكربت مخصص) |
| `pnpm db:push` | دفع الـ schema مباشرة (يتطلّب TTY) |
| `pnpm db:studio` | فتح Drizzle Studio |
| `pnpm db:seed` | تعبئة البيانات الأولية من البروتوتايب |
| `pnpm db:reset` | إسقاط `public schema` وإعادة إنشائه |

---

## هيكل المشروع

```
trend-pm/
├── drizzle/                      # SQL migrations
├── drizzle.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx            # root layout (RTL + theme)
│   │   ├── page.tsx              # يعيد التوجيه لـ /dashboard
│   │   ├── globals.css           # Tailwind + tokens
│   │   ├── tokens.css            # design tokens من styles.css
│   │   ├── actions/              # Server Actions (tasks, preferences)
│   │   ├── api/tasks/[id]/       # Route Handler لـ Task Panel
│   │   └── (app)/                # كل الصفحات المصادَق عليها
│   │       ├── layout.tsx        # Topbar + Sidebar
│   │       ├── dashboard/
│   │       ├── projects/
│   │       │   └── [id]/         # Overview/Board/List/Gantt/Calendar
│   │       ├── my-tasks/
│   │       ├── workload/
│   │       ├── analytics/
│   │       └── settings/
│   ├── components/
│   │   ├── icon.tsx
│   │   ├── primitives.tsx        # Avatar, StatusDot, PriorityFlag, Progress...
│   │   ├── charts.tsx            # Sparkline, VelocityChart, BurnDown
│   │   ├── kanban.tsx            # Drag & Drop
│   │   ├── task-card.tsx
│   │   ├── task-list-row.tsx
│   │   ├── task-panel.tsx
│   │   ├── tab-link.tsx
│   │   ├── accent-picker.tsx
│   │   └── shell/                # Sidebar + Topbar
│   └── lib/
│       ├── auth.ts               # Supabase + dev fallback
│       ├── db/
│       │   ├── schema.ts         # 13 جدول حسب SPEC.md
│       │   ├── queries.ts        # استعلامات القراءة
│       │   ├── index.ts          # Drizzle client
│       │   ├── migrate.ts        # سكربت مخصص للهجرة
│       │   ├── reset.ts
│       │   └── seed.ts
│       ├── i18n/                 # ar.json, en.json, helpers
│       ├── preferences.ts        # قراءة الكوكيز (locale/theme/accent)
│       └── utils.ts              # التواريخ + helpers
└── package.json
```

---

## الـ Stack التقني

- **Next.js 15 / React 19** — App Router + Server Components + Server Actions
- **TypeScript (strict)**
- **Tailwind CSS v4** + tokens من البروتوتايب الأصلي
- **Drizzle ORM** + `@neondatabase/serverless`
- **Supabase Auth** (scaffold)
- **Zod** — validation على الـ Server Actions
- **@dnd-kit/core** — Kanban drag & drop
- **lucide-react** — icons (مع fallback SVG محلي)

---

## ملاحظات معمارية

- **Mutations** دائماً عبر Server Actions مع `revalidatePath`.
- **Reads الديناميكية** للـ Task Panel تمر عبر Route Handler `/api/tasks/[id]`.
- **Auth** قابل للتفعيل/التعطيل عبر متغيرات البيئة (لا يكسر التطبيق إذا غابت).
- **i18n + theming** بدون مكتبات ثقيلة — كوكيز + Server Actions فقط.
- **RTL** عبر `dir` في `<html>` + CSS logical properties (`margin-inline-*`, `padding-inline-*`).

---

## المشروع الأصلي (البروتوتايب)

- `Trend PM.html` + `data.js` + `styles.css` موجودة في جذر الـ workspace كمرجع.
- كل البيانات الـ seed (9 مستخدمين، 6 مشاريع، 35 مهمة، نشاط، تعليقات) مُنقولة من `data.js`.
