# Trend PM — منصة إدارة المشاريع والمهام

> تطبيق ويب Production-Ready لإدارة المشاريع والمهام لشركة "ترند" التقنية.
> واجهة عربية RTL أولاً مع دعم الإنجليزية.

---

## 📦 محتويات حزمة التسليم

| الملف | الوصف |
|---|---|
| `README.md` | هذا الملف — نظرة عامة + تعليمات التشغيل |
| `SPEC.md` | المواصفات التقنية الكاملة (Database Schema + API + Screens) |
| `ROADMAP.md` | المراحل السبع للتنفيذ مع Acceptance Criteria |
| `Trend PM.html` | النموذج التفاعلي البصري — افتحه في المتصفح كمرجع تصميم |

---

## 🎯 نظرة عامة

### المشكلة
فريق تقني موزّع يعمل على عدة مشاريع بالتوازي. الجهود مشتتة، لا توجد رؤية واضحة لمن يعمل على ماذا، ولا لنسب الإنجاز، ولا للتأخيرات.

### الحل
منصة داخلية لإدارة المشاريع والمهام تجمع: Dashboard + Kanban + Gantt + Workload View + My Tasks + Analytics في نظام واحد.

### الجمهور
الفريق التقني الداخلي في "ترند" (مطوّرين، مديري مشاريع، مصمّمين، QA).

---

## 🛠 الحزمة التقنية المعتمدة (2026)

```
Frontend
├── Next.js 15 (App Router)
├── React 19
├── TypeScript (strict mode)
├── Tailwind CSS v4
├── shadcn/ui + Radix Primitives
├── Framer Motion (animations)
├── TanStack Query (server state)
├── Zustand (client state)
├── React Hook Form + Zod
├── dnd-kit (drag & drop)
├── Tiptap (rich text editor)
└── Recharts + visx (charts & Gantt)

Backend
├── Next.js Server Actions + Route Handlers
├── tRPC (اختياري — للـ type safety الكامل)
├── PostgreSQL (Supabase أو Neon)
├── Drizzle ORM (+ migrations)
├── Better-Auth أو Supabase Auth (Magic Link + Google OAuth + 2FA)
├── Supabase Realtime (notifications + comments live)
└── Supabase Storage أو UploadThing (attachments)

Testing & DevOps
├── Vitest (unit)
├── Playwright (e2e)
├── Vercel (deployment)
└── Turborepo (اختياري لو Monorepo)
```

---

## ⚙️ متطلبات البيئة

| الأداة | الإصدار الأدنى |
|---|---|
| Node.js | 20.x أو أحدث |
| pnpm | 9.x (مفضّل على npm/yarn) |
| PostgreSQL | 15+ (أو حساب Supabase/Neon) |
| Git | أي إصدار حديث |

---

## 🚀 تعليمات التشغيل

### 1) استنساخ المشروع
```bash
git clone <repo-url> trend-pm
cd trend-pm
pnpm install
```

### 2) إعداد متغيرات البيئة
انسخ `.env.example` إلى `.env.local` واملأ القيم:

```bash
cp .env.example .env.local
```

محتوى `.env.example`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trend_pm"
DIRECT_URL="postgresql://user:password@localhost:5432/trend_pm"

# Auth
BETTER_AUTH_SECRET="<generate-with-openssl-rand-base64-32>"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth (اختياري)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Supabase (لو مستخدم)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# Storage
UPLOADTHING_SECRET=""
UPLOADTHING_APP_ID=""

# Email (للـ Magic Link + الإشعارات)
RESEND_API_KEY=""
EMAIL_FROM="noreply@trend.sa"
```

### 3) إعداد قاعدة البيانات
```bash
# إنشاء قاعدة بيانات محلية (لو بدون Supabase)
createdb trend_pm

# تطبيق الـ schema
pnpm db:generate        # توليد migration من Drizzle schema
pnpm db:migrate         # تطبيق الـ migrations

# تحميل بيانات تجريبية
pnpm db:seed
```

### 4) تشغيل الـ dev server
```bash
pnpm dev
```
افتح `http://localhost:3000`.

### 5) أوامر أخرى مفيدة
```bash
pnpm build              # بناء للإنتاج
pnpm start              # تشغيل إنتاج محلياً
pnpm lint               # فحص ESLint
pnpm typecheck          # فحص TypeScript
pnpm test               # تشغيل Vitest
pnpm test:e2e           # تشغيل Playwright
pnpm db:studio          # فتح Drizzle Studio لتصفح الـ DB
```

---

## 📁 هيكل المجلدات المقترح

```
trend-pm/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── verify/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx            # Shell (Sidebar + Topbar)
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx          # قائمة المشاريع
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # تفاصيل المشروع
│   │   │       ├── kanban/page.tsx
│   │   │       ├── list/page.tsx
│   │   │       ├── gantt/page.tsx
│   │   │       └── calendar/page.tsx
│   │   ├── my-tasks/page.tsx
│   │   ├── workload/page.tsx
│   │   ├── team/
│   │   │   ├── page.tsx
│   │   │   └── [memberId]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/                      # Route Handlers (لو لا تستخدم tRPC)
│   ├── layout.tsx                # Root layout (RTL + theme provider)
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn components
│   ├── shell/                    # Sidebar, Topbar, CommandPalette
│   ├── projects/
│   ├── tasks/
│   │   ├── TaskCard.tsx
│   │   ├── TaskSidePanel.tsx
│   │   ├── KanbanBoard.tsx
│   │   └── GanttChart.tsx
│   └── analytics/
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema
│   │   ├── migrations/
│   │   ├── queries.ts
│   │   └── seed.ts
│   ├── auth.ts
│   ├── trpc/
│   ├── validations/              # Zod schemas
│   └── utils.ts
├── hooks/
├── stores/                       # Zustand stores
├── i18n/
│   ├── ar.json
│   └── en.json
├── public/
├── tests/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## 🎨 المرجع التصميمي

افتح `Trend PM.html` في أي متصفح (بنقرة مزدوجة) — هذا نموذج تفاعلي كامل يعرض:

- **Dashboard** مع KPIs + قائمة المشاريع + أكثر الأعضاء ضغطاً + Activity Feed
- **Project Detail** بـ 4 عروض: Kanban / List / Gantt / Calendar
- **My Tasks** و **Workload View** و **Team**
- **Command Palette** (Cmd+K) و **Task Side Panel**
- **Dark/Light mode** و **RTL/LTR** و **مبدّل الخطوط**

المطلوب من الفريق: إعادة بناء هذه الشاشات في Next.js بنفس المنطق والتصميم، مع استبدال البيانات الثابتة ببيانات حقيقية من قاعدة البيانات.

**الـ Tokens المستخدمة** (مذكورة تفصيلياً في `SPEC.md`):
- الخطوط: IBM Plex Sans Arabic (UI) + IBM Plex Mono (أرقام/ID) + IBM Plex Sans (إنجليزي)
- Accent افتراضي: `oklch(72% 0.14 162)` (أخضر هادئ)
- الثيم الافتراضي: Dark
- الاتجاه الافتراضي: RTL

---

## 📏 قواعد الجودة (Non-negotiable)

1. **TypeScript strict** — لا `any`، لا `@ts-ignore`.
2. **Server Components أولاً** — لا تستخدم `"use client"` إلا عند الحاجة للتفاعل.
3. **Zod** للتحقق من كل مدخلات API (بدون استثناء).
4. **RLS على مستوى DB** — لا تعتمد على فحوصات التطبيق وحدها.
5. **Soft delete** — كل جدول يحتوي `deletedAt`.
6. **Indexes** على: `projectId`, `assigneeId`, `dueDate`, `status`.
7. **Error Boundaries** + صفحات `404.tsx` و `error.tsx` مخصّصة.
8. **RTL صحيح** — استخدام `logical properties` (`ms-*`, `me-*`, `ps-*`, `pe-*`) بدلاً من `ml-*`, `mr-*`.
9. **Accessibility (WCAG AA)** — كل عنصر تفاعلي له `aria-label`، keyboard nav يعمل.
10. **Testing** — كل Server Action له unit test، كل flow رئيسي له e2e test.

---

## 🚢 النشر (Deployment)

### Vercel (المفضّل)
```bash
vercel link
vercel env pull .env.local
vercel --prod
```

### متغيرات البيئة في Production
ارفعها عبر Vercel Dashboard → Project → Settings → Environment Variables.

### قاعدة البيانات في Production
- **Neon** للـ Postgres (Serverless, branching للبيئات)
- **Supabase** لو تحتاج Realtime + Auth + Storage في مكان واحد

---

## 📚 المراجع

- راجع `SPEC.md` للـ Database Schema الكامل + API contracts
- راجع `ROADMAP.md` لخطة التنفيذ على ٧ مراحل
- افتح `Trend PM.html` كمرجع بصري دائم

---

## 📞 جهة الاتصال
للأسئلة التقنية أو توضيحات المواصفات، ارجع للمستشار التقني.
