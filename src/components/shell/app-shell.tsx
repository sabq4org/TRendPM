"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

export default function AppShell({
  topbar,
  sidebar,
  children,
}: {
  topbar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="app" data-mobile-open={open ? "true" : "false"}>
      <div className="topbar-wrap">
        <button
          className="btn ghost icon mobile-menu-btn"
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} size={16} />
        </button>
        {topbar}
      </div>
      {sidebar}
      <button
        type="button"
        aria-label="Close menu"
        className="sidebar-backdrop"
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
      />
      <main className="main" style={{ position: "relative" }}>
        {children}
      </main>
    </div>
  );
}
