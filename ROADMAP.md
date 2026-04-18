# Trend PM — خطة التنفيذ (Roadmap)

## قواعد الخطة
- المراحل **متسلسلة** — لا تبدأ المرحلة التالية قبل إنهاء السابقة بكل Acceptance Criteria.
- كل مرحلة تُسلَّم **قابلة للتشغيل** (deployable) — حتى لو كانت وظيفتها محدودة.
- في نهاية كل مرحلة: **Demo** + **merge إلى main** + **Tag (v0.X)**.
- التقديرات بافتراض مطوّر واحد full-time. عدّلها حسب حجم الفريق.

---

## المرحلة 1 — Setup + Auth + Workspaces (أسبوع)

### المخرجات
- مشروع Next.js 15 شغّال مع TypeScript strict.
- Drizzle schema للجداول: `users`, `workspaces`, `workspace_members`.
- Better-Auth (أو Supabase Auth) مع Magic Link + Google OAuth.
- صفحات: `/login`, `/signup`, `/verify`, `/onboarding`.
- App Shell أساسي: Sidebar + Topbar (فارغ).
- Dark/Light mode + RTL/LTR من البداية.
- Seed: 1 workspace + 3 مستخدمين.

### Acceptance Criteria
- [ ] يمكنني التسجيل بإيميل + الحصول على Magic Link + الدخول.
- [ ] يمكنني التسجيل بـ Google OAuth.
- [ ] بعد أول تسجيل دخول، أرى onboarding لإنشاء workspace.
- [ ] يمكنني تبديل العربية/الإنجليزية، والـ dir يتغيّر فعلياً.
- [ ] يمكنني تبديل Dark/Light، ويتم حفظ الخيار.
- [ ] اختبار Playwright واحد: signup → login → dashboard فارغ.

### المخاطر
- تعقيد Better-Auth مع Magic Link — احجز يوم كامل للـ email templates.

---

## المرحلة 2 — CRUD Projects + Tasks + List View (أسبوع)

### المخرجات
- Drizzle schema كامل لـ `projects`, `tasks`, `project_members`, `task_assignees`.
- Server Actions: `createProject`, `updateProject`, `archiveProject`, `createTask`, `updateTask`, `deleteTask`.
- Zod schemas لكل inputs.
- صفحة `/projects` (قائمة) + `/projects/[id]` (tabs).
- **List View** كامل بـ TanStack Table + فلاتر + فرز.
- Task Side Panel يفتح من أي مكان + إنشاء/تعديل/حذف.
- Activity log أساسي (من داخل Server Actions).

### Acceptance Criteria
- [ ] أنشئ مشروعاً جديداً بكل الحقول المطلوبة في الـ PRD.
- [ ] أضف 5 مهام، عدّلها، احذف واحدة — كلها تظهر في List View.
- [ ] الفلاتر تعمل: status + priority + assignee.
- [ ] Activity log يعرض كل الإجراءات بتفاصيلها.
- [ ] Optimistic updates لتغيير status.
- [ ] 5+ unit tests للـ Server Actions.

---

## المرحلة 3 — Kanban + Progress + Delays (أسبوع)

### المخرجات
- **Kanban Board** بـ dnd-kit (5 أعمدة: To Do / In Progress / In Review / Blocked / Done).
- حفظ `position` عند السحب + optimistic update.
- حساب تلقائي لنسبة إنجاز المشروع من المهام.
- حساب `days_overdue` للمهام.
- Checklist subtasks داخل الـ Task Side Panel.
- Multi-assignees.

### Acceptance Criteria
- [ ] اسحب مهمة بين أعمدة — الحالة تُحدَّث في DB.
- [ ] الترتيب داخل العمود محفوظ ويعود بعد refresh.
- [ ] نسبة إنجاز المشروع محسوبة صحيحاً.
- [ ] المهام المتأخرة معلّمة بصرياً في كل العروض.
- [ ] E2E test: drag task from To Do to In Progress.

---

## المرحلة 4 — Gantt + Calendar + Workload (أسبوعان)

### المخرجات
- **Gantt Chart** بـ visx: bars على timeline + dependency arrows.
- **Task Dependencies**: UI لإضافة/حذف blocks/blocked by.
- **Calendar View**: شهري + أسبوعي.
- **Workload View**: heatmap لأعضاء الفريق × أيام الأسبوع، ملوّن بـ hours.
- **My Tasks**: تجميع حسب Today/This Week/Later/Overdue.

### Acceptance Criteria
- [ ] Gantt يعرض كل المهام صحيحاً على timeline.
- [ ] أستطيع سحب bar لتغيير تاريخ البداية/النهاية.
- [ ] Dependencies تظهر كسهم بين bars.
- [ ] Workload يحسب hours صحيحاً ويلوّن حسب الضغط.
- [ ] My Tasks يعرض مهام عبر كل المشاريع مرتبة بالاستحقاق.

### المخاطر
- Gantt معقّد — احسب 3 أيام للـ interactions (drag + resize + dependency drawing).

---

## المرحلة 5 — Realtime + Notifications + Comments (أسبوع)

### المخرجات
- **Supabase Realtime** (أو Pusher) لـ: task updates + comments + notifications.
- **Comments** بـ Tiptap داخل Task Side Panel.
- **@Mentions** مع autocomplete + تخزين mentions array.
- **Notifications**:
  - In-app (bell icon + dropdown).
  - Email (via Resend) للأحداث المهمة.
  - Slack/Telegram webhook (اختياري).
- **Attachments** عبر UploadThing أو Supabase Storage.

### Acceptance Criteria
- [ ] افتح الصفحة في tab ثانٍ — تغييرات tab الأول تظهر فوراً.
- [ ] اكتب @ في تعليق — autocomplete يعرض الأعضاء.
- [ ] المذكور يستلم إشعار in-app + email.
- [ ] ارفع ملفاً للمهمة — يُحفظ ويُعرض.

---

## المرحلة 6 — Dashboard + Analytics + Exports (أسبوع)

### المخرجات
- **Dashboard** كامل:
  - KPIs cards.
  - Top 5 overdue tasks.
  - Overloaded members.
  - Velocity chart (Recharts).
  - Activity feed عبر كل المشاريع.
- **تقارير** قابلة للتصدير:
  - PDF: Project summary + tasks breakdown (بـ react-pdf).
  - Excel: كل مهام المشروع مع assignees (بـ SheetJS).
- صفحة Team + Member profile مع metrics.

### Acceptance Criteria
- [ ] Dashboard يُحمَّل في < 2 ثانية.
- [ ] كل KPIs محسوبة صحيحاً (تحقّق يدوي مقابل الـ DB).
- [ ] تصدير PDF لمشروع يحتوي كل المعلومات المطلوبة.
- [ ] تصدير Excel يفتح في Office/Numbers.

---

## المرحلة 7 — Polish (أسبوعان)

### المخرجات
- **i18n** كامل: كل strings في ar.json/en.json، لا hardcoded text.
- **RTL صحيح** في كل الشاشات (مراجعة بصرية شاملة).
- **Dark/Light** mode مصقول في كل الشاشات.
- **Accessibility audit**:
  - axe-core بدون errors حرجة.
  - Keyboard nav كامل.
  - Screen reader tested (VoiceOver أو NVDA).
- **Performance audit**:
  - Lighthouse ≥ 90 على Dashboard و Project Detail.
  - حجم bundle محسّن.
- **Error pages**: 404.tsx و error.tsx مخصّصة وجميلة.
- **Empty states** لكل الشاشات.
- **Skeleton loaders** بدل spinners.
- **Offline detection** مع رسالة واضحة.
- **Tests coverage**:
  - Unit ≥ 70%.
  - E2E flows رئيسية كلها مغطّاة.
- **Command Palette** (Cmd+K) شغّال مع fuzzy search.
- **Keyboard shortcuts** موثّقة في `?` modal.

### Acceptance Criteria
- [ ] جلسة مستخدم حقيقية لمدة 30 دقيقة بدون أي bug أو glitch.
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95.
- [ ] كل النصوص مترجمة — لا يوجد hardcoded.
- [ ] تعمل كاملاً على الموبايل (320px+).
- [ ] تجاوز Security audit أساسي (OWASP top 10 checklist).

---

## بعد المرحلة 7 (Post-launch)

- AI features: تلخيص الـ project, smart task suggestions.
- Mobile app (React Native مع Expo).
- Time tracking متقدّم (Pomodoro + reports).
- Custom workflows قابلة للتخصيص لكل workspace.
- Integrations: GitHub, GitLab, Figma, Slack bi-directional.

---

## مصفوفة المخاطر

| الخطر | الاحتمال | الأثر | الحل |
|---|---|---|---|
| Gantt drag/drop معقّد | متوسط | متوسط | استخدم visx example كبداية + اعزل الميزة |
| RTL bugs متأخرة | عالي | عالي | ابدأ بـ RTL من المرحلة 1، ولا تؤجّل |
| RLS policies ثغرات | متوسط | عالي | مراجعة أمنية قبل المرحلة 5 |
| Realtime scaling | منخفض | متوسط | ابدأ بـ Supabase، راقب الاستهلاك |
| i18n strings نُسيت | عالي | منخفض | lint rule يمنع literal strings في JSX |

---

## Definition of Done (لأي ميزة)
- [ ] كود TypeScript strict، لا `any`.
- [ ] Zod validation على كل input.
- [ ] RLS policy مكتوبة ومختبرة.
- [ ] Unit test للـ Server Action.
- [ ] E2E test للـ happy path.
- [ ] i18n keys في ar.json و en.json.
- [ ] RTL mirroring صحيح.
- [ ] Dark/Light تم اختباره.
- [ ] Accessibility: keyboard nav + aria-labels.
- [ ] Code review + merge إلى main.
