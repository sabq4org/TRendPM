/* global React */
// Trend PM — atoms & utilities

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ——— ICONS (stroke-based, 14px) ———
const Icon = ({ name, size = 14, style = {} }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", style };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
    project: <><path d="M3 7h18"/><path d="M5 7v12a2 2 0 002 2h10a2 2 0 002-2V7"/><path d="M9 3h6v4H9z"/></>,
    tasks: <><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></>,
    workload: <><path d="M3 3v18h18"/><rect x="6" y="10" width="3" height="8"/><rect x="11" y="6" width="3" height="12"/><rect x="16" y="13" width="3" height="5"/></>,
    team: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="7" r="2.5"/><path d="M15 20c0-2 2-4 5-4"/></>,
    analytics: <><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></>,
    inbox: <><path d="M3 13l3-9h12l3 9"/><path d="M3 13v6a2 2 0 002 2h14a2 2 0 002-2v-6"/><path d="M3 13h5l1 2h6l1-2h5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12l2-1-1-3-2 .5M5 12l-2-1 1-3 2 .5M12 5l1-2h-2l-1 2M12 19l1 2h-2l-1-2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    filter: <><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/></>,
    sort: <><path d="M6 4v16M6 20l-3-3M6 20l3-3M18 20V4M18 4l-3 3M18 4l3 3"/></>,
    chevron: <><path d="M9 6l6 6-6 6"/></>,
    chevDown: <><path d="M6 9l6 6 6-6"/></>,
    chevLeft: <><path d="M15 6l-6 6 6 6"/></>,
    chevRight: <><path d="M9 6l6 6-6 6"/></>,
    close: <><path d="M6 6l12 12M18 6L6 18"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    moreV: <><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    comment: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
    paperclip: <><path d="M21 12l-8.5 8.5a5 5 0 01-7-7L14 5a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 8"/></>,
    link: <><path d="M10 14a5 5 0 017 0l3-3a5 5 0 00-7-7l-2 2"/><path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l2-2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    flag: <><path d="M5 21V4h14l-3 5 3 5H5"/></>,
    check: <><path d="M5 12l5 5L20 7"/></>,
    dots: <><circle cx="12" cy="12" r="9"/></>,
    moon: <><path d="M20 15a8 8 0 01-11-11 8 8 0 1011 11z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></>,
    bell: <><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16z"/><path d="M10 21a2 2 0 004 0"/></>,
    kanban: <><rect x="3" y="4" width="6" height="16"/><rect x="11" y="4" width="6" height="10"/><rect x="19" y="4" width="2" height="12"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
    gantt: <><path d="M3 6h7M3 12h12M3 18h9"/><circle cx="4" cy="6" r="0.5"/></>,
    arrowRight: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    alert: <><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v5M12 17v.5"/></>,
    archive: <><rect x="3" y="4" width="18" height="4"/><path d="M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8M10 12h4"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></>,
    lang: <><path d="M3 5h10M7 3v2M5 5c0 4 3 8 8 10M13 5c0 4-3 8-8 10"/><path d="M13 19l4-8 4 8M14.5 16h5"/></>,
    zap: <><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></>,
    tag: <><path d="M20 12l-8 8-8-8V4h8z"/><circle cx="8" cy="8" r="1"/></>,
    trend: <><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></>,
    command: <><path d="M9 3a3 3 0 100 6h6a3 3 0 100-6v12a3 3 0 11-6 0V9a3 3 0 11-6 0 3 3 0 106 0"/></>,
  };
  return <svg {...common}>{paths[name] || paths.dots}</svg>;
};

// ——— Avatar ———
const Avatar = ({ user, size = "sm" }) => {
  if (!user) return null;
  const cls = size === "lg" ? "avatar lg" : size === "md" ? "avatar md" : "avatar";
  const bg = `oklch(0.28 0.06 ${user.hue})`;
  const fg = `oklch(0.85 0.08 ${user.hue})`;
  return (
    <span className={cls} style={{ background: bg, color: fg, borderColor: `oklch(0.35 0.06 ${user.hue})` }} title={user.name}>
      {user.initials}
    </span>
  );
};

const AvatarStack = ({ users, max = 3, size = "sm" }) => {
  const shown = users.slice(0, max);
  const more = users.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map(u => <Avatar key={u.id} user={u} size={size} />)}
      {more > 0 && <span className={size === "lg" ? "avatar lg" : size === "md" ? "avatar md" : "avatar"}>+{more}</span>}
    </span>
  );
};

// ——— Status dot ———
const StatusDot = ({ s }) => <span className={"sdot " + s} />;
const PriorityDot = ({ p }) => <span className={"pdot " + p} />;

const PriorityFlag = ({ p }) => {
  const color = p === "crit" ? "var(--p-crit)" : p === "high" ? "var(--p-high)" : p === "med" ? "var(--p-med)" : "var(--p-low)";
  return <Icon name="flag" size={12} style={{ color }} />;
};

// ——— Progress bar ———
const Progress = ({ value, thin }) => (
  <span className={"progress" + (thin ? " thin" : "")} title={value + "%"}>
    <i style={{ width: value + "%" }} />
  </span>
);

// ——— Date helpers ———
const D = (s) => new Date(s);
const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 86400000);
const isLate = (task) => task.status !== "done" && task.due && daysBetween(TODAY.toISOString().slice(0,10), task.due) < 0;
const lateDays = (task) => -daysBetween(TODAY.toISOString().slice(0,10), task.due);
const formatDate = (s, lang = "ar") => {
  if (!s) return "—";
  const d = D(s);
  const T = lang === "ar" ? T_AR : T_EN;
  return `${d.getDate()} ${T.months[d.getMonth()]}`;
};
const formatShort = (s) => {
  if (!s) return "—";
  const d = D(s);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`;
};

// ——— Lookups ———
const userById = (id) => TEAM.find(u => u.id === id);
const projectById = (id) => PROJECTS.find(p => p.id === id);
const tasksOf = (pid) => TASKS.filter(t => t.projectId === pid);

// ——— Click-outside hook ———
function useClickOutside(ref, onOut) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
}

Object.assign(window, { Icon, Avatar, AvatarStack, StatusDot, PriorityDot, PriorityFlag, Progress, D, daysBetween, isLate, lateDays, formatDate, formatShort, userById, projectById, tasksOf, useClickOutside });
