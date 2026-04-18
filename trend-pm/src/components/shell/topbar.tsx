"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { Avatar, type AvatarUser } from "@/components/primitives";
import { setLocaleAction, setThemeAction } from "@/app/actions/preferences";
import type { Dictionary, Locale } from "@/lib/i18n";

type Crumb = { label: string; href?: string; current?: boolean };

export default function Topbar({
  locale,
  theme,
  dict,
  currentUser,
  crumbs,
}: {
  locale: Locale;
  theme: "dark" | "light";
  dict: Dictionary;
  currentUser: AvatarUser;
  crumbs: Crumb[];
}) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    startTransition(() => setThemeAction(next));
  };

  const toggleLocale = () => {
    const next: Locale = locale === "ar" ? "en" : "ar";
    startTransition(() => setLocaleAction(next));
  };

  const finalCrumbs: Crumb[] = crumbs.length
    ? crumbs
    : [{ label: "Trend" }, { label: pageLabel(pathname, dict), current: true }];

  return (
    <div className="topbar">
      <div className="brand">
        <div className="logo">t</div>
        <span>
          Trend
          <span style={{ color: "var(--text-3)", fontWeight: 400 }}>/PM</span>
        </span>
      </div>
      <div className="crumb">
        {finalCrumbs.map((c, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span className="sep">/</span>}
            <span className={c.current ? "cur" : ""}>{c.label}</span>
          </span>
        ))}
      </div>
      <div className="spacer" />
      <button className="search-pill" type="button">
        <Icon name="search" size={12} />
        <span>{dict.search}</span>
        <span className="spacer" />
        <span className="kbd">⌘</span>
        <span className="kbd">K</span>
      </button>
      <button
        className="btn ghost icon"
        type="button"
        onClick={toggleTheme}
        disabled={isPending}
        title={theme === "dark" ? "Light" : "Dark"}
        aria-label="Toggle theme"
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
      </button>
      <button
        className="btn ghost"
        type="button"
        onClick={toggleLocale}
        disabled={isPending}
        aria-label="Toggle language"
      >
        <Icon name="lang" size={12} />{" "}
        <span className="en">{locale === "ar" ? "EN" : "AR"}</span>
      </button>
      <button className="btn ghost icon" type="button" aria-label="Notifications">
        <Icon name="bell" size={14} />
      </button>
      <Avatar user={currentUser} size="md" />
    </div>
  );
}

function pageLabel(pathname: string | null, dict: Dictionary): string {
  if (!pathname) return dict.dashboard;
  if (pathname.startsWith("/dashboard")) return dict.dashboard;
  if (pathname.startsWith("/my-tasks")) return dict.myTasks;
  if (pathname.startsWith("/workload")) return dict.workload;
  if (pathname.startsWith("/analytics")) return dict.analytics;
  if (pathname.startsWith("/projects")) return dict.projects;
  if (pathname.startsWith("/settings")) return dict.settings;
  return dict.dashboard;
}
