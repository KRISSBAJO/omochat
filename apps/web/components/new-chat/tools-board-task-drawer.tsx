"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { CalendarDays, Flag, Layers3, Pin, UserRound, X } from "lucide-react";
import {
  createConversationToolTask,
  deleteConversationToolTask,
  type Conversation,
  type ConversationBoard,
  type ConversationTaskPriority,
  type ConversationTaskStatus,
  type ConversationTaskType,
  type ConversationToolTask,
  updateConversationToolTask,
} from "../../lib/api-client";

type BoardTaskDrawerProps = {
  accessToken: string;
  board: ConversationBoard;
  conversation: Conversation;
  task: ConversationToolTask | null;
  open: boolean;
  onClose: () => void;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
};

type TaskDraft = {
  title: string;
  details: string;
  taskType: ConversationTaskType;
  priority: ConversationTaskPriority;
  storyPoints: string;
  score: string;
  sprintId: string;
  labels: string;
  assignedToUserId: string;
  dueAt: string;
  columnId: string;
  status: ConversationTaskStatus;
  pinned: boolean;
};

const taskTypes: ConversationTaskType[] = [
  "TASK",
  "FEATURE",
  "BUG",
  "IMPROVEMENT",
  "FOLLOW_UP",
  "REQUEST",
];
const taskPriorities: ConversationTaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];
const taskStatuses: ConversationTaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export function BoardTaskDrawer({
  accessToken,
  board,
  conversation,
  task,
  open,
  onClose,
  onNotice,
  onRefresh,
}: BoardTaskDrawerProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(() =>
    buildDraft(task, board.columns[0]?.id ?? ""),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(buildDraft(task, task?.columnId ?? board.columns[0]?.id ?? ""));
  }, [board.columns, open, task]);

  if (!open) {
    return null;
  }

  async function runAction(
    taskFn: () => Promise<void>,
    success: string,
    closeOnSuccess = false,
  ) {
    setIsBusy(true);
    try {
      await taskFn();
      await onRefresh();
      onNotice(success);
      if (closeOnSuccess) {
        onClose();
      }
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : "That task action did not finish.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSave() {
    if (!draft.title.trim()) {
      onNotice("Give the task a title.");
      return;
    }

    const payload = {
      title: draft.title,
      details: draft.details.trim() || undefined,
      taskType: draft.taskType,
      priority: draft.priority,
      storyPoints: draft.storyPoints ? Number(draft.storyPoints) : undefined,
      score: draft.score ? Number(draft.score) : undefined,
      sprintId: draft.sprintId || undefined,
      labels: splitLabels(draft.labels),
      assignedToUserId: draft.assignedToUserId || undefined,
      dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : undefined,
      boardId: board.id,
      columnId: draft.columnId || board.columns[0]?.id,
      pinned: draft.pinned,
    };

    if (task) {
      await runAction(
        () =>
          updateConversationToolTask(
            conversation.id,
            task.id,
            {
              ...payload,
              status: draft.status,
            },
            accessToken,
          ).then(() => undefined),
        "Task updated.",
        false,
      );
      return;
    }

    await runAction(
      () =>
        createConversationToolTask(conversation.id, payload, accessToken).then(
          () => undefined,
        ),
      "Task created.",
      true,
    );
  }

  async function handleDelete() {
    if (!task) {
      return;
    }

    await runAction(
      () =>
        deleteConversationToolTask(conversation.id, task.id, accessToken).then(
          () => undefined,
        ),
      "Task deleted.",
      true,
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35 px-4 py-5 sm:px-6"
      onClick={onClose}
    >
      <div className="mx-auto flex h-full max-w-[1180px] items-start justify-center">
        <section
          className="max-h-[92vh] w-full overflow-hidden rounded-[32px] border border-charcoal/10 bg-[#fbfaf7] shadow-[0_28px_120px_rgba(0,0,0,0.18)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 border-b border-charcoal/10 bg-[#fbfaf7]/95 px-5 py-5 backdrop-blur sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
                  {task ? "Task detail" : "Create task"}
                </p>
                <h3 className="mt-2 text-[1.9rem] font-semibold leading-tight text-charcoal">
                  {draft.title.trim() || (task ? task.title : "New board task")}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-graphite/65">
                  Capture the work with the same structure teams expect from a
                  serious delivery board.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TaskBadge tone="neutral">
                    {formatTaskType(draft.taskType)}
                  </TaskBadge>
                  <TaskBadge tone="priority">
                    {formatPriority(draft.priority)}
                  </TaskBadge>
                  <TaskBadge tone="status">
                    {formatStatus(draft.status)}
                  </TaskBadge>
                  {draft.storyPoints ? (
                    <TaskBadge tone="warm">{draft.storyPoints} pts</TaskBadge>
                  ) : null}
                  {draft.score ? (
                    <TaskBadge tone="green">Score {draft.score}</TaskBadge>
                  ) : null}
                  {board.sprints.find((item) => item.id === draft.sprintId)
                    ?.title ? (
                    <TaskBadge tone="neutral">
                      {board.sprints.find((item) => item.id === draft.sprintId)
                        ?.title}
                    </TaskBadge>
                  ) : null}
                  {draft.pinned ? (
                    <TaskBadge tone="warm">Pinned</TaskBadge>
                  ) : null}
                </div>
              </div>
              <button
                className="grid h-11 w-11 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal"
                onClick={onClose}
                type="button"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(92vh-140px)] overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_10px_24px_rgba(24,18,15,0.04)]">
                  <Field label="Title">
                    <input
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Task title"
                      value={draft.title}
                    />
                  </Field>

                  <div className="mt-4">
                    <Field label="Description">
                      <textarea
                        className="min-h-[180px] w-full rounded-[22px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm leading-7 outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            details: event.target.value,
                          }))
                        }
                        placeholder="Expected outcome, acceptance notes, blockers, or execution detail"
                        value={draft.details}
                      />
                    </Field>
                  </div>
                </section>

                <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_10px_24px_rgba(24,18,15,0.04)]">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Task type">
                      <select
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            taskType: event.target
                              .value as ConversationTaskType,
                          }))
                        }
                        value={draft.taskType}
                      >
                        {taskTypes.map((item) => (
                          <option key={item} value={item}>
                            {formatTaskType(item)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Priority">
                      <select
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            priority: event.target
                              .value as ConversationTaskPriority,
                          }))
                        }
                        value={draft.priority}
                      >
                        {taskPriorities.map((item) => (
                          <option key={item} value={item}>
                            {formatPriority(item)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Status">
                      <select
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            status: event.target
                              .value as ConversationTaskStatus,
                          }))
                        }
                        value={draft.status}
                      >
                        {taskStatuses.map((item) => (
                          <option key={item} value={item}>
                            {formatStatus(item)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Lane">
                      <select
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) => {
                          const nextColumnId = event.target.value;
                          const nextColumn = board.columns.find(
                            (column) => column.id === nextColumnId,
                          );
                          setDraft((current) => ({
                            ...current,
                            columnId: nextColumnId,
                            status: nextColumn?.taskStatus ?? current.status,
                          }));
                        }}
                        value={draft.columnId}
                      >
                        {board.columns.map((column) => (
                          <option key={column.id} value={column.id}>
                            {column.title}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Assignee">
                      <select
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            assignedToUserId: event.target.value,
                          }))
                        }
                        value={draft.assignedToUserId}
                      >
                        <option value="">Assign later</option>
                        {conversation.participants.map((participant) => (
                          <option
                            key={participant.user.id}
                            value={participant.user.id}
                          >
                            {participant.user.displayName}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Due">
                      <input
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            dueAt: event.target.value,
                          }))
                        }
                        type="datetime-local"
                        value={draft.dueAt}
                      />
                    </Field>

                    <Field label="Story points">
                      <input
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        inputMode="numeric"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            storyPoints: event.target.value,
                          }))
                        }
                        placeholder="5"
                        value={draft.storyPoints}
                      />
                    </Field>

                    <Field label="Score">
                      <input
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        inputMode="numeric"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            score: event.target.value,
                          }))
                        }
                        placeholder="82"
                        value={draft.score}
                      />
                    </Field>

                    <Field label="Sprint">
                      <select
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            sprintId: event.target.value,
                          }))
                        }
                        value={draft.sprintId}
                      >
                        <option value="">Backlog</option>
                        {board.sprints.map((sprint) => (
                          <option key={sprint.id} value={sprint.id}>
                            {sprint.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Labels">
                      <input
                        className="w-full rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            labels: event.target.value,
                          }))
                        }
                        placeholder="launch, mobile, onboarding"
                        value={draft.labels}
                      />
                    </Field>
                  </div>
                </section>

                {task?.sourceMessage ? (
                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_10px_24px_rgba(24,18,15,0.04)]">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
                      Source message
                    </p>
                    <p className="mt-3 text-sm leading-7 text-charcoal">
                      {task.sourceMessage.body ||
                        "This task was created from a non-text message."}
                    </p>
                    <p className="mt-3 text-xs text-graphite/58">
                      {task.sourceMessage.sender?.displayName ||
                        "Unknown sender"}{" "}
                      • {formatDateTime(task.sourceMessage.createdAt)}
                    </p>
                  </section>
                ) : null}

                <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_10px_24px_rgba(24,18,15,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
                        Save changes
                      </p>
                      <p className="mt-2 text-sm leading-7 text-graphite/65">
                        Update the task without losing board context.
                      </p>
                    </div>
                    <label className="flex items-center gap-3 rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm font-medium text-charcoal">
                      <input
                        checked={draft.pinned}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            pinned: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Pin in filtered views
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => {
                        void handleSave();
                      }}
                      type="button"
                    >
                      {task ? "Save task" : "Create task"}
                    </button>
                    {task ? (
                      <button
                        className="rounded-full border border-[#e5c2b9] bg-[#fff2ee] px-5 py-3 text-sm font-semibold text-[#8c3a27] disabled:opacity-50"
                        disabled={isBusy}
                        onClick={() => {
                          void handleDelete();
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <DetailCard title="Quick actions">
                  <div className="space-y-4">
                    <Field label="Status">
                      <select
                        className="w-full rounded-[18px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            status: event.target
                              .value as ConversationTaskStatus,
                          }))
                        }
                        value={draft.status}
                      >
                        {taskStatuses.map((item) => (
                          <option key={item} value={item}>
                            {formatStatus(item)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Priority">
                      <select
                        className="w-full rounded-[18px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            priority: event.target
                              .value as ConversationTaskPriority,
                          }))
                        }
                        value={draft.priority}
                      >
                        {taskPriorities.map((item) => (
                          <option key={item} value={item}>
                            {formatPriority(item)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Assignee">
                      <select
                        className="w-full rounded-[18px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            assignedToUserId: event.target.value,
                          }))
                        }
                        value={draft.assignedToUserId}
                      >
                        <option value="">Assign later</option>
                        {conversation.participants.map((participant) => (
                          <option
                            key={participant.user.id}
                            value={participant.user.id}
                          >
                            {participant.user.displayName}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </DetailCard>

                <DetailCard title="Task snapshot">
                  <div className="space-y-3">
                    <SnapshotRow
                      icon={UserRound}
                      label="Reporter"
                      value={task?.createdBy.displayName || "You"}
                    />
                    <SnapshotRow
                      icon={UserRound}
                      label="Assignee"
                      value={
                        conversation.participants.find(
                          (participant) =>
                            participant.user.id === draft.assignedToUserId,
                        )?.user.displayName || "Unassigned"
                      }
                    />
                    <SnapshotRow
                      icon={Layers3}
                      label="Board"
                      value={board.title}
                    />
                    <SnapshotRow
                      icon={Layers3}
                      label="Lane"
                      value={
                        board.columns.find(
                          (column) => column.id === draft.columnId,
                        )?.title || "Backlog"
                      }
                    />
                    <SnapshotRow
                      icon={CalendarDays}
                      label="Created"
                      value={task ? formatDateTime(task.createdAt) : "New task"}
                    />
                    <SnapshotRow
                      icon={CalendarDays}
                      label="Updated"
                      value={
                        task ? formatDateTime(task.updatedAt) : "Not saved yet"
                      }
                    />
                  </div>
                </DetailCard>

                <DetailCard title="Delivery signals">
                  <div className="space-y-3">
                    <SignalRow
                      icon={Flag}
                      label="Priority"
                      value={formatPriority(draft.priority)}
                    />
                    <SignalRow
                      icon={Pin}
                      label="Pinned"
                      value={draft.pinned ? "Yes" : "No"}
                    />
                    <SignalRow
                      label="Story points"
                      value={draft.storyPoints || "—"}
                    />
                    <SignalRow label="Score" value={draft.score || "—"} />
                      <SignalRow
                        label="Sprint"
                        value={
                          board.sprints.find((item) => item.id === draft.sprintId)
                            ?.title || "Backlog"
                        }
                      />
                    <SignalRow
                      icon={CalendarDays}
                      label="Due"
                      value={
                        draft.dueAt
                          ? formatDateTime(draft.dueAt)
                          : "No due date"
                      }
                    />
                  </div>
                </DetailCard>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
        {label}
      </span>
      {children}
    </label>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_10px_24px_rgba(24,18,15,0.04)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TaskBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "priority" | "status" | "warm" | "green";
}) {
  const toneClass =
    tone === "priority"
      ? "bg-[#fff1da] text-[#8c6221]"
      : tone === "status"
        ? "bg-[#eef0f6] text-graphite/80"
        : tone === "warm"
          ? "bg-[#f7ead8] text-[#7a5a1c]"
          : tone === "green"
            ? "bg-[#eef7ea] text-[#24613a]"
            : "bg-[#eef0f6] text-graphite/72";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function SnapshotRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-graphite/55">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2 text-sm font-medium text-charcoal">
        {Icon ? <Icon className="h-4 w-4 text-graphite/55" /> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function SignalRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-charcoal/10 bg-[#fbfaf7] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-charcoal">
        {Icon ? <Icon className="h-4 w-4 text-graphite/55" /> : null}
        <span>{label}</span>
      </div>
      <span className="text-sm text-graphite/72">{value}</span>
    </div>
  );
}

function buildDraft(
  task: ConversationToolTask | null,
  fallbackColumnId: string,
): TaskDraft {
  return {
    title: task?.title ?? "",
    details: task?.details ?? "",
    taskType: task?.taskType ?? "TASK",
    priority: task?.priority ?? "MEDIUM",
    storyPoints: task?.storyPoints ? String(task.storyPoints) : "",
    score: task?.score ? String(task.score) : "",
    sprintId: task?.sprintId ?? "",
    labels: task?.labels.join(", ") ?? "",
    assignedToUserId: task?.assignedTo?.id ?? "",
    dueAt: task?.dueAt ? toDatetimeInput(task.dueAt) : "",
    columnId: task?.columnId ?? fallbackColumnId,
    status: task?.status ?? "TODO",
    pinned: task?.pinned ?? false,
  };
}

function splitLabels(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDatetimeInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTaskType(value: ConversationTaskType) {
  switch (value) {
    case "FOLLOW_UP":
      return "Follow up";
    default:
      return value.charAt(0) + value.slice(1).toLowerCase();
  }
}

function formatPriority(value: ConversationTaskPriority) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatStatus(value: ConversationTaskStatus) {
  switch (value) {
    case "IN_PROGRESS":
      return "In progress";
    case "DONE":
      return "Done";
    default:
      return "To do";
  }
}
