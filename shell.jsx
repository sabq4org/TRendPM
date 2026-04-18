/* global React, Icon, Avatar, AvatarStack, StatusDot, PriorityDot, PriorityFlag, Progress, userById, projectById, tasksOf, isLate, lateDays, formatDate, formatShort, D, daysBetween, TEAM, PROJECTS, TASKS, ACTIVITY, T_AR, T_EN, TODAY, useClickOutside */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ——— Sidebar ———
const Sidebar = ({ view, setView, lang, t }) => {
  const Item = ({ id, icon, label, tail, active, onClick }) => (
    <div className={"sb-item" + (active ? " active" : "")} onClick={onClick}>
      <Icon name={icon} /><span className="truncate">{label}</span>
      {tail != null && <span className="tail">{tail}</span>}
    </div>
  );
  const openTasks = TASKS.filter(x => x.status !== "done").length;
  const myTasksCount = TASKS.filter(x => x.assignees.includes("u2") && x.status !== "done").length;
  return (
    <aside className="sidebar">
      <div className="sb-section">
        <Item icon="dashboard" label={t.dashboard} active={view.type === "dash"} onClick={() => setView({ type: "dash" })} />
        <Item icon="inbox" label={t.inbox} tail="12" onClick={() => setView({ type: "dash" })} />
        <Item icon="tasks" label={t.myTasks} tail={myTasksCount} active={view.type === "mytasks"} onClick={() => setView({ type: "mytasks" })} />
        <Item icon="workload" label={t.workload} active={view.type === "workload"} onClick={() => setView({ type: "workload" })} />
        <Item icon="analytics" label={t.analytics} active={view.type === "analytics"} onClick={() => setView({ type: "analytics" })} />
      </div>

      <div className="sb-section">
        <div className="sb-head">
          <span>{t.projects}</span>
          <Icon name="plus" size={12} style={{ cursor: "pointer" }} />
        </div>
        {PROJECTS.map(p => {
          const t_open = tasksOf(p.id).filter(x => x.status !== "done").length;
          return (
            <div key={p.id} className={"sb-item" + (view.type === "project" && view.id === p.id ? " active" : "")}
                 onClick={() => setView({ type: "project", id: p.id, sub: "board" })}>
              <span className="sb-proj-dot" style={{ background: p.color }} />
              <span className="truncate">{lang === "ar" ? p.name : p.en}</span>
              <span className="tail">{t_open}</span>
            </div>
          );
        })}
      </div>

      <div className="sb-section">
        <div className="sb-head"><span>{t.teams}</span></div>
        <Item icon="team" label={lang === "ar" ? "فريق Backend" : "Backend"} tail="4" />
        <Item icon="team" label={lang === "ar" ? "فريق Frontend" : "Frontend"} tail="3" />
        <Item icon="team" label={lang === "ar" ? "فريق التصميم" : "Design"} tail="2" />
        <Item icon="team" label={lang === "ar" ? "فريق DevOps" : "DevOps"} tail="2" />
      </div>

      <div className="sb-section">
        <Item icon="settings" label={t.settings} />
      </div>
    </aside>
  );
};

// ——— Topbar ———
const Topbar = ({ view, lang, setLang, theme, setTheme, openCmdk, t }) => {
  const crumbs = useMemo(() => {
    const out = [{ label: "Trend" }];
    if (view.type === "dash") out.push({ label: t.dashboard, cur: true });
    else if (view.type === "mytasks") out.push({ label: t.myTasks, cur: true });
    else if (view.type === "workload") out.push({ label: t.workload, cur: true });
    else if (view.type === "analytics") out.push({ label: t.analytics, cur: true });
    else if (view.type === "project") {
      const p = projectById(view.id);
      out.push({ label: t.projects });
      out.push({ label: lang === "ar" ? p.name : p.en, cur: true });
    }
    return out;
  }, [view, lang]);

  return (
    <div className="topbar">
      <div className="brand">
        <div className="logo">t</div>
        <span>Trend<span style={{ color: "var(--text-3)", fontWeight: 400 }}>/PM</span></span>
      </div>
      <div className="crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={c.cur ? "cur" : ""}>{c.label}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="spacer" />
      <button className="search-pill" onClick={openCmdk}>
        <Icon name="search" size={12} />
        <span>{t.search}</span>
        <span className="spacer" />
        <span className="kbd">⌘</span><span className="kbd">K</span>
      </button>
      <button className="btn ghost icon" title={theme === "dark" ? "Light" : "Dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
      </button>
      <button className="btn ghost" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
        <Icon name="lang" size={12} /> <span className="en">{lang === "ar" ? "EN" : "AR"}</span>
      </button>
      <button className="btn ghost icon"><Icon name="bell" size={14} /></button>
      <Avatar user={userById("u2")} size="md" />
    </div>
  );
};

// ——— Command Palette ———
const CommandPalette = ({ open, onClose, onGo, lang, t }) => {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef();

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 10); setQ(""); setSel(0); }
  }, [open]);

  const items = useMemo(() => {
    const nav = [
      { g: lang === "ar" ? "الانتقال" : "Go to", label: t.dashboard, action: () => onGo({ type: "dash" }), kbd: "G D" },
      { g: lang === "ar" ? "الانتقال" : "Go to", label: t.myTasks, action: () => onGo({ type: "mytasks" }), kbd: "G M" },
      { g: lang === "ar" ? "الانتقال" : "Go to", label: t.workload, action: () => onGo({ type: "workload" }), kbd: "G W" },
      { g: lang === "ar" ? "الانتقال" : "Go to", label: t.analytics, action: () => onGo({ type: "analytics" }), kbd: "G A" },
    ];
    const projs = PROJECTS.map(p => ({
      g: lang === "ar" ? "المشاريع" : "Projects",
      label: (lang === "ar" ? p.name : p.en),
      color: p.color,
      action: () => onGo({ type: "project", id: p.id, sub: "board" }),
      kbd: p.key,
    }));
    const tasks = TASKS.slice(0, 20).map(tk => ({
      g: lang === "ar" ? "المهام" : "Tasks",
      label: tk.title,
      kbd: tk.id,
      action: () => onGo({ type: "project", id: tk.projectId, sub: "board", taskId: tk.id }),
    }));
    const actions = [
      { g: lang === "ar" ? "إجراءات" : "Actions", label: t.newTask, kbd: "C T", action: () => {} },
      { g: lang === "ar" ? "إجراءات" : "Actions", label: t.newProject, kbd: "C P", action: () => {} },
      { g: lang === "ar" ? "إجراءات" : "Actions", label: lang === "ar" ? "تبديل الوضع الداكن" : "Toggle dark mode", kbd: "⌘ \\", action: () => {} },
    ];
    const all = [...nav, ...projs, ...tasks, ...actions];
    if (!q.trim()) return all;
    const Q = q.toLowerCase();
    return all.filter(x => x.label.toLowerCase().includes(Q) || (x.kbd || "").toLowerCase().includes(Q));
  }, [q, lang]);

  const grouped = useMemo(() => {
    const g = {};
    items.forEach((it, i) => { (g[it.g] ||= []).push({ ...it, _i: i }); });
    return g;
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(items.length - 1, s + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); const it = items[sel]; if (it) { it.action(); onClose(); } }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, items, sel]);

  if (!open) return null;
  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <input ref={inputRef} className="cmdk-input" placeholder={lang === "ar" ? "اكتب أمراً أو ابحث…" : "Type a command or search…"} value={q} onChange={e => { setQ(e.target.value); setSel(0); }} />
        <div className="cmdk-list">
          {items.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)" }}>{t.noResults}</div>}
          {Object.entries(grouped).map(([g, arr]) => (
            <div key={g}>
              <div className="cmdk-group-label">{g}</div>
              {arr.map(it => (
                <div key={it._i} className={"cmdk-item" + (it._i === sel ? " active" : "")}
                     onMouseEnter={() => setSel(it._i)}
                     onClick={() => { it.action(); onClose(); }}>
                  {it.color && <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />}
                  <span className="truncate">{it.label}</span>
                  {it.kbd && <span className="tail">{it.kbd}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ——— Tweaks Panel ———
const Tweaks = ({ open, lang, setLang, theme, setTheme, accent, setAccent, font, setFont }) => {
  if (!open) return null;
  const accents = [
    { h: 162, name: "Emerald" },
    { h: 250, name: "Indigo" },
    { h: 30, name: "Amber" },
    { h: 350, name: "Rose" },
    { h: 210, name: "Sky" },
  ];
  return (
    <div className="tweaks">
      <div className="tweaks-head">Tweaks</div>
      <div className="tweaks-body">
        <div className="tw-row">
          <span className="k">Accent</span>
          <div className="tw-swatches">
            {accents.map(a => (
              <button key={a.h} className={"tw-sw" + (a.h === accent ? " active" : "")}
                      style={{ background: `oklch(0.72 0.14 ${a.h})` }}
                      onClick={() => setAccent(a.h)} title={a.name} />
            ))}
          </div>
        </div>
        <div className="tw-row">
          <span className="k">Theme</span>
          <div className="tw-seg">
            <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>Dark</button>
            <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>Light</button>
          </div>
        </div>
        <div className="tw-row">
          <span className="k">Direction</span>
          <div className="tw-seg">
            <button className={lang === "ar" ? "active" : ""} onClick={() => setLang("ar")}>RTL · AR</button>
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>LTR · EN</button>
          </div>
        </div>
        <div className="tw-row">
          <span className="k">Font</span>
          <div className="tw-seg">
            <button className={font === "plex" ? "active" : ""} onClick={() => setFont("plex")}>Plex</button>
            <button className={font === "readex" ? "active" : ""} onClick={() => setFont("readex")}>Readex</button>
            <button className={font === "cairo" ? "active" : ""} onClick={() => setFont("cairo")}>Cairo</button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Sidebar, Topbar, CommandPalette, Tweaks });
