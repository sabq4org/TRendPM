"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";
import type { Dictionary } from "@/lib/i18n";

export type SidebarProject = {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  color: string | null;
  openTasks: number;
};

export type SidebarTeam = {
  id: string;
  name: string;
  memberCount: number;
};

function Item({
  href,
  icon,
  label,
  tail,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  tail?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link href={href} className={`sb-item ${active ? "active" : ""}`}>
      <Icon name={icon} />
      <span className="truncate">{label}</span>
      {tail != null && <span className="tail">{tail}</span>}
    </Link>
  );
}

export default function Sidebar({
  locale,
  dict,
  projects,
  teams,
  myTasksCount,
}: {
  locale: "ar" | "en";
  dict: Dictionary;
  projects: SidebarProject[];
  teams: SidebarTeam[];
  myTasksCount: number;
}) {
  const pathname = usePathname() || "/";
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sidebar">
      <div className="sb-section">
        <Item
          href="/dashboard"
          icon="dashboard"
          label={dict.dashboard}
          active={isActive("/dashboard")}
        />
        <Item href="/my-tasks" icon="tasks" label={dict.myTasks} tail={myTasksCount} active={isActive("/my-tasks")} />
        <Item href="/workload" icon="workload" label={dict.workload} active={isActive("/workload")} />
        <Item href="/analytics" icon="analytics" label={dict.analytics} active={isActive("/analytics")} />
      </div>

      <div className="sb-section">
        <div className="sb-head">
          <span>{dict.projects}</span>
          <Link href="/projects" className="sb-add" aria-label={dict.projects}>
            <Icon name="plus" size={10} />
          </Link>
        </div>
        {projects.length === 0 && (
          <Link href="/projects" className="sb-item muted">
            <Icon name="project" />
            <span className="truncate">
              {locale === "ar" ? "إنشاء مشروع" : "Create project"}
            </span>
          </Link>
        )}
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className={`sb-item ${isActive(`/projects/${p.id}`) ? "active" : ""}`}
          >
            <span
              className="sb-proj-dot"
              style={{ background: p.color ?? "var(--text-3)" }}
            />
            <span className="truncate">{locale === "ar" ? p.name : p.nameEn ?? p.name}</span>
            <span className="tail">{p.openTasks}</span>
          </Link>
        ))}
      </div>

      <div className="sb-section">
        <div className="sb-head">
          <span>{dict.teams}</span>
          <Link
            href="/settings/teams"
            className="sb-add"
            aria-label={locale === "ar" ? "إدارة الفرق" : "Manage teams"}
            title={locale === "ar" ? "إدارة الفرق" : "Manage teams"}
          >
            <Icon name="plus" size={10} />
          </Link>
        </div>
        {teams.length === 0 ? (
          <Link href="/settings/teams" className="sb-item muted">
            <Icon name="team" />
            <span className="truncate">
              {locale === "ar" ? "إنشاء فريق" : "Create team"}
            </span>
          </Link>
        ) : (
          teams.map((t) => (
            <Link
              key={t.id}
              href="/settings/teams"
              className="sb-item"
            >
              <Icon name="team" />
              <span className="truncate">{t.name}</span>
              <span className="tail">{t.memberCount}</span>
            </Link>
          ))
        )}
      </div>

      <div className="sb-section">
        <Item href="/settings" icon="settings" label={dict.settings} active={isActive("/settings")} />
      </div>
    </aside>
  );
}
