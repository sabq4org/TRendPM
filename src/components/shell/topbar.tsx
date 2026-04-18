"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
  currentUser: AvatarUser & { email?: string };
  crumbs: Crumb[];
}) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

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
      <div ref={userMenuRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="avatar-btn"
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
          aria-label={currentUser.name}
          style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
        >
          <Avatar user={currentUser} size="md" />
        </button>
        {userMenuOpen && (
          <div className="user-menu" role="menu">
            <div className="user-menu-head">
              <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
              {currentUser.email && (
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-3)" }}>
                  {currentUser.email}
                </div>
              )}
            </div>
            <Link
              href="/settings"
              role="menuitem"
              className="user-menu-item"
              onClick={() => setUserMenuOpen(false)}
            >
              <Icon name="settings" size={12} />
              <span>{locale === "ar" ? "الإعدادات" : "Settings"}</span>
            </Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit" role="menuitem" className="user-menu-item danger">
                <Icon name="logout" size={12} />
                <span>{locale === "ar" ? "تسجيل الخروج" : "Sign out"}</span>
              </button>
            </form>
          </div>
        )}
      </div>
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
