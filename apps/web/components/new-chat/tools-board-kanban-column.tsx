"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  PencilLine,
  Pin,
  UserRound,
  X,
} from "lucide-react";
import {
  type ConversationBoardColumn,
  type ConversationTaskPriority,
  type ConversationTaskStatus,
  type ConversationToolTask,
} from "../../lib/api-client";

type BoardKanbanColumnProps = {
  column: ConversationBoardColumn;
  tasks: ConversationToolTask[];
  dragEnabled: boolean;
  collapsed: boolean;
  canManage: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onTaskOpen: (task: ConversationToolTask) => void;
  onTaskDragStart: (taskId: string) => void;
  onTaskDrop: (columnId: string, targetIndex: number) => void;
  onColumnDrop: (columnId: string) => void;
  onToggleCollapse: (columnId: string) => void;
  onMoveLeft: (columnId: string) => void;
  onMoveRight: (columnId: string) => void;
  onUpdateColumn: (
    columnId: string,
    input: {
      title?: string;
      color?: string;
      taskStatus?: ConversationTaskStatus;
    },
  ) => void;
};

export function BoardKanbanColumn({
  column,
  tasks,
  dragEnabled,
  collapsed,
  canManage,
  canMoveLeft,
  canMoveRight,
  onTaskOpen,
  onTaskDragStart,
  onTaskDrop,
  onColumnDrop,
  onToggleCollapse,
  onMoveLeft,
  onMoveRight,
  onUpdateColumn,
}: BoardKanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);
  const [draftColor, setDraftColor] = useState(column.color ?? "");
  const [draftStatus, setDraftStatus] = useState(column.taskStatus);

  useEffect(() => {
    setDraftTitle(column.title);
    setDraftColor(column.color ?? "");
    setDraftStatus(column.taskStatus);
    setIsEditing(false);
  }, [column.color, column.id, column.taskStatus, column.title]);

  if (collapsed) {
    return (
      <section
        className="flex h-full min-h-[520px] w-[72px] min-w-[72px] snap-start flex-col rounded-[24px] border border-charcoal/10 bg-[#f7f8fb] shadow-[0_10px_24px_rgba(24,18,15,0.05)]"
        onDragOver={(event) => {
          if (dragEnabled) {
            event.preventDefault();
          }
        }}
        onDrop={() => {
          if (dragEnabled) {
            onColumnDrop(column.id);
          }
        }}
      >
        <button
          className="flex h-full flex-col items-center justify-between gap-4 px-3 py-4 text-charcoal"
          onClick={() => onToggleCollapse(column.id)}
          type="button"
        >
          <div className="flex flex-col items-center gap-4">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: column.color || "#d7c79e" }}
            />
            <span
              className="text-center text-[11px] font-semibold leading-4 tracking-[0.04em]"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {column.title}
            </span>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-graphite/72">
            {tasks.length}
          </span>
          <ChevronRight className="h-4 w-4 text-graphite/52" />
        </button>
      </section>
    );
  }

  return (
    <section
      className="flex min-h-[520px] min-w-[224px] snap-start flex-col rounded-[24px] border border-charcoal/10 bg-[#f7f8fb] shadow-[0_10px_24px_rgba(24,18,15,0.05)]"
      onDragOver={(event) => {
        if (dragEnabled) {
          event.preventDefault();
        }
      }}
      onDrop={() => {
        if (dragEnabled) {
          onColumnDrop(column.id);
        }
      }}
    >
      <header className="border-b border-charcoal/10 px-3.5 py-3.5">
        {isEditing ? (
          <div className="space-y-2.5">
            <input
              className="w-full rounded-[16px] border border-charcoal/10 bg-white px-3 py-2 text-sm font-semibold outline-none"
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Column title"
              value={draftTitle}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="w-full rounded-[16px] border border-charcoal/10 bg-white px-3 py-2 text-sm outline-none"
                onChange={(event) => setDraftColor(event.target.value)}
                placeholder="Accent color"
                value={draftColor}
              />
              <select
                className="w-full rounded-[16px] border border-charcoal/10 bg-white px-3 py-2 text-sm outline-none"
                onChange={(event) =>
                  setDraftStatus(event.target.value as ConversationTaskStatus)
                }
                value={draftStatus}
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-graphite/72">
                {tasks.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-8 w-8 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/68 transition hover:text-charcoal"
                  onClick={() => {
                    setDraftTitle(column.title);
                    setDraftColor(column.color ?? "");
                    setDraftStatus(column.taskStatus);
                    setIsEditing(false);
                  }}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  className="grid h-8 w-8 place-items-center rounded-full bg-charcoal text-cloud transition hover:bg-charcoal/90"
                  onClick={() => {
                    onUpdateColumn(column.id, {
                      title: draftTitle,
                      color: draftColor.trim() || undefined,
                      taskStatus: draftStatus,
                    });
                    setIsEditing(false);
                  }}
                  type="button"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: column.color || "#d7c79e" }}
              />
              <h4 className="text-[15px] font-semibold text-charcoal">
                {column.title}
              </h4>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-graphite/72">
                {tasks.length}
              </span>
              {canManage ? (
                <>
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/68 transition hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canMoveLeft}
                    onClick={() => onMoveLeft(column.id)}
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/68 transition hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canMoveRight}
                    onClick={() => onMoveRight(column.id)}
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/68 transition hover:text-charcoal"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                </>
              ) : null}
              <button
                className="grid h-8 w-8 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/68 transition hover:text-charcoal"
                onClick={() => onToggleCollapse(column.id)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex min-h-[380px] flex-1 flex-col gap-2.5 p-3.5">
        {tasks.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-charcoal/10 bg-white px-4 py-5 text-sm leading-7 text-graphite/62">
            Drop work here or create a new task in this lane.
          </div>
        ) : (
          tasks.map((task, index) => (
            <article
              className="cursor-pointer rounded-[18px] border border-charcoal/10 bg-white p-2.5 shadow-[0_8px_18px_rgba(20,18,15,0.04)] transition hover:shadow-[0_12px_24px_rgba(20,18,15,0.08)]"
              draggable={dragEnabled}
              key={task.id}
              onClick={() => onTaskOpen(task)}
              onDragOver={(event) => {
                if (dragEnabled) {
                  event.preventDefault();
                }
              }}
              onDragStart={() => {
                if (dragEnabled) {
                  onTaskDragStart(task.id);
                }
              }}
              onDrop={() => {
                if (dragEnabled) {
                  onTaskDrop(column.id, index);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#eef0f6] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-graphite/72">
                      {task.taskType.replace("_", " ")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${priorityTone(task.priority)}`}
                    >
                      {task.priority}
                    </span>
                  {task.storyPoints ? (
                    <span className="rounded-full bg-[#fff1da] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6221]">
                      {task.storyPoints}pt
                    </span>
                  ) : null}
                </div>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7e74ff]">
                    {task.id.slice(0, 8)}
                  </p>
                  <h5 className="mt-1 line-clamp-2 text-[14px] font-semibold leading-5 text-charcoal">
                    {task.title}
                  </h5>
                </div>
                <div className="flex items-center gap-2">
                  {task.pinned ? (
                    <Pin className="h-4 w-4 text-[#d28b1d]" />
                  ) : null}
                  {dragEnabled ? (
                    <GripVertical className="h-4 w-4 text-graphite/35" />
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-graphite/62">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6f4ef] px-2.5 py-1">
                  <UserRound className="h-3.5 w-3.5" />
                  {task.assignedTo ? task.assignedTo.displayName : "Unassigned"}
                </span>
                {task.dueAt ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7de] px-2.5 py-1 text-[#7a6024]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatWhen(task.dueAt)}
                  </span>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function priorityTone(priority: ConversationTaskPriority) {
  switch (priority) {
    case "CRITICAL":
      return "bg-[#ffe9e6] text-[#a13a27]";
    case "HIGH":
      return "bg-[#fff1da] text-[#8c6221]";
    case "LOW":
      return "bg-[#eef7ea] text-[#24613a]";
    default:
      return "bg-[#eef0f6] text-graphite/72";
  }
}

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
