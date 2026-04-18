import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { TaskPriority, TaskStatus } from "@/lib/db/schema";

export type AvatarUser = {
  id: string;
  name: string;
  nameEn?: string | null;
  initials?: string | null;
  hue?: number | null;
};

export function Avatar({
  user,
  size = "sm",
  className,
}: {
  user?: AvatarUser | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (!user) return null;
  const hue = user.hue ?? 180;
  const cls = size === "lg" ? "avatar lg" : size === "md" ? "avatar md" : "avatar";
  const bg = `oklch(0.28 0.06 ${hue})`;
  const fg = `oklch(0.85 0.08 ${hue})`;
  const initials = user.initials || user.name.slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(cls, className)}
      style={{ background: bg, color: fg, borderColor: `oklch(0.35 0.06 ${hue})` }}
      title={user.name}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 3,
  size = "sm",
}: {
  users: (AvatarUser | null | undefined)[];
  max?: number;
  size?: "sm" | "md" | "lg";
}) {
  const filtered = users.filter(Boolean) as AvatarUser[];
  const shown = filtered.slice(0, max);
  const more = filtered.length - shown.length;
  const cls = size === "lg" ? "avatar lg" : size === "md" ? "avatar md" : "avatar";
  return (
    <span className="avatar-stack">
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size={size} />
      ))}
      {more > 0 && <span className={cls}>+{more}</span>}
    </span>
  );
}

const STATUS_DOT_CLS: Record<TaskStatus, string> = {
  todo: "todo",
  in_progress: "progress",
  in_review: "review",
  blocked: "blocked",
  done: "done",
};

export function StatusDot({ s }: { s: TaskStatus }) {
  return <span className={`sdot ${STATUS_DOT_CLS[s] ?? "todo"}`} />;
}

const PRIORITY_DOT_CLS: Record<TaskPriority, string> = {
  low: "low",
  medium: "med",
  high: "high",
  critical: "crit",
};

export function PriorityDot({ p }: { p: TaskPriority }) {
  return <span className={`pdot ${PRIORITY_DOT_CLS[p] ?? "low"}`} />;
}

export function PriorityFlag({ p }: { p: TaskPriority }) {
  const color =
    p === "critical"
      ? "var(--p-crit)"
      : p === "high"
        ? "var(--p-high)"
        : p === "medium"
          ? "var(--p-med)"
          : "var(--p-low)";
  return <Icon name="flag" size={12} style={{ color }} />;
}

export function Progress({ value, thin, style }: { value: number; thin?: boolean; style?: CSSProperties }) {
  return (
    <span className={cn("progress", thin && "thin")} title={`${value}%`} style={style}>
      <i style={{ width: `${value}%` }} />
    </span>
  );
}

export function Chip({
  children,
  accent,
  style,
  className,
}: {
  children: React.ReactNode;
  accent?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span className={cn("chip", accent && "accent", className)} style={style}>
      {children}
    </span>
  );
}
