import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import {
  getProjects,
  getTasks,
  getRecentActivity,
  getWorkspaceMembers,
} from "@/lib/db/queries";
import { Avatar, AvatarStack, Chip, PriorityDot, Progress, StatusDot } from "@/components/primitives";
import { Icon } from "@/components/icon";
import { Sparkline, VelocityChart, BurnDown } from "@/components/charts";
import { TODAY, daysBetween, formatShortDate, isLate, lateDays, toIsoDate } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/lib/db/schema";
import { formatDistanceToNowStrict } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const dateLocale = locale === "ar" ? arLocale : enUS;

  const [projects, allTasks, activity, members] = await Promise.all([
    getProjects(user.workspaceId),
    getTasks(user.workspaceId),
    getRecentActivity(user.workspaceId, 8),
    getWorkspaceMembers(user.workspaceId),
  ]);

  const totalTasks = allTasks.length;
  const openTasks = allTasks.filter((t) => t.status !== "done").length;
  const lateTasks = allTasks.filter((t) =>
    isLate({ status: t.status, dueDate: t.dueDate })
  );
  const activeProjects = projects.filter((p) => p.status === "active").length;

  const byProjectTasks = new Map<string, typeof allTasks>();
  for (const t of allTasks) {
    const arr = byProjectTasks.get(t.projectId) ?? [];
    arr.push(t);
    byProjectTasks.set(t.projectId, arr);
  }

  const memberById = new Map(members.map((m) => [m.id, m]));

  // Overloaded members
  const loadMap = new Map<string, number>();
  for (const t of allTasks) {
    if (t.status === "done") continue;
    for (const a of t.assignees) {
      loadMap.set(a.id, (loadMap.get(a.id) ?? 0) + 1);
    }
  }
  const overloaded = Array.from(loadMap.entries())
    .map(([uid, n], i) => {
      const u = memberById.get(uid);
      return u ? { u, n, hrs: n * 6 + (i % 7) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const maxLoad = Math.max(...overloaded.map((x) => x.n), 1);

  const upcoming = allTasks
    .filter((t) => {
      if (t.status === "done" || !t.dueDate) return false;
      const d = daysBetween(toIsoDate(TODAY), t.dueDate);
      return d >= 0 && d <= 10;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 6);

  const getProjectProgress = (projectId: string) => {
    const ts = byProjectTasks.get(projectId) ?? [];
    if (!ts.length) return 0;
    const avg = ts.reduce((s, t) => s + t.progress, 0) / ts.length;
    return Math.round(avg);
  };

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{dict.dashboard}</h1>
        <span className="sub mono">· {TODAY.toISOString().slice(0, 10)}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <button className="btn sm" type="button">
            <Icon name="calendar" size={12} /> {locale === "ar" ? "آخر 30 يوم" : "Last 30 days"}
          </button>
          <button className="btn sm" type="button">
            <Icon name="filter" size={12} /> {dict.filter}
          </button>
          <button className="btn primary sm" type="button">
            <Icon name="plus" size={12} /> {dict.newTask}
          </button>
        </div>
      </div>

      <div className="dash">
        <div className="col-3 kpi">
          <span className="kpi-label">{dict.projectsCount}</span>
          <span className="kpi-value num">
            {activeProjects}
            <span style={{ color: "var(--text-4)", fontSize: 14 }}>/{projects.length}</span>
          </span>
          <span className="kpi-sub">
            <span className="trend-up">▲ 2</span>
            <span>{locale === "ar" ? "نشطة هذا الشهر" : "active this month"}</span>
            <span style={{ marginInlineStart: "auto" }}>
              <Sparkline data={[4, 4, 5, 5, 4, 5, 6, 6]} />
            </span>
          </span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{dict.openTasks}</span>
          <span className="kpi-value num">{openTasks}</span>
          <span className="kpi-sub">
            <span className="trend-down">▲ {Math.max(1, totalTasks - openTasks)}</span>
            <span>{locale === "ar" ? "منذ الأسبوع الماضي" : "since last week"}</span>
            <span style={{ marginInlineStart: "auto" }}>
              <Sparkline data={[30, 32, 28, 34, 36, 33, 35, 37]} color="var(--s-review)" />
            </span>
          </span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{dict.overdue}</span>
          <span className="kpi-value num" style={{ color: "var(--s-late)" }}>
            {lateTasks.length}
          </span>
          <span className="kpi-sub">
            <span style={{ color: "var(--s-late)" }}>▲ 3</span>
            <span>{locale === "ar" ? "تحتاج تدخّلاً" : "need attention"}</span>
            <span style={{ marginInlineStart: "auto" }}>
              <Sparkline data={[2, 2, 3, 4, 3, 4, 5, 6]} color="var(--s-late)" />
            </span>
          </span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{dict.velocity}</span>
          <span className="kpi-value num">31</span>
          <span className="kpi-sub">
            <span className="trend-up">▲ 6.9%</span>
            <span>{locale === "ar" ? "مقارنةً بالسابق" : "vs prior"}</span>
            <span style={{ marginInlineStart: "auto" }}>
              <Sparkline data={[18, 22, 19, 24, 27, 23, 29, 31]} />
            </span>
          </span>
        </div>

        <div className="col-8 panel">
          <div className="panel-head">
            <h3>{dict.projects}</h3>
            <Chip>{projects.length}</Chip>
            <span className="tail">{locale === "ar" ? "مُرتّب حسب الأولوية" : "sorted by priority"}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>{locale === "ar" ? "المشروع" : "Project"}</th>
                <th>{dict.pm}</th>
                <th>{locale === "ar" ? "الفريق" : "Team"}</th>
                <th className="num">{dict.completion}</th>
                <th className="num">{locale === "ar" ? "مفتوحة" : "Open"}</th>
                <th className="num">{dict.late}</th>
                <th>{dict.due}</th>
                <th style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const ts = byProjectTasks.get(p.id) ?? [];
                const open = ts.filter((t) => t.status !== "done").length;
                const late = ts.filter((t) =>
                  isLate({ status: t.status, dueDate: t.dueDate })
                ).length;
                const assignees = Array.from(
                  new Map(ts.flatMap((t) => t.assignees).map((a) => [a.id, a])).values()
                );
                const pm = p.projectManagerId ? memberById.get(p.projectManagerId) : null;
                const progress = getProjectProgress(p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          display: "inline-block",
                          background: p.color ?? "var(--text-3)",
                          borderRadius: 2,
                        }}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/projects/${p.id}`}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <span className="mono" style={{ color: "var(--text-4)", fontSize: 10 }}>
                          {p.key}
                        </span>
                        <span className="truncate">
                          {locale === "ar" ? p.name : p.nameEn ?? p.name}
                        </span>
                        <PriorityDot p={p.priority as TaskPriority} />
                      </Link>
                    </td>
                    <td>{pm ? <Avatar user={pm} /> : "—"}</td>
                    <td>
                      <AvatarStack users={assignees} max={4} />
                    </td>
                    <td className="num" style={{ width: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Progress value={progress} />
                        <span style={{ minWidth: 32, textAlign: "end" }}>{progress}%</span>
                      </div>
                    </td>
                    <td className="num">{open}</td>
                    <td
                      className="num"
                      style={{ color: late > 0 ? "var(--s-late)" : "var(--text-3)" }}
                    >
                      {late || "—"}
                    </td>
                    <td className="mono" style={{ color: "var(--text-3)" }}>
                      {formatShortDate(p.plannedEndDate)}
                    </td>
                    <td>
                      <Icon
                        name="chevron"
                        size={12}
                        style={{
                          color: "var(--text-4)",
                          transform: locale === "ar" ? "rotate(180deg)" : "none",
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          className="col-4"
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="panel">
            <div className="panel-head">
              <h3>{dict.topLate}</h3>
              <Chip
                style={{
                  color: "var(--s-late)",
                  background: "color-mix(in oklch, var(--s-late) 15%, transparent)",
                  borderColor: "transparent",
                }}
              >
                {lateTasks.length}
              </Chip>
            </div>
            <div>
              {lateTasks
                .sort((a, b) => lateDays(b) - lateDays(a))
                .slice(0, 5)
                .map((t) => {
                  const p = projects.find((x) => x.id === t.projectId);
                  return (
                    <Link
                      key={t.id}
                      href={`/projects/${t.projectId}?task=${t.id}`}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <StatusDot s={t.status as TaskStatus} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: "var(--fs-sm)" }}>
                          {t.title}
                        </div>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}
                        >
                          <span
                            className="mono"
                            style={{ fontSize: 10, color: "var(--text-4)" }}
                          >
                            {t.code}
                          </span>
                          {p && (
                            <>
                              <span
                                style={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: 2,
                                  background: p.color ?? "var(--text-3)",
                                  display: "inline-block",
                                }}
                              />
                              <span
                                className="truncate"
                                style={{
                                  fontSize: "var(--fs-xxs)",
                                  color: "var(--text-3)",
                                }}
                              >
                                {locale === "ar" ? p.name : p.nameEn ?? p.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: "var(--fs-xs)",
                          color: "var(--s-late)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        -{lateDays(t)}
                        {dict.d}
                      </div>
                      {t.assignees[0] && <Avatar user={t.assignees[0]} />}
                    </Link>
                  );
                })}
              {lateTasks.length === 0 && (
                <div style={{ padding: 16, color: "var(--text-3)", fontSize: "var(--fs-sm)" }}>
                  {dict.empty}
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>{dict.overloaded}</h3>
              <span className="tail">{locale === "ar" ? "هذا الأسبوع" : "this week"}</span>
            </div>
            <div style={{ padding: "4px 12px 10px" }}>
              {overloaded.map(({ u, n, hrs }) => {
                const pct = (n / maxLoad) * 100;
                const over = hrs > 40;
                return (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <Avatar user={u} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="truncate" style={{ fontSize: "var(--fs-sm)" }}>
                          {locale === "ar" ? u.name : u.nameEn ?? u.name}
                        </span>
                        <span
                          className="mono"
                          style={{
                            marginInlineStart: "auto",
                            fontSize: "var(--fs-xs)",
                            color: over ? "var(--s-blocked)" : "var(--text-3)",
                          }}
                        >
                          {hrs}
                          {dict.h}/40{dict.h}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          height: 4,
                          background: "var(--hover)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: over ? "var(--s-blocked)" : "var(--accent)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-8 panel">
          <div className="panel-head">
            <h3>{dict.velocityTrend}</h3>
            <span className="tail mono">31 tasks · 5.8% ▲</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <VelocityChart />
          </div>
        </div>

        <div className="col-4 panel">
          <div className="panel-head">
            <h3>{dict.recentActivity}</h3>
          </div>
          <div style={{ padding: "6px 12px 10px" }}>
            {activity.map((a) => {
              const when = formatDistanceToNowStrict(a.createdAt, {
                locale: dateLocale,
                addSuffix: true,
              });
              const actor = a.actorId
                ? {
                    id: a.actorId,
                    name: a.actorName || "",
                    nameEn: a.actorNameEn,
                    initials: a.actorInitials,
                    hue: a.actorHue,
                  }
                : null;
              const firstName = locale === "ar"
                ? (a.actorName || "").split(" ")[0]
                : (a.actorNameEn || a.actorName || "").split(" ")[0];
              const verbLabel = verbToLabel(a.verb, locale);
              return (
                <div key={a.id} className="act">
                  {actor && <Avatar user={actor} />}
                  <div className="act-body">
                    <span className="who">{firstName}</span> {verbLabel}{" "}
                    {a.taskCode && (
                      <span style={{ color: "var(--text)" }}>
                        {a.taskCode}
                        {a.taskTitle ? ` — ${a.taskTitle.slice(0, 30)}` : ""}
                      </span>
                    )}
                    <span className="when">{when}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-6 panel">
          <div className="panel-head">
            <h3>
              {dict.burn} — {locale === "ar" ? "بوابة الدفع" : "Payment Gateway"}
            </h3>
            <span className="tail mono">PAY · 62%</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <BurnDown />
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 8,
                fontSize: "var(--fs-xs)",
                color: "var(--text-3)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 12,
                    height: 1,
                    borderTop: "1px dashed var(--text-4)",
                  }}
                />
                {locale === "ar" ? "المثالي" : "Ideal"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 2, background: "var(--accent)" }} />
                {locale === "ar" ? "الفعلي" : "Actual"}
              </span>
            </div>
          </div>
        </div>

        <div className="col-6 panel">
          <div className="panel-head">
            <h3>{dict.upcoming}</h3>
            <span className="tail">
              {locale === "ar" ? "الأيام السبعة القادمة" : "next 7 days"}
            </span>
          </div>
          <div>
            {upcoming.map((t) => {
              const p = projects.find((x) => x.id === t.projectId);
              const days = daysBetween(toIsoDate(TODAY), t.dueDate!);
              return (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}?task=${t.id}`}
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: "var(--text-4)", width: 56 }}
                  >
                    {t.code}
                  </span>
                  <StatusDot s={t.status as TaskStatus} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: "var(--fs-sm)" }}>
                      {t.title}
                    </div>
                  </div>
                  {p && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 2,
                        background: p.color ?? "var(--text-3)",
                      }}
                    />
                  )}
                  <AvatarStack users={t.assignees} max={2} />
                  <span
                    className="mono"
                    style={{
                      fontSize: "var(--fs-xs)",
                      color: days <= 2 ? "var(--s-late)" : "var(--text-3)",
                      width: 60,
                      textAlign: "end",
                    }}
                  >
                    {days === 0
                      ? dict.today
                      : days === 1
                        ? dict.tomorrow
                        : `+${days}${dict.d}`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function verbToLabel(verb: string, locale: "ar" | "en"): string {
  const map: Record<string, { ar: string; en: string }> = {
    closed: { ar: "أغلق", en: "closed" },
    commented: { ar: "علّق على", en: "commented on" },
    status_changed: { ar: "غيّر حالة", en: "changed status of" },
    created: { ar: "أنشأ", en: "created" },
    attachment_added: { ar: "أرفق ملفاً في", en: "attached file to" },
    assigned: { ar: "أسند", en: "assigned" },
    reviewed: { ar: "راجع", en: "reviewed" },
  };
  const entry = map[verb];
  return entry ? entry[locale] : verb;
}
