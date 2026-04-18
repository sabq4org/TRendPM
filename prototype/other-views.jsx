/* global React, Icon, Avatar, AvatarStack, StatusDot, PriorityDot, PriorityFlag, Progress, userById, projectById, tasksOf, isLate, lateDays, formatDate, formatShort, D, daysBetween, TEAM, PROJECTS, TASKS, ACTIVITY, T_AR, T_EN, TODAY, ListView */

const { useState, useMemo } = React;

// ——— Workload View ———
const WorkloadView = ({ lang, t, openTask }) => {
  // Week of TODAY (2026-04-16 Thu) — show Sun 2026-04-12 through Sat 2026-04-18
  const weekStart = new Date("2026-04-12");
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  const rows = TEAM.map(u => {
    const tasks = TASKS.filter(tk => tk.assignees.includes(u.id) && tk.status !== "done" && tk.start && tk.due);
    // Per day buckets
    const byDay = days.map(d => {
      const iso = d.toISOString().slice(0, 10);
      return tasks.filter(tk => tk.start <= iso && tk.due >= iso);
    });
    const totalHrs = tasks.reduce((s, tk) => s + (tk.est - (tk.spent || 0)) / Math.max(1, daysBetween(tk.start, tk.due) + 1) * 5, 0);
    return { u, tasks, byDay, hrs: Math.round(totalHrs) };
  });

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{t.workload}</h1>
        <span className="sub">· {lang === "ar" ? "الأسبوع" : "Week of"} {formatShort(weekStart.toISOString().slice(0,10))}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <button className="btn sm"><Icon name="chevLeft" size={12} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} /></button>
          <button className="btn sm">{lang === "ar" ? "هذا الأسبوع" : "This week"}</button>
          <button className="btn sm"><Icon name="chevRight" size={12} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} /></button>
          <button className="btn sm"><Icon name="filter" size={12} /> {t.filter}</button>
        </div>
      </div>
      <div className="wl-head">
        <div className="wl-name">{lang === "ar" ? "عضو الفريق" : "Team member"}</div>
        {days.map((d, i) => (
          <div key={i} className="wl-day">
            <div>{t.days[d.getDay()]}</div>
            <div style={{ color: d.toISOString().slice(0,10) === TODAY.toISOString().slice(0,10) ? "var(--accent)" : "var(--text-2)", fontSize: "var(--fs-xs)" }}>{String(d.getDate()).padStart(2,"0")}</div>
          </div>
        ))}
      </div>
      {rows.map(({ u, byDay, hrs }) => {
        const over = hrs > 40;
        return (
          <div key={u.id} className="wl-row">
            <div className="wl-name">
              <Avatar user={u} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: "var(--fs-sm)" }}>{lang === "ar" ? u.name : u.en}</div>
                <div className="meta truncate">{u.role} · <span className="mono">{hrs}h/40h</span></div>
              </div>
            </div>
            {byDay.map((tasks, i) => {
              const dayHrs = tasks.length * 2 + tasks.reduce((s, t) => s + (t.priority === "crit" ? 2 : 0), 0);
              const dayOver = dayHrs > 8;
              return (
                <div key={i} className="wl-day" style={{ background: dayOver ? "color-mix(in oklch, var(--s-blocked) 6%, transparent)" : "transparent" }}>
                  <span className={"wl-load" + (dayOver ? " over" : "")}>{dayHrs}h</span>
                  {tasks.slice(0, 3).map(tk => {
                    const p = projectById(tk.projectId);
                    return (
                      <div key={tk.id} className={"wl-bar" + (dayOver ? " over" : "")}
                           onClick={() => openTask(tk.id)}
                           style={{ cursor: "pointer", borderColor: p.color }}
                           title={tk.title}>
                        <span className="mono" style={{ fontSize: 9, color: "var(--text-4)", marginInlineEnd: 4 }}>{tk.id}</span>
                        {tk.title}
                      </div>
                    );
                  })}
                  {tasks.length > 3 && <span style={{ fontSize: 9, color: "var(--text-4)" }}>+{tasks.length - 3}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ——— My Tasks View ———
const MyTasksView = ({ lang, t, openTask, onChangeStatus }) => {
  const me = userById("u2"); // Omar the tech lead
  const [filter, setFilter] = useState("");
  const myTasks = TASKS.filter(tk => tk.assignees.includes(me.id));
  const open = myTasks.filter(x => x.status !== "done").length;
  const late = myTasks.filter(isLate).length;
  const done = myTasks.filter(x => x.status === "done").length;

  // Fake a custom project object for ListView
  const fake = { id: "me", color: "var(--accent)" };

  return (
    <div className="main" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="subhead">
        <Avatar user={me} size="md" />
        <h1>{t.myTasks}</h1>
        <span className="sub">· {lang === "ar" ? me.name : me.en}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <span className="chip"><span className="mono">{open}</span> {lang === "ar" ? "مفتوحة" : "open"}</span>
          <span className="chip" style={{ color: "var(--s-late)" }}><span className="mono">{late}</span> {t.late}</span>
          <span className="chip" style={{ color: "var(--accent)" }}><span className="mono">{done}</span> {lang === "ar" ? "منجزة" : "done"}</span>
        </div>
      </div>
      <div className="toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 8px", height: 26 }}>
          <Icon name="search" size={12} style={{ color: "var(--text-4)" }} />
          <input placeholder={lang === "ar" ? "ابحث في مهامي…" : "Search my tasks…"} value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 180, height: 26 }} />
        </div>
        <button className="btn sm"><Icon name="filter" size={12} /> {t.filter}</button>
        <button className="btn sm"><Icon name="sort" size={12} /> {lang === "ar" ? "حسب الاستحقاق" : "By due date"}</button>
      </div>
      <div className="scroll">
        <ListView p={fake} lang={lang} t={t} filter={filter} openTask={openTask} onChangeStatus={onChangeStatus} allProjects={true} />
      </div>
    </div>
  );
};

// ——— Analytics (simpler: reuses dashboard building blocks in a denser layout) ———
const AnalyticsView = ({ lang, t }) => {
  const totalHrs = TASKS.reduce((s, t) => s + (t.spent || 0), 0);
  const estHrs = TASKS.reduce((s, t) => s + (t.est || 0), 0);
  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{t.analytics}</h1>
        <span className="sub">· {lang === "ar" ? "الربع الثاني 2026" : "Q2 2026"}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <button className="btn sm"><Icon name="paperclip" size={12} /> {lang === "ar" ? "تصدير PDF" : "Export PDF"}</button>
          <button className="btn sm"><Icon name="paperclip" size={12} /> {lang === "ar" ? "تصدير Excel" : "Export Excel"}</button>
        </div>
      </div>
      <div className="dash">
        <div className="col-3 kpi">
          <span className="kpi-label">{lang === "ar" ? "مهام منجزة" : "Completed"}</span>
          <span className="kpi-value num">{TASKS.filter(x => x.status === "done").length}</span>
          <span className="kpi-sub"><span className="trend-up">▲ 12%</span>{lang === "ar" ? "vs الربع السابق" : "vs last Q"}</span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{lang === "ar" ? "ساعات فعلية" : "Actual hours"}</span>
          <span className="kpi-value num">{totalHrs}<span style={{ fontSize: 14, color: "var(--text-4)" }}>/{estHrs}</span></span>
          <span className="kpi-sub">{lang === "ar" ? "انحراف" : "Variance"} <span className="mono trend-down">+{Math.round((totalHrs - estHrs) / estHrs * 100)}%</span></span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{lang === "ar" ? "وسطي الإنجاز" : "Avg completion"}</span>
          <span className="kpi-value num">{Math.round(TASKS.reduce((s, t) => s + t.progress, 0) / TASKS.length)}%</span>
          <span className="kpi-sub"><span className="trend-up">▲ 4%</span></span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{lang === "ar" ? "أعضاء نشطون" : "Active members"}</span>
          <span className="kpi-value num">{TEAM.length}</span>
          <span className="kpi-sub">{lang === "ar" ? "عبر" : "across"} {PROJECTS.length} {lang === "ar" ? "مشاريع" : "projects"}</span>
        </div>

        {/* Member breakdown */}
        <div className="col-12 panel">
          <div className="panel-head"><h3>{lang === "ar" ? "أداء الأعضاء" : "Member performance"}</h3></div>
          <table className="tbl">
            <thead><tr>
              <th>{lang === "ar" ? "العضو" : "Member"}</th>
              <th>{lang === "ar" ? "الدور" : "Role"}</th>
              <th className="num">{lang === "ar" ? "منجزة" : "Done"}</th>
              <th className="num">{lang === "ar" ? "جارية" : "Active"}</th>
              <th className="num">{lang === "ar" ? "متأخرة" : "Late"}</th>
              <th className="num">{lang === "ar" ? "متوسط التأخير" : "Avg delay"}</th>
              <th className="num">{lang === "ar" ? "معدل الإنجاز" : "Completion rate"}</th>
              <th>{lang === "ar" ? "الاتجاه" : "Trend"}</th>
            </tr></thead>
            <tbody>
              {TEAM.map((u, i) => {
                const tasks = TASKS.filter(t => t.assignees.includes(u.id));
                const done = tasks.filter(t => t.status === "done").length;
                const active = tasks.filter(t => t.status !== "done").length;
                const lateN = tasks.filter(isLate).length;
                const rate = tasks.length ? Math.round(done / tasks.length * 100) : 0;
                return (
                  <tr key={u.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar user={u} /><span>{lang === "ar" ? u.name : u.en}</span></div></td>
                    <td style={{ color: "var(--text-3)", fontSize: "var(--fs-xs)" }}>{u.role}</td>
                    <td className="num">{done}</td>
                    <td className="num">{active}</td>
                    <td className="num" style={{ color: lateN ? "var(--s-late)" : "var(--text-3)" }}>{lateN || "—"}</td>
                    <td className="num mono" style={{ color: "var(--text-3)" }}>{((i * 0.7 + 1.2) % 4).toFixed(1)}d</td>
                    <td className="num"><div style={{ display: "flex", alignItems: "center", gap: 6 }}><Progress value={rate} /><span className="mono">{rate}%</span></div></td>
                    <td><svg width={60} height={16}><polyline points={Array.from({ length: 8 }, (_, j) => `${j * 8},${8 - Math.sin(i + j) * 4}`).join(" ")} stroke="var(--accent)" strokeWidth="1" fill="none" /></svg></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { WorkloadView, MyTasksView, AnalyticsView });
