"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname() ?? "";
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className={`tab ${active ? "active" : ""}`}>
      {label}
    </Link>
  );
}
