"use client";

import type { ReactNode } from "react";
import { CalendarDays, Layers3, Pin, UserRound } from "lucide-react";
import type { ConversationBoardColumn, ConversationToolTask } from "../../lib/api-client";

type BoardListViewItem = {
  column: ConversationBoardColumn;
  task: ConversationToolTask;
};

type BoardListViewProps = {
  items: BoardListViewItem[];
  onTaskOpen: (task: ConversationToolTask) => void;
};

export function BoardListView({ items, onTaskOpen }: BoardListViewProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[24px] border border-charcoal/10 bg-[#f7f8fb] px-5 py-6 text-sm leading-7 text-graphite/64 shadow-[0_10px_24px_rgba(24,18,15,0.04)]">
        No tasks match the current board filters.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-charcoal/10 bg-[#f7f8fb] shadow-[0_10px_24px_rgba(24,18,15,0.04)]">
      <div className="hidden grid-cols-[minmax(0,2.4fr)_150px_150px_140px_140px_140px] gap-3 border-b border-charcoal/10 bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-graphite/55 lg:grid">
        <span>Task</span>
        <span>Lane</span>
        <span>Assignee</span>
        <span>Priority</span>
        <span>Sprint</span>
        <span>Due</span>
      </div>
      <div className="divide-y divide-charcoal/10">
        {items.map(({ column, task }) => (
          <button
            className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-white lg:grid-cols-[minmax(0,2.4fr)_150px_150px_140px_140px_140px] lg:items-center"
            key={task.id}
            onClick={() => onTaskOpen(task)}
            type="button"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eef0f6] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-graphite/72">
                  {task.taskType.replace("_", " ")}
                </span>
                {task.pinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1da] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c6221]">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7e74ff]">
                {task.taskCode || task.id.slice(0, 8)}
              </p>
              <h4 className="mt-1 line-clamp-1 text-[15px] font-semibold text-charcoal">
                {formatDisplayText(task.title)}
              </h4>
              {task.details ? (
                <p className="mt-1 line-clamp-1 max-w-[44ch] text-sm leading-6 text-graphite/62">
                  {formatDisplayText(task.details)}
                </p>
              ) : null}
            </div>

            <MetaPill
              icon={<Layers3 className="h-3.5 w-3.5" />}
              label={column.title}
              tone="neutral"
            />
            <MetaPill
              icon={<UserRound className="h-3.5 w-3.5" />}
              label={task.assignedTo?.displayName || "Unassigned"}
              tone="neutral"
            />
            <MetaPill label={formatPriority(task.priority)} tone={priorityTone(task.priority)} />
            <MetaPill label={task.sprint?.title || task.sprintName || "Backlog"} tone="neutral" />
            <MetaPill
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label={task.dueAt ? formatWhen(task.dueAt) : "No due date"}
              tone={task.dueAt ? "warm" : "neutral"}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function MetaPill({
  icon,
  label,
  tone,
}: {
  icon?: ReactNode;
  label: string;
  tone: "neutral" | "warm" | "critical" | "high" | "low";
}) {
  const toneClass =
    tone === "critical"
      ? "bg-[#ffe9e6] text-[#a13a27]"
      : tone === "high"
        ? "bg-[#fff1da] text-[#8c6221]"
        : tone === "low"
          ? "bg-[#eef7ea] text-[#24613a]"
          : tone === "warm"
            ? "bg-[#fff7de] text-[#7a6024]"
            : "bg-white text-graphite/72";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold ${toneClass}`}
    >
      {icon}
      {label}
    </span>
  );
}

function priorityTone(priority: ConversationToolTask["priority"]) {
  switch (priority) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "high";
    case "LOW":
      return "low";
    default:
      return "neutral";
  }
}

function formatPriority(priority: ConversationToolTask["priority"]) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDisplayText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
