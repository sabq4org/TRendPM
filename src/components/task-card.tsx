import Link from "next/link";
import { AvatarStack, PriorityFlag, StatusDot, type AvatarUser } from "./primitives";
import { Icon } from "./icon";
import { formatShortDate, isLate } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/lib/db/schema";

export type TaskCardData = {
  id: string;
  code: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  progress: number;
  tags: string[];
  assignees: AvatarUser[];
  estimatedHours: string | null;
};

export function TaskCard({ task, href }: { task: TaskCardData; href?: string }) {
  const late = isLate({ status: task.status, dueDate: task.dueDate });
  const content = (
    <>
      <div className="tcard-head">
        <span className="mono">{task.code}</span>
        <PriorityFlag p={task.priority} />
        <span className="tail">
          {task.tags?.slice(0, 1).map((tag) => (
            <span key={tag} className="chip" style={{ height: 16, fontSize: 10 }}>
              #{tag}
            </span>
          ))}
        </span>
      </div>
      <div className="tcard-title">{task.title}</div>
      <div className="tcard-meta">
        <StatusDot s={task.status} />
        {task.dueDate && (
          <span
            className="mono"
            style={{
              color: late ? "var(--s-late)" : "var(--text-3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Icon name="calendar" size={10} /> {formatShortDate(task.dueDate)}
          </span>
        )}
        <span className="tail">
          {task.estimatedHours && (
            <span
              className="mono"
              style={{ fontSize: 10, color: "var(--text-4)" }}
            >
              {task.estimatedHours}h
            </span>
          )}
          <AvatarStack users={task.assignees} max={3} />
        </span>
      </div>
    </>
  );

  return href ? (
    <Link href={href} className="tcard" style={{ textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    <div className="tcard">{content}</div>
  );
}
