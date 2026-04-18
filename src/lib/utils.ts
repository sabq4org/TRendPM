import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatShortDate(s: string | Date | null | undefined): string {
  if (!s) return "—";
  const d = typeof s === "string" ? new Date(s) : s;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(s: string | Date | null | undefined, months: string[]): string {
  if (!s) return "—";
  const d = typeof s === "string" ? new Date(s) : s;
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string | Date, b: string | Date): number {
  const da = typeof a === "string" ? new Date(a) : a;
  const dbb = typeof b === "string" ? new Date(b) : b;
  return Math.round((dbb.getTime() - da.getTime()) / 86_400_000);
}

export const TODAY = new Date("2026-04-16");

export function isLate(task: {
  status: string;
  dueDate: string | Date | null;
}): boolean {
  if (task.status === "done" || !task.dueDate) return false;
  return daysBetween(toIsoDate(TODAY), task.dueDate) < 0;
}

export function lateDays(task: { dueDate: string | Date | null }): number {
  if (!task.dueDate) return 0;
  return -daysBetween(toIsoDate(TODAY), task.dueDate);
}
