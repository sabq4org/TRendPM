/* global React, Icon, Avatar, AvatarStack, StatusDot, PriorityDot, PriorityFlag, Progress, userById, projectById, tasksOf, isLate, lateDays, formatDate, formatShort, D, daysBetween, TEAM, PROJECTS, TASKS, ACTIVITY, T_AR, T_EN, TODAY, useClickOutside */

const { useState, useMemo, useRef, useEffect } = React;

const STATUS_ORDER = ["todo", "progress", "review", "blocked", "done"];

// Shared: row-level status dropdown
const StatusMenu = ({ value, onChange, onClose, lang, t }) => {
  const ref = useRef();
  useClickOutside(ref, onClose);
  return (
    <div ref={ref} className="menu" style={{ top: "100%", insetInlineStart: 0, marginTop: 2 }}>
      {STATUS_ORDER.map(s => (
        <div key={s} className={"menu-item" + (s === value ? " active" : "")}
             onClick={() => { onChange(s); onClose(); }}>
          <StatusDot s={s} />
          <span>{t.status[s]}</span>
          {s === value && <Icon name="check" size={12} style={{ marginInlineStart: "auto", color: "var(--accent)" }} />}
        </div>
      ))}
    </div>
  );
};

// ——— Project Header (sub + toolbar) ———
const ProjectHeader = ({ p, sub, setSub, lang, t, filter, setFilter }) => {
  const openCount = tasksOf(p.id).filter(x => x.status !== "done").length;
  const lateCount = tasksOf(p.id).filter(isLate).length;
  const TAB = (id, icon, label) => (
    <button className={"tab" + (sub === id ? " active" : "")} onClick={() => setSub(id)}>
      <Icon name={icon} size={12} /><span>{label}</span>
    </button>
  );
  return (
    <>
      <div className="subhead">
        <span style={{ width: 10, height: 10, background: p.color, borderRadius: 2 }} />
        <h1>{lang === "ar" ? p.name : p.en}</h1>
        <span className="chip mono">{p.key}</span>
        <span className="chip">{p.status}</span>
        <span className="chip"><PriorityDot p={p.priority === "Critical" ? "crit" : p.priority === "High" ? "high" : p.priority === "Medium" ? "med" : "low"} />{t.priority[p.priority === "Critical" ? "crit" : p.priority === "High" ? "high" : p.priority === "Medium" ? "med" : "low"]}</span>
        <span className="sub">· {p.client}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Progress value={p.progress} /><span className="mono" style={{ fontSize: "var(--fs-xs)", color: "var(--text-2)" }}>{p.progress}%</span>
          </div>
          <span className="sub mono">· {formatShort(p.start)} → {formatShort(p.due)}</span>
        </div>
      </div>
      <div className="toolbar">
        <div className="tabs">
          {TAB("board", "kanban", t.board)}
          {TAB("list", "list", t.list)}
          {TAB("gantt", "gantt", t.gantt)}
          {TAB("calendar", "calendar", t.calendar)}
        </div>
        <span style={{ color: "var(--text-4)", fontSize: "var(--fs-xs)" }}>·</span>
        <span className="chip mono">{openCount} {t.openTasks}</span>
        {lateCount > 0 && <span className="chip" style={{ color: "var(--s-late)", borderColor: "color-mix(in oklch, var(--s-late) 30%, transparent)" }}>{lateCount} {t.late}</span>}
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 8px", height: 26 }}>
            <Icon name="search" size={12} style={{ color: "var(--text-4)" }} />
            <input placeholder={lang === "ar" ? "ابحث…" : "Search…"} value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 140, height: 26, fontSize: "var(--fs-sm)" }} />
          </div>
          <button className="btn sm"><Icon name="filter" size={12} /> {t.filter}</button>
          <button className="btn sm"><Icon name="sort" size={12} /> {t.group}</button>
          <button className="btn primary sm"><Icon name="plus" size={12} /> {t.newTask}</button>
        </div>
      </div>
    </>
  );
};

// ——— Kanban ———
const KanbanView = ({ p, lang, t, filter, openTask, onMove }) => {
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const cols = STATUS_ORDER.map(s => ({
    id: s, title: t.status[s],
    tasks: tasksOf(p.id).filter(x => x.status === s && (!filter || x.title.includes(filter) || x.id.includes(filter)))
  }));

  return (
    <div className="kanban">
      {cols.map(c => (
        <div key={c.id} className="col">
          <div className="col-head">
            <StatusDot s={c.id} />
            <span style={{ fontSize: "var(--fs-sm)", fontWeight: 500 }}>{c.title}</span>
            <span className="count">{c.tasks.length}</span>
            <Icon name="plus" size={12} style={{ color: "var(--text-3)", cursor: "pointer" }} />
          </div>
          <div className={"col-body" + (overCol === c.id ? " drop-over" : "")}
               onDragOver={e => { e.preventDefault(); setOverCol(c.id); }}
               onDragLeave={() => setOverCol(null)}
               onDrop={e => { e.preventDefault(); if (dragId) onMove(dragId, c.id); setDragId(null); setOverCol(null); }}>
            {c.tasks.map(tk => {
              const late = isLate(tk);
              return (
                <div key={tk.id} className={"tcard" + (dragId === tk.id ? " dragging" : "")}
                     draggable
                     onDragStart={() => setDragId(tk.id)}
                     onDragEnd={() => { setDragId(null); setOverCol(null); }}
                     onClick={() => openTask(tk.id)}>
                  <div className="tcard-head">
                    <span>{tk.id}</span>
                    {tk.tags.length > 0 && <span style={{ color: "var(--text-4)" }}>· {tk.tags[0]}</span>}
                    <span className="tail">
                      <PriorityFlag p={tk.priority} />
                    </span>
                  </div>
                  <div className="tcard-title">{tk.title}</div>
                  {tk.progress > 0 && tk.progress < 100 && <Progress value={tk.progress} thin />}
                  <div className="tcard-meta">
                    {tk.due && <span className="mono" style={{ color: late ? "var(--s-late)" : "var(--text-3)" }}>
                      {late && "⚠ "}{formatShort(tk.due)}
                    </span>}
                    {tk.comments > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon name="comment" size={11} />{tk.comments}</span>}
                    {tk.att > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon name="paperclip" size={11} />{tk.att}</span>}
                    {tk.deps.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon name="link" size={11} />{tk.deps.length}</span>}
                    <span className="tail"><AvatarStack users={tk.assignees.map(userById).filter(Boolean)} max={2} /></span>
                  </div>
                </div>
              );
            })}
            {c.tasks.length === 0 && <div style={{ padding: "16px 8px", textAlign: "center", fontSize: "var(--fs-xs)", color: "var(--text-4)" }}>—</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ——— List view with status dropdown ———
const ListView = ({ p, lang, t, filter, openTask, onChangeStatus, allProjects }) => {
  const [menuId, setMenuId] = useState(null);
  const tasks = (allProjects ? TASKS : tasksOf(p.id))
    .filter(x => !filter || x.title.includes(filter) || x.id.includes(filter));

  const grouped = STATUS_ORDER.map(s => ({ s, arr: tasks.filter(x => x.status === s) }));

  return (
    <div className="scroll">
      <table className="tbl" style={{ background: "var(--panel)" }}>
        <thead><tr>
          <th style={{ width: 80 }}>ID</th>
          <th>{lang === "ar" ? "المهمة" : "Task"}</th>
          <th style={{ width: 120 }}>{lang === "ar" ? "الحالة" : "Status"}</th>
          <th style={{ width: 60 }}>{lang === "ar" ? "أولوية" : "Pri"}</th>
          <th style={{ width: 120 }}>{t.assignee}</th>
          <th style={{ width: 120 }}>{t.due}</th>
          <th style={{ width: 120 }} className="num">{t.progress}</th>
          <th style={{ width: 60 }} className="num">{t.estimate}</th>
          <th style={{ width: 28 }}></th>
        </tr></thead>
        {grouped.map(({ s, arr }) => arr.length > 0 && (
          <tbody key={s}>
            <tr style={{ background: "var(--panel-2)" }}>
              <td colSpan={9} style={{ height: 28, padding: "0 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusDot s={s} />
                  <span style={{ fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-2)", fontWeight: 500 }}>{t.status[s]}</span>
                  <span className="mono" style={{ fontSize: "var(--fs-xxs)", color: "var(--text-4)" }}>{arr.length}</span>
                </div>
              </td>
            </tr>
            {arr.map(tk => {
              const late = isLate(tk);
              const proj = projectById(tk.projectId);
              return (
                <tr key={tk.id} onClick={() => openTask(tk.id)} style={{ cursor: "pointer" }}>
                  <td className="mono" style={{ color: "var(--text-4)", fontSize: "var(--fs-xxs)" }}>
                    {allProjects && <><span style={{ width: 6, height: 6, background: proj.color, borderRadius: 2, display: "inline-block", marginInlineEnd: 5 }} />{proj.key}-</>}
                    {tk.id.split("-")[1]}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="truncate">{tk.title}</span>
                      {tk.tags.slice(0, 1).map(tag => <span key={tag} className="chip" style={{ height: 18, fontSize: 10 }}>{tag}</span>)}
                      {tk.comments > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--text-4)", fontSize: "var(--fs-xxs)" }}><Icon name="comment" size={10} />{tk.comments}</span>}
                    </div>
                  </td>
                  <td style={{ position: "relative" }}>
                    <div onClick={e => { e.stopPropagation(); setMenuId(menuId === tk.id ? null : tk.id); }}
                         style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 6px", borderRadius: 3, cursor: "pointer" }}
                         className="hover-bg">
                      <StatusDot s={tk.status} />
                      <span style={{ fontSize: "var(--fs-xs)" }}>{t.status[tk.status]}</span>
                      <Icon name="chevDown" size={10} style={{ color: "var(--text-4)" }} />
                    </div>
                    {menuId === tk.id && <StatusMenu value={tk.status} onChange={(s) => onChangeStatus(tk.id, s)} onClose={() => setMenuId(null)} lang={lang} t={t} />}
                  </td>
                  <td><PriorityFlag p={tk.priority} /></td>
                  <td><AvatarStack users={tk.assignees.map(userById).filter(Boolean)} max={3} /></td>
                  <td className="mono" style={{ fontSize: "var(--fs-xs)", color: late ? "var(--s-late)" : "var(--text-3)" }}>
                    {tk.due ? formatShort(tk.due) : "—"}{late && <span style={{ marginInlineStart: 4 }}>· -{lateDays(tk)}d</span>}
                  </td>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 6 }}><Progress value={tk.progress} /><span className="mono" style={{ fontSize: "var(--fs-xxs)", color: "var(--text-3)", minWidth: 28 }}>{tk.progress}%</span></div></td>
                  <td className="num" style={{ color: "var(--text-3)", fontSize: "var(--fs-xs)" }}>{tk.est}{t.h}</td>
                  <td><Icon name="moreV" size={12} style={{ color: "var(--text-4)" }} /></td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
};

// ——— Gantt ———
const GanttView = ({ p, lang, t, openTask, allProjects }) => {
  const tasks = (allProjects ? TASKS : tasksOf(p.id)).filter(x => x.start && x.due);
  // Determine date range
  const allStarts = tasks.map(x => D(x.start));
  const allDues = tasks.map(x => D(x.due));
  const minD = new Date(Math.min(...allStarts));
  const maxD = new Date(Math.max(...allDues));
  minD.setDate(minD.getDate() - 3);
  maxD.setDate(maxD.getDate() + 3);
  const dayW = 18;
  const totalDays = daysBetween(minD.toISOString().slice(0,10), maxD.toISOString().slice(0,10));
  const width = totalDays * dayW;

  // Group by week for header
  const weeks = [];
  const cur = new Date(minD);
  while (cur <= maxD) {
    weeks.push({ d: new Date(cur), label: `${String(cur.getDate()).padStart(2,"0")}.${String(cur.getMonth()+1).padStart(2,"0")}` });
    cur.setDate(cur.getDate() + 7);
  }

  const todayOffset = daysBetween(minD.toISOString().slice(0,10), TODAY.toISOString().slice(0,10)) * dayW;

  const posFor = (tk) => {
    const off = daysBetween(minD.toISOString().slice(0,10), tk.start) * dayW;
    const w = (daysBetween(tk.start, tk.due) + 1) * dayW;
    return { left: off, width: Math.max(w, 12) };
  };

  return (
    <div className="gantt" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="gantt-left">
        <div className="gantt-header" style={{ padding: "0 10px", alignItems: "center" }}>
          <span style={{ fontSize: "var(--fs-xxs)", textTransform: "uppercase", color: "var(--text-3)", letterSpacing: "0.04em" }}>{lang === "ar" ? "المهمة" : "Task"}</span>
        </div>
        <div className="gantt-body">
          {tasks.map(tk => (
            <div key={tk.id} className="gantt-row" onClick={() => openTask(tk.id)} style={{ cursor: "pointer" }}>
              <StatusDot s={tk.status} />
              <span className="mono" style={{ fontSize: "var(--fs-xxs)", color: "var(--text-4)", width: 48, flexShrink: 0 }}>{tk.id}</span>
              <span className="truncate" style={{ flex: 1 }}>{tk.title}</span>
              <AvatarStack users={tk.assignees.map(userById).filter(Boolean)} max={2} />
            </div>
          ))}
        </div>
      </div>
      <div className="gantt-right" style={{ position: "relative", minWidth: width }}>
        <div className="gantt-header" style={{ width }}>
          {weeks.map((w, i) => (
            <div key={i} className="gh-cell" style={{ width: 7 * dayW }}>{w.label}</div>
          ))}
        </div>
        <div className="gantt-body" style={{ width, position: "relative" }}>
          {todayOffset > 0 && todayOffset < width && <div className="gantt-today" style={{ insetInlineStart: todayOffset }} />}
          {tasks.map(tk => {
            const { left, width: w } = posFor(tk);
            const late = isLate(tk);
            return (
              <div key={tk.id} className="gantt-track" onClick={() => openTask(tk.id)} style={{ cursor: "pointer" }}>
                <div className={"gantt-bar " + tk.status + (late ? " late" : "")}
                     style={{ insetInlineStart: left, width: w }}
                     title={tk.title}>
                  {w > 80 && <span className="truncate" style={{ fontFamily: "var(--font-ar)", fontSize: 10 }}>{tk.title}</span>}
                  {tk.progress > 0 && tk.progress < 100 && (
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, rgba(0,0,0,0.25) ${tk.progress}%, transparent ${tk.progress}%)` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ——— Calendar ———
const CalendarView = ({ p, lang, t, openTask, allProjects }) => {
  // April 2026
  const year = 2026, month = 3; // 0-indexed: 3 = April
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  // Previous month filler
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, -(startOffset - 1 - i));
    cells.push({ d, other: true });
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ d: new Date(year, month, i), other: false });
  while (cells.length % 7 !== 0 || cells.length < 35) cells.push({ d: new Date(year, month + 1, cells.length - daysInMonth - startOffset + 1), other: true });

  const tasks = allProjects ? TASKS : tasksOf(p.id);

  return (
    <div className="cal">
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8 }}>
        <button className="btn icon sm"><Icon name="chevLeft" size={12} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} /></button>
        <span style={{ fontSize: "var(--fs-md)", fontWeight: 600 }}>{t.months[month]} {year}</span>
        <button className="btn icon sm"><Icon name="chevRight" size={12} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} /></button>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 4 }}>
          <button className="btn sm" style={{ background: "var(--panel)" }}>{t.month}</button>
          <button className="btn sm ghost">{t.week}</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div className="cal-head">{t.days.map((d, i) => <div key={i}>{d}</div>)}</div>
        <div className="cal-grid" style={{ flex: 1 }}>
          {cells.map((c, i) => {
            const iso = c.d.toISOString().slice(0,10);
            const today = iso === TODAY.toISOString().slice(0,10);
            const dayTasks = tasks.filter(x => x.due === iso);
            return (
              <div key={i} className={"cal-cell" + (c.other ? " other" : "") + (today ? " today" : "")}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span className="d">{c.d.getDate()}</span>
                  {today && <span className="chip accent" style={{ height: 14, fontSize: 9, marginInlineStart: 6 }}>{t.today}</span>}
                </div>
                {dayTasks.slice(0, 4).map(tk => (
                  <div key={tk.id} className={"ev " + tk.status} onClick={() => openTask(tk.id)} style={{ cursor: "pointer" }}>
                    {tk.id} · {tk.title}
                  </div>
                ))}
                {dayTasks.length > 4 && <span style={{ fontSize: "var(--fs-xxs)", color: "var(--text-4)" }}>+{dayTasks.length - 4}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ——— Task Side Panel ———
const TaskPanel = ({ task, onClose, lang, t, onChangeStatus }) => {
  if (!task) return null;
  const [statusOpen, setStatusOpen] = useState(false);
  const p = projectById(task.projectId);
  const assignees = task.assignees.map(userById).filter(Boolean);
  const late = isLate(task);
  const comments = COMMENTS_BY_TASK[task.id] || [
    { u: task.assignees[0] || "u2", when: lang === "ar" ? "قبل ساعة" : "1h ago", text: lang === "ar" ? "أضفت تفاصيل جديدة في الوصف، مراجعة رجاءً." : "Added more details to the description, please review." },
    { u: "u1", when: lang === "ar" ? "قبل 25 د" : "25m ago", text: lang === "ar" ? "تمام، راجعت النقاط وعدّلت التقدير الزمني." : "Reviewed and adjusted the estimate." }
  ];

  return (
    <aside className="side">
      <div className="side-head">
        <span className="mono" style={{ color: "var(--text-4)", fontSize: "var(--fs-xs)" }}>{task.id}</span>
        <span style={{ width: 6, height: 6, borderRadius: 2, background: p.color }} />
        <span className="truncate" style={{ fontSize: "var(--fs-xs)", color: "var(--text-3)" }}>{lang === "ar" ? p.name : p.en}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 4 }}>
          <button className="btn ghost icon sm"><Icon name="link" size={12} /></button>
          <button className="btn ghost icon sm"><Icon name="more" size={12} /></button>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="close" size={12} /></button>
        </div>
      </div>
      <div className="side-body">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ position: "relative", paddingTop: 4 }}>
            <div onClick={() => setStatusOpen(!statusOpen)} style={{ cursor: "pointer" }}>
              <StatusDot s={task.status} />
            </div>
            {statusOpen && <StatusMenu value={task.status} onChange={(s) => onChangeStatus(task.id, s)} onClose={() => setStatusOpen(false)} lang={lang} t={t} />}
          </div>
          <h2 style={{ margin: 0, fontSize: "var(--fs-lg)", fontWeight: 500, lineHeight: 1.35 }}>{task.title}</h2>
        </div>

        {late && <div className="chip" style={{ marginTop: 10, color: "var(--s-late)", borderColor: "color-mix(in oklch, var(--s-late) 30%, transparent)", background: "color-mix(in oklch, var(--s-late) 12%, transparent)" }}>
          <Icon name="alert" size={11} /> {lang === "ar" ? `متأخرة بـ ${lateDays(task)} يوم` : `Overdue by ${lateDays(task)} days`}
        </div>}

        <div style={{ marginTop: 14, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
          <div className="side-row"><span className="k">{lang === "ar" ? "الحالة" : "Status"}</span><span className="v" style={{ display: "flex", alignItems: "center", gap: 6 }}><StatusDot s={task.status} /> {t.status[task.status]}</span></div>
          <div className="side-row"><span className="k">{lang === "ar" ? "الأولوية" : "Priority"}</span><span className="v" style={{ display: "flex", alignItems: "center", gap: 6 }}><PriorityFlag p={task.priority} /> {t.priority[task.priority]}</span></div>
          <div className="side-row"><span className="k">{t.assignee}</span><span className="v" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {assignees.length === 0 ? <span style={{ color: "var(--text-4)" }}>{lang === "ar" ? "غير مُسنَد" : "Unassigned"}</span> :
              assignees.map(u => <span key={u.id} style={{ display: "flex", alignItems: "center", gap: 4 }}><Avatar user={u} /><span style={{ fontSize: "var(--fs-xs)" }}>{lang === "ar" ? u.name : u.en}</span></span>)}
          </span></div>
          <div className="side-row"><span className="k">{t.due}</span><span className="v mono" style={{ color: late ? "var(--s-late)" : "var(--text)", fontSize: "var(--fs-sm)" }}>{task.due ? formatDate(task.due, lang) : "—"}</span></div>
          <div className="side-row"><span className="k">{t.estimate} / {t.spent}</span><span className="v mono" style={{ fontSize: "var(--fs-sm)" }}>{task.est}{t.h} / <span style={{ color: task.spent > task.est ? "var(--s-late)" : "var(--text-2)" }}>{task.spent}{t.h}</span></span></div>
          <div className="side-row"><span className="k">{t.progress}</span><span className="v" style={{ display: "flex", alignItems: "center", gap: 8 }}><Progress value={task.progress} /><span className="mono" style={{ fontSize: "var(--fs-xs)" }}>{task.progress}%</span></span></div>
          {task.tags.length > 0 && <div className="side-row"><span className="k">Tags</span><span className="v" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{task.tags.map(tag => <span key={tag} className="chip" style={{ height: 18 }}>{tag}</span>)}</span></div>}
          {task.deps.length > 0 && <div className="side-row"><span className="k">{t.dependencies}</span><span className="v" style={{ display: "flex", gap: 4 }}>{task.deps.map(d => <span key={d} className="chip mono" style={{ height: 18 }}><Icon name="link" size={10} />{d}</span>)}</span></div>}
        </div>

        {/* Description */}
        <div style={{ marginTop: 14 }}>
          <div className="label">{t.description}</div>
          <div style={{ marginTop: 6, fontSize: "var(--fs-sm)", color: "var(--text-2)", lineHeight: 1.6 }}>
            {task.description || (lang === "ar"
              ? "هذه المهمة جزء من الخطة الرئيسية للمشروع. تتضمّن تحديث منطق العمل، كتابة اختبارات الوحدة، ومراجعة التأثير على الخدمات المرتبطة. المرجعية الفنية: RFC-24، ومخطط التسلسل في Notion."
              : "This task is part of the main project plan. Includes business logic updates, unit tests, and impact review on related services. Reference: RFC-24, sequence diagram in Notion.")}
          </div>
        </div>

        {/* Subtasks / checklist */}
        <div style={{ marginTop: 16 }}>
          <div className="label">{t.subtasks}</div>
          <div style={{ marginTop: 6 }}>
            {[
              { done: true, t: lang === "ar" ? "مراجعة المتطلبات مع PM" : "Review requirements with PM" },
              { done: true, t: lang === "ar" ? "إعداد بيئة التطوير" : "Set up dev environment" },
              { done: task.progress > 50, t: lang === "ar" ? "كتابة الاختبارات" : "Write tests" },
              { done: false, t: lang === "ar" ? "مراجعة الأداء" : "Performance review" },
              { done: false, t: lang === "ar" ? "تحديث التوثيق" : "Update documentation" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: "var(--fs-sm)" }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${s.done ? "var(--accent)" : "var(--border-strong)"}`, background: s.done ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-fg)" }}>
                  {s.done && <Icon name="check" size={10} />}
                </span>
                <span style={{ color: s.done ? "var(--text-3)" : "var(--text)", textDecoration: s.done ? "line-through" : "none" }}>{s.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div style={{ marginTop: 18 }}>
          <div className="label">{t.comments} · {comments.length}</div>
          <div style={{ marginTop: 6 }}>
            {comments.map((c, i) => {
              const u = userById(c.u) || TEAM[0];
              return (
                <div key={i} className="comment">
                  <Avatar user={u} />
                  <div className="c-body">
                    <div className="c-head"><span className="who">{lang === "ar" ? u.name : u.en}</span><span>·</span><span className="mono">{c.when}</span></div>
                    <div className="c-text">{c.text}</div>
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Avatar user={userById("u2")} />
              <div style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 6, padding: 8 }}>
                <textarea rows={2} placeholder={t.addComment} style={{ width: "100%", resize: "none", fontSize: "var(--fs-sm)" }} />
                <div style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "center" }}>
                  <button className="btn ghost icon sm"><Icon name="paperclip" size={12} /></button>
                  <span style={{ fontSize: "var(--fs-xxs)", color: "var(--text-4)" }}>{lang === "ar" ? "Markdown مدعوم" : "Markdown supported"}</span>
                  <button className="btn primary sm" style={{ marginInlineStart: "auto" }}>{lang === "ar" ? "نشر" : "Post"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

Object.assign(window, { ProjectHeader, KanbanView, ListView, GanttView, CalendarView, TaskPanel });
