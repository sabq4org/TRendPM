/* global React, ReactDOM, Sidebar, Topbar, CommandPalette, Tweaks, Dashboard, ProjectHeader, KanbanView, ListView, GanttView, CalendarView, TaskPanel, WorkloadView, MyTasksView, AnalyticsView, TASKS, T_AR, T_EN, projectById */

const { useState, useEffect, useMemo } = React;

const LS_KEY = "trendpm.state";

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": 162,
  "theme": "dark",
  "lang": "ar",
  "font": "plex"
}/*EDITMODE-END*/;

function App() {
  // Load persisted state
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } })();
  const [lang, setLang] = useState(saved.lang || TWEAK_DEFAULTS.lang);
  const [theme, setTheme] = useState(saved.theme || TWEAK_DEFAULTS.theme);
  const [accent, setAccent] = useState(saved.accent ?? TWEAK_DEFAULTS.accent);
  const [font, setFont] = useState(saved.font || TWEAK_DEFAULTS.font);
  const [view, setView] = useState(saved.view || { type: "dash" });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [taskOverrides, setTaskOverrides] = useState(saved.taskOverrides || {});
  const [boardFilter, setBoardFilter] = useState("");

  const t = lang === "ar" ? T_AR : T_EN;

  // Persist
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ lang, theme, accent, font, view, taskOverrides }));
  }, [lang, theme, accent, font, view, taskOverrides]);

  // Apply theme / dir / accent
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.style.setProperty("--accent-h", accent);
    const fontMap = {
      plex: { ar: '"IBM Plex Sans Arabic", system-ui, sans-serif', en: '"IBM Plex Sans", system-ui, sans-serif' },
      readex: { ar: '"Readex Pro", system-ui, sans-serif', en: '"Inter", system-ui, sans-serif' },
      cairo: { ar: '"Cairo", system-ui, sans-serif', en: '"Inter", system-ui, sans-serif' },
    };
    document.documentElement.style.setProperty("--font-ar", fontMap[font].ar);
    document.documentElement.style.setProperty("--font-en", fontMap[font].en);
  }, [theme, lang, accent, font]);

  // Tweaks host protocol
  useEffect(() => {
    const h = (e) => {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode") setTweaksOpen(true);
      else if (d.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", h);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", h);
  }, []);

  const pushTweak = (edits) => {
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdkOpen(true); }
      else if (e.key === "Escape") { setOpenTaskId(null); }
      else if (e.key === "g" && !e.target.closest("input,textarea")) { window._gPending = true; setTimeout(() => { window._gPending = false; }, 800); }
      else if (window._gPending && !e.target.closest("input,textarea")) {
        const k = e.key.toLowerCase();
        window._gPending = false;
        if (k === "d") setView({ type: "dash" });
        else if (k === "m") setView({ type: "mytasks" });
        else if (k === "w") setView({ type: "workload" });
        else if (k === "a") setView({ type: "analytics" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Task ops
  const allTasks = useMemo(() => {
    return TASKS.map(t => taskOverrides[t.id] ? { ...t, ...taskOverrides[t.id] } : t);
  }, [taskOverrides]);

  // Patch the global TASKS reference lookup via the same array (simpler: override via rebuild)
  // Since our components read window.TASKS directly, we mutate on change.
  useEffect(() => {
    allTasks.forEach(at => {
      const orig = TASKS.find(x => x.id === at.id);
      if (orig) Object.assign(orig, at);
    });
  }, [allTasks]);

  const onChangeStatus = (taskId, newStatus) => {
    setTaskOverrides(o => ({ ...o, [taskId]: { ...(o[taskId] || {}), status: newStatus, progress: newStatus === "done" ? 100 : (o[taskId]?.progress ?? undefined) } }));
  };

  const onMoveTask = (taskId, newStatus) => onChangeStatus(taskId, newStatus);

  const openTask = (id) => setOpenTaskId(id);
  const currentTask = openTaskId ? TASKS.find(x => x.id === openTaskId) : null;

  // Render view
  const renderView = () => {
    if (view.type === "dash") return <Dashboard lang={lang} t={t} setView={setView} openTask={openTask} />;
    if (view.type === "mytasks") return <MyTasksView lang={lang} t={t} openTask={openTask} onChangeStatus={onChangeStatus} />;
    if (view.type === "workload") return <WorkloadView lang={lang} t={t} openTask={openTask} />;
    if (view.type === "analytics") return <AnalyticsView lang={lang} t={t} />;
    if (view.type === "project") {
      const p = projectById(view.id);
      if (!p) return null;
      const sub = view.sub || "board";
      return (
        <>
          <ProjectHeader p={p} sub={sub} setSub={(s) => setView({ ...view, sub: s })} lang={lang} t={t} filter={boardFilter} setFilter={setBoardFilter} />
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {sub === "board" && <KanbanView p={p} lang={lang} t={t} filter={boardFilter} openTask={openTask} onMove={onMoveTask} />}
            {sub === "list" && <ListView p={p} lang={lang} t={t} filter={boardFilter} openTask={openTask} onChangeStatus={onChangeStatus} />}
            {sub === "gantt" && <GanttView p={p} lang={lang} t={t} openTask={openTask} />}
            {sub === "calendar" && <CalendarView p={p} lang={lang} t={t} openTask={openTask} />}
          </div>
        </>
      );
    }
  };

  return (
    <div className="app">
      <Topbar view={view} lang={lang} setLang={(l) => { setLang(l); pushTweak({ lang: l }); }} theme={theme} setTheme={(x) => { setTheme(x); pushTweak({ theme: x }); }} openCmdk={() => setCmdkOpen(true)} t={t} />
      <Sidebar view={view} setView={setView} lang={lang} t={t} />
      <main className="main" style={{ position: "relative" }}>
        {renderView()}
        {currentTask && <TaskPanel task={currentTask} onClose={() => setOpenTaskId(null)} lang={lang} t={t} onChangeStatus={onChangeStatus} />}
      </main>
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} onGo={setView} lang={lang} t={t} />
      <Tweaks open={tweaksOpen}
              lang={lang} setLang={(l) => { setLang(l); pushTweak({ lang: l }); }}
              theme={theme} setTheme={(x) => { setTheme(x); pushTweak({ theme: x }); }}
              accent={accent} setAccent={(a) => { setAccent(a); pushTweak({ accent: a }); }}
              font={font} setFont={(f) => { setFont(f); pushTweak({ font: f }); }} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
