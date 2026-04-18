"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { moveTask } from "@/app/actions/tasks";
import { TaskCard, type TaskCardData } from "./task-card";
import { TASK_STATUSES, type TaskStatus } from "@/lib/db/schema";
import type { Dictionary } from "@/lib/i18n";

type Columns = Record<TaskStatus, TaskCardData[]>;

function groupByStatus(tasks: TaskCardData[]): Columns {
  const out: Columns = {
    todo: [],
    in_progress: [],
    in_review: [],
    blocked: [],
    done: [],
  };
  for (const t of tasks) out[t.status].push(t);
  return out;
}

function DraggableCard({
  task,
  href,
}: {
  task: TaskCardData;
  href: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, data: { status: task.status } });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "dragging" : ""}
    >
      <TaskCard task={task} href={href} />
    </div>
  );
}

function Column({
  status,
  tasks,
  dict,
  projectId,
}: {
  status: TaskStatus;
  tasks: TaskCardData[];
  dict: Dictionary;
  projectId: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `col:${status}` });
  return (
    <div className="col">
      <div className="col-head">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatusLabel status={status} dict={dict} />
        </span>
        <span className="count">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`col-body ${isOver ? "drop-over" : ""}`}
      >
        {tasks.map((t) => (
          <DraggableCard
            key={t.id}
            task={t}
            href={`/projects/${projectId}/board?task=${t.id}`}
          />
        ))}
        {tasks.length === 0 && (
          <div
            style={{
              padding: "12px",
              textAlign: "center",
              fontSize: "var(--fs-xs)",
              color: "var(--text-4)",
            }}
          >
            —
          </div>
        )}
      </div>
    </div>
  );
}

function StatusLabel({ status, dict }: { status: TaskStatus; dict: Dictionary }) {
  const colors: Record<TaskStatus, string> = {
    todo: "var(--s-todo)",
    in_progress: "var(--s-progress)",
    in_review: "var(--s-review)",
    blocked: "var(--s-blocked)",
    done: "var(--s-done)",
  };
  return (
    <>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 2,
          background: colors[status],
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-2)", fontWeight: 500 }}>
        {dict.status[status]}
      </span>
    </>
  );
}

export default function KanbanBoard({
  projectId,
  tasks: initial,
  dict,
}: {
  projectId: string;
  tasks: TaskCardData[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [columns, setColumns] = useState<Columns>(() => groupByStatus(initial));
  const [activeId, setActiveId] = useState<string | null>(null);
  void router;
  void isPending;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const over = e.over;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("col:")) return;
    const toStatus = overId.slice(4) as TaskStatus;
    const taskId = String(e.active.id);

    let task: TaskCardData | undefined;
    for (const s of TASK_STATUSES) {
      const found = columns[s].find((t) => t.id === taskId);
      if (found) {
        task = found;
        break;
      }
    }
    if (!task || task.status === toStatus) return;

    const next: Columns = {
      todo: columns.todo.filter((t) => t.id !== taskId),
      in_progress: columns.in_progress.filter((t) => t.id !== taskId),
      in_review: columns.in_review.filter((t) => t.id !== taskId),
      blocked: columns.blocked.filter((t) => t.id !== taskId),
      done: columns.done.filter((t) => t.id !== taskId),
    };
    const moved = { ...task, status: toStatus };
    next[toStatus] = [...next[toStatus], moved];
    setColumns(next);

    startTransition(async () => {
      try {
        await moveTask({
          projectId,
          taskId,
          toStatus,
          toIndex: next[toStatus].length - 1,
        });
      } catch (err) {
        console.error("moveTask failed", err);
        setColumns(groupByStatus(initial));
      }
    });
  };

  const activeTask = activeId
    ? Object.values(columns).flat().find((t) => t.id === activeId)
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="kanban">
        {TASK_STATUSES.map((s) => (
          <Column
            key={s}
            status={s}
            tasks={columns[s]}
            dict={dict}
            projectId={projectId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div style={{ opacity: 0.9 }}>
            <TaskCard
              task={activeTask}
              href={`${pathname}?task=${activeTask.id}${
                searchParams.toString() ? `&${searchParams.toString()}` : ""
              }`}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
