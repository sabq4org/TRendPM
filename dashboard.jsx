/* global React, Icon, Avatar, AvatarStack, StatusDot, PriorityDot, PriorityFlag, Progress, userById, projectById, tasksOf, isLate, lateDays, formatDate, formatShort, D, daysBetween, TEAM, PROJECTS, TASKS, ACTIVITY, T_AR, T_EN, TODAY */

const { useState, useMemo } = React;

// ——— Sparkline / small charts ———
const Sparkline = ({ data, w = 120, h = 28, color = "var(--accent)" }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const path = "M " + pts.map(p => p.join(" ")).join(" L ");
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg className="chart" width={w} height={h} style={{ display: "block" }}>
      <path d={area} fill={color} className="chart-area" />
      <path d={path} stroke={color} className="chart-line" />
    </svg>
  );
};

// ——— Velocity chart ———
const VelocityChart = ({ lang, t }) => {
  const data = [18, 22, 19, 24, 27, 23, 29, 31];
  const w = 540, h = 160, p = 28;
  const max = Math.max(...data) * 1.2;
  const bw = (w - p * 2) / data.length;
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }}>
      {[0, 0.25, 0.5, 0.75, 1].map(r => {
        const y = p + (h - p * 2) * (1 - r);
        return <g key={r}><line x1={p} x2={w - p} y1={y} y2={y} className="chart-grid" /><text x={p - 6} y={y + 3} textAnchor="end" className="chart-axis">{Math.round(max * r)}</text></g>;
      })}
      {data.map((v, i) => {
        const bh = (v / max) * (h - p * 2);
        const x = p + i * bw + 4;
        const y = h - p - bh;
        return <g key={i}>
          <rect x={x} y={y} width={bw - 8} height={bh} fill="var(--accent)" opacity={i === data.length - 1 ? 1 : 0.5} rx="2" />
          <text x={x + (bw - 8) / 2} y={h - p + 12} textAnchor="middle" className="chart-axis">W{i + 1}</text>
        </g>;
      })}
    </svg>
  );
};

// ——— Burn-down — dual line ———
const BurnDown = ({ lang }) => {
  const ideal = [100, 88, 75, 63, 50, 38, 25, 13, 0];
  const actual = [100, 92, 84, 78, 68, 58, 52, 44];
  const w = 540, h = 140, p = 24;
  const max = 100;
  const xStep = (w - p * 2) / (ideal.length - 1);
  const toPath = (arr) => "M " + arr.map((v, i) => `${p + i * xStep} ${p + (1 - v / max) * (h - p * 2)}`).join(" L ");
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }}>
      {[0, 0.5, 1].map(r => {
        const y = p + (h - p * 2) * (1 - r);
        return <line key={r} x1={p} x2={w - p} y1={y} y2={y} className="chart-grid" />;
      })}
      <path d={toPath(ideal)} stroke="var(--text-4)" strokeDasharray="3 3" fill="none" strokeWidth="1" />
      <path d={toPath(actual)} stroke="var(--accent)" fill="none" strokeWidth="1.5" />
      {actual.map((v, i) => <circle key={i} cx={p + i * xStep} cy={p + (1 - v / max) * (h - p * 2)} r="2" fill="var(--accent)" />)}
    </svg>
  );
};

// ——— Dashboard ———
const Dashboard = ({ lang, t, setView, openTask }) => {
  const totalTasks = TASKS.length;
  const openTasks = TASKS.filter(x => x.status !== "done").length;
  const lateTasks = TASKS.filter(isLate);
  const activeProjects = PROJECTS.filter(p => p.status === "Active").length;

  // Overloaded members: count open tasks per assignee, top ones
  const loadMap = {};
  TASKS.filter(x => x.status !== "done").forEach(tk => tk.assignees.forEach(a => { loadMap[a] = (loadMap[a] || 0) + 1; }));
  const overloaded = Object.entries(loadMap).map(([uid, n]) => ({ u: userById(uid), n, hrs: n * 6 + (uid.charCodeAt(1) % 7) })).sort((a, b) => b.n - a.n).slice(0, 5);
  const maxLoad = Math.max(...overloaded.map(x => x.n));

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{t.dashboard}</h1>
        <span className="sub mono">· {TODAY.toISOString().slice(0,10)} · {lang === "ar" ? "الخميس" : "Thu"}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <button className="btn sm"><Icon name="calendar" size={12} /> {lang === "ar" ? "آخر 30 يوم" : "Last 30 days"}</button>
          <button className="btn sm"><Icon name="filter" size={12} /> {t.filter}</button>
          <button className="btn primary sm"><Icon name="plus" size={12} /> {t.newTask}</button>
        </div>
      </div>

      <div className="dash">
        {/* KPIs */}
        <div className="col-3 kpi">
          <span className="kpi-label">{t.projectsCount}</span>
          <span className="kpi-value num">{activeProjects}<span style={{ color: "var(--text-4)", fontSize: 14 }}>/{PROJECTS.length}</span></span>
          <span className="kpi-sub"><span className="trend-up">▲ 2</span><span>{lang === "ar" ? "نشطة هذا الشهر" : "active this month"}</span><span style={{ marginInlineStart: "auto" }}><Sparkline data={[4, 4, 5, 5, 4, 5, 6, 6]} w={60} h={20} /></span></span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{t.openTasks}</span>
          <span className="kpi-value num">{openTasks}</span>
          <span className="kpi-sub"><span className="trend-down">▲ 8</span><span>{lang === "ar" ? "منذ الأسبوع الماضي" : "since last week"}</span><span style={{ marginInlineStart: "auto" }}><Sparkline data={[30, 32, 28, 34, 36, 33, 35, 37]} w={60} h={20} color="var(--s-review)" /></span></span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{t.overdue}</span>
          <span className="kpi-value num" style={{ color: "var(--s-late)" }}>{lateTasks.length}</span>
          <span className="kpi-sub"><span style={{ color: "var(--s-late)" }}>▲ 3</span><span>{lang === "ar" ? "تحتاج تدخّلاً" : "need attention"}</span><span style={{ marginInlineStart: "auto" }}><Sparkline data={[2, 2, 3, 4, 3, 4, 5, 6]} w={60} h={20} color="var(--s-late)" /></span></span>
        </div>
        <div className="col-3 kpi">
          <span className="kpi-label">{t.velocity}</span>
          <span className="kpi-value num">31</span>
          <span className="kpi-sub"><span className="trend-up">▲ 6.9%</span><span>{lang === "ar" ? "مقارنةً بالسابق" : "vs prior"}</span><span style={{ marginInlineStart: "auto" }}><Sparkline data={[18, 22, 19, 24, 27, 23, 29, 31]} w={60} h={20} /></span></span>
        </div>

        {/* Projects progress table */}
        <div className="col-8 panel">
          <div className="panel-head">
            <h3>{t.projects}</h3>
            <span className="chip mono">{PROJECTS.length}</span>
            <span className="tail">{lang === "ar" ? "مُرتّب حسب الأولوية" : "sorted by priority"}</span>
          </div>
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 28 }}></th>
              <th>{lang === "ar" ? "المشروع" : "Project"}</th>
              <th>{t.pm}</th>
              <th>{lang === "ar" ? "الفريق" : "Team"}</th>
              <th className="num">{t.completion}</th>
              <th className="num">{lang === "ar" ? "مفتوحة" : "Open"}</th>
              <th className="num">{t.late}</th>
              <th>{t.due}</th>
              <th style={{ width: 28 }}></th>
            </tr></thead>
            <tbody>
              {PROJECTS.map(p => {
                const ts = tasksOf(p.id);
                const open = ts.filter(x => x.status !== "done").length;
                const late = ts.filter(isLate).length;
                const assignees = [...new Set(ts.flatMap(x => x.assignees))].map(userById).filter(Boolean);
                return (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setView({ type: "project", id: p.id, sub: "board" })}>
                    <td><span style={{ width: 8, height: 8, display: "inline-block", background: p.color, borderRadius: 2 }} /></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ color: "var(--text-4)", fontSize: 10 }}>{p.key}</span>
                        <span className="truncate">{lang === "ar" ? p.name : p.en}</span>
                        <PriorityDot p={p.priority === "Critical" ? "crit" : p.priority === "High" ? "high" : p.priority === "Medium" ? "med" : "low"} />
                      </div>
                    </td>
                    <td><Avatar user={userById(p.pm)} /></td>
                    <td><AvatarStack users={assignees} max={4} /></td>
                    <td className="num" style={{ width: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Progress value={p.progress} /><span style={{ minWidth: 32, textAlign: "end" }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td className="num">{open}</td>
                    <td className="num" style={{ color: late > 0 ? "var(--s-late)" : "var(--text-3)" }}>{late || "—"}</td>
                    <td className="mono" style={{ color: "var(--text-3)" }}>{formatShort(p.due)}</td>
                    <td><Icon name="chevron" size={12} style={{ color: "var(--text-4)", transform: lang === "ar" ? "rotate(180deg)" : "none" }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right column: Top late + Overloaded */}
        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="panel">
            <div className="panel-head">
              <h3>{t.topLate}</h3>
              <span className="chip" style={{ color: "var(--s-late)", background: "color-mix(in oklch, var(--s-late) 15%, transparent)", borderColor: "transparent" }}>{lateTasks.length}</span>
            </div>
            <div>
              {lateTasks.slice(0, 5).sort((a, b) => lateDays(b) - lateDays(a)).map(tk => {
                const p = projectById(tk.projectId);
                return (
                  <div key={tk.id} onClick={() => openTask(tk.id)} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusDot s={tk.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: "var(--fs-sm)" }}>{tk.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span className="mono" style={{ fontSize: 10, color: "var(--text-4)" }}>{tk.id}</span>
                        <span style={{ width: 4, height: 4, borderRadius: 2, background: p.color, display: "inline-block" }} />
                        <span style={{ fontSize: "var(--fs-xxs)", color: "var(--text-3)" }} className="truncate">{lang === "ar" ? p.name : p.en}</span>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: "var(--fs-xs)", color: "var(--s-late)", whiteSpace: "nowrap" }}>-{lateDays(tk)}{t.d}</div>
                    {tk.assignees[0] && <Avatar user={userById(tk.assignees[0])} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>{t.overloaded}</h3>
              <span className="tail">{lang === "ar" ? "هذا الأسبوع" : "this week"}</span>
            </div>
            <div style={{ padding: "4px 12px 10px" }}>
              {overloaded.map(({ u, n, hrs }) => {
                const pct = (n / maxLoad) * 100;
                const over = hrs > 40;
                return (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <Avatar user={u} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="truncate" style={{ fontSize: "var(--fs-sm)" }}>{lang === "ar" ? u.name : u.en}</span>
                        <span className="mono" style={{ marginInlineStart: "auto", fontSize: "var(--fs-xs)", color: over ? "var(--s-blocked)" : "var(--text-3)" }}>{hrs}{t.h}/40{t.h}</span>
                      </div>
                      <div style={{ marginTop: 4, height: 4, background: "var(--hover)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: pct + "%", height: "100%", background: over ? "var(--s-blocked)" : "var(--accent)" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Velocity chart */}
        <div className="col-8 panel">
          <div className="panel-head">
            <h3>{t.velocityTrend}</h3>
            <span className="tail mono">31 tasks · 5.8% ▲</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <VelocityChart lang={lang} t={t} />
          </div>
        </div>

        {/* Activity */}
        <div className="col-4 panel">
          <div className="panel-head">
            <h3>{t.recentActivity}</h3>
          </div>
          <div style={{ padding: "6px 12px 10px" }}>
            {ACTIVITY.map((a, i) => {
              const u = userById(a.who);
              return (
                <div key={i} className="act">
                  <Avatar user={u} />
                  <div className="act-body">
                    <span className="who">{lang === "ar" ? u.name.split(" ")[0] : u.en.split(" ")[0]}</span> {a.action}{" "}
                    <span style={{ color: "var(--text)" }}>{a.target}</span>
                    <span className="when">{a.when}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Burn-down for key project */}
        <div className="col-6 panel">
          <div className="panel-head">
            <h3>{t.burn} — {lang === "ar" ? "بوابة الدفع" : "Payment Gateway"}</h3>
            <span className="tail mono">PAY · 62%</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <BurnDown lang={lang} />
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: "var(--fs-xs)", color: "var(--text-3)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 1, borderTop: "1px dashed var(--text-4)" }} />{lang === "ar" ? "المثالي" : "Ideal"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 2, background: "var(--accent)" }} />{lang === "ar" ? "الفعلي" : "Actual"}</span>
            </div>
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="col-6 panel">
          <div className="panel-head">
            <h3>{t.upcoming}</h3>
            <span className="tail">{lang === "ar" ? "الأيام السبعة القادمة" : "next 7 days"}</span>
          </div>
          <div>
            {TASKS.filter(x => x.status !== "done" && x.due && daysBetween(TODAY.toISOString().slice(0,10), x.due) >= 0 && daysBetween(TODAY.toISOString().slice(0,10), x.due) <= 10)
              .sort((a, b) => D(a.due) - D(b.due))
              .slice(0, 6).map(tk => {
                const p = projectById(tk.projectId);
                const days = daysBetween(TODAY.toISOString().slice(0,10), tk.due);
                return (
                  <div key={tk.id} onClick={() => openTask(tk.id)} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-4)", width: 56 }}>{tk.id}</span>
                    <StatusDot s={tk.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: "var(--fs-sm)" }}>{tk.title}</div>
                    </div>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: p.color }} />
                    <AvatarStack users={tk.assignees.map(userById).filter(Boolean)} max={2} />
                    <span className="mono" style={{ fontSize: "var(--fs-xs)", color: days <= 2 ? "var(--s-late)" : "var(--text-3)", width: 60, textAlign: "end" }}>
                      {days === 0 ? t.today : days === 1 ? (lang === "ar" ? "غداً" : "tomorrow") : `+${days}${t.d}`}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Dashboard });
