"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  Heart,
  Layers3,
  MessageSquare,
  Paperclip,
  Pin,
  Save,
  Send,
  Upload,
  UserRound,
} from "lucide-react";
import {
  type AuthSession,
  createConversationToolTaskAttachment,
  createConversationToolTaskComment,
  getConversationToolTask,
  getConversationToolsWorkspace,
  refreshSession,
  subscribeToSessionRefresh,
  toggleConversationToolTaskLike,
  toggleConversationToolTaskWatch,
  type ConversationTaskPriority,
  type ConversationTaskStatus,
  type ConversationTaskType,
  type ConversationToolTaskComment,
  type ConversationToolTaskDetail,
  type ConversationToolsWorkspace,
  updateConversationToolTask,
} from "../../lib/api-client";
import { collectFileMetadata, uploadFileToCloudinary } from "../../lib/media-helpers";

type ToolsTaskPageProps = {
  conversationId: string;
  taskId: string;
};

type TaskDraft = {
  title: string;
  details: string;
  category: string;
  taskType: ConversationTaskType;
  priority: ConversationTaskPriority;
  status: ConversationTaskStatus;
  boardId: string;
  columnId: string;
  sprintId: string;
  assignedToUserId: string;
  storyPoints: string;
  score: string;
  labels: string;
  dueAt: string;
  pinned: boolean;
};

const taskTypes: ConversationTaskType[] = ["TASK", "FEATURE", "BUG", "IMPROVEMENT", "FOLLOW_UP", "REQUEST"];
const taskPriorities: ConversationTaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const taskStatuses: ConversationTaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export function ToolsTaskPage({ conversationId, taskId }: ToolsTaskPageProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [workspace, setWorkspace] = useState<ConversationToolsWorkspace | null>(null);
  const [task, setTask] = useState<ConversationToolTaskDetail | null>(null);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    refreshSession()
      .then(async (nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        await refreshData(nextSession.accessToken);
      })
      .catch((error) => {
        if (!mounted) return;
        setNotice(error instanceof Error ? error.message : "Could not open that task.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [conversationId, taskId]);

  useEffect(() => subscribeToSessionRefresh((nextSession) => setSession(nextSession)), []);

  async function refreshData(accessToken: string) {
    const [nextWorkspace, nextTask] = await Promise.all([
      getConversationToolsWorkspace(conversationId, accessToken),
      getConversationToolTask(conversationId, taskId, accessToken),
    ]);
    setWorkspace(nextWorkspace);
    setTask(nextTask);
    setDraft(buildDraft(nextTask));
  }

  async function runAction(taskFn: () => Promise<void>, success: string) {
    setIsSaving(true);
    setNotice(null);
    try {
      await taskFn();
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That task action did not finish.");
    } finally {
      setIsSaving(false);
    }
  }

  const activeBoard = useMemo(() => {
    if (!workspace || !task?.boardId) {
      return workspace?.boards[0] ?? null;
    }
    return workspace.boards.find((board) => board.id === task.boardId) ?? workspace.boards[0] ?? null;
  }, [task?.boardId, workspace]);

  const availableColumns = useMemo(() => activeBoard?.columns ?? [], [activeBoard]);
  const availableSprints = useMemo(() => activeBoard?.sprints ?? [], [activeBoard]);
  const availableAssignees = useMemo(
    () => workspace?.conversation.participants.map((participant) => participant.user) ?? [],
    [workspace],
  );
  const commentTree = useMemo(() => buildCommentTree(task?.comments ?? []), [task?.comments]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-6 py-10 text-charcoal">
        <div className="mx-auto max-w-6xl rounded-[34px] border border-charcoal/10 bg-white p-8 shadow-[0_22px_60px_rgba(24,18,15,0.08)]">
          <p className="text-sm text-graphite/68">Loading task workspace...</p>
        </div>
      </main>
    );
  }

  if (!session || !workspace || !task || !draft) {
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-6 py-10 text-charcoal">
        <div className="mx-auto max-w-4xl rounded-[34px] border border-charcoal/10 bg-white p-8 shadow-[0_22px_60px_rgba(24,18,15,0.08)]">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-graphite/72" href={`/new-shell?conversationId=${conversationId}&sidebar=tools`}>
            <ArrowLeft className="h-4 w-4" />
            Back to tools
          </Link>
          <h1 className="mt-6 text-3xl font-semibold text-charcoal">Task unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-graphite/68">{notice || "This task could not be loaded right now."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-6 py-8 text-charcoal">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal shadow-[0_10px_24px_rgba(24,18,15,0.05)]"
            href={`/new-shell?conversationId=${conversationId}&sidebar=tools`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to board
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                task.viewerIsWatching ? "bg-charcoal text-cloud" : "border border-charcoal/10 bg-white text-charcoal"
              }`}
              disabled={isSaving}
              onClick={() => {
                void runAction(async () => {
                  const nextTask = await toggleConversationToolTaskWatch(conversationId, task.id, session.accessToken);
                  setTask(nextTask);
                  setDraft(buildDraft(nextTask));
                }, task.viewerIsWatching ? "You are no longer watching this task." : "Watching enabled.");
              }}
              type="button"
            >
              <Eye className="h-4 w-4" />
              {task.viewerIsWatching ? "Watching" : "Watch"}
            </button>
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                task.viewerHasLiked ? "bg-[#ffe9e6] text-[#a13a27]" : "border border-charcoal/10 bg-white text-charcoal"
              }`}
              disabled={isSaving}
              onClick={() => {
                void runAction(async () => {
                  const nextTask = await toggleConversationToolTaskLike(conversationId, task.id, session.accessToken);
                  setTask(nextTask);
                  setDraft(buildDraft(nextTask));
                }, task.viewerHasLiked ? "Like removed." : "Task liked.");
              }}
              type="button"
            >
              <Heart className="h-4 w-4" />
              {task.counts.likes} likes
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2.5 text-sm font-semibold text-cloud"
              disabled={isSaving}
              onClick={() => setIsEditing((current) => !current)}
              type="button"
            >
              <Save className="h-4 w-4" />
              {isEditing ? "Close edit" : "Edit task"}
            </button>
          </div>
        </div>

        <section className="rounded-[34px] border border-charcoal/10 bg-white p-7 shadow-[0_22px_60px_rgba(24,18,15,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">
                {task.taskCode || task.id.slice(0, 8)} - {workspace.conversation.title || "Room workspace"}
              </p>
              <h1 className="mt-3 text-[2.2rem] font-semibold leading-tight text-charcoal">{task.title}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <TaskBadge tone="neutral">{formatTaskType(task.taskType)}</TaskBadge>
                <TaskBadge tone="priority">{formatPriority(task.priority)}</TaskBadge>
                <TaskBadge tone="status">{formatStatus(task.status)}</TaskBadge>
                {task.storyPoints ? <TaskBadge tone="warm">{task.storyPoints} pts</TaskBadge> : null}
                {task.score ? <TaskBadge tone="green">Score {task.score}</TaskBadge> : null}
                {task.sprint?.title || task.sprintName ? <TaskBadge tone="neutral">{task.sprint?.title || task.sprintName}</TaskBadge> : null}
                {task.pinned ? <TaskBadge tone="warm">Pinned</TaskBadge> : null}
                {task.labels.map((label) => (
                  <TaskBadge key={label} tone="soft">
                    {label}
                  </TaskBadge>
                ))}
              </div>
              <p className="mt-5 max-w-4xl text-sm leading-7 text-graphite/72">{task.details || "No delivery notes were added to this task yet."}</p>
            </div>
            <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
              <StatCard label="Attachments" value={String(task.counts.attachments)} />
              <StatCard label="Comments" value={String(task.counts.comments)} />
              <StatCard label="Likes" value={String(task.counts.likes)} />
              <StatCard label="Watchers" value={String(task.counts.watchers)} />
            </div>
          </div>
          {notice ? <div className="mt-5 rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 text-graphite/78">{notice}</div> : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_400px]">
          <div className="space-y-6">
            {isEditing ? (
              <section className="rounded-[30px] border border-charcoal/10 bg-white p-6 shadow-[0_18px_48px_rgba(24,18,15,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">Task edit</p>
                    <h2 className="mt-2 text-2xl font-semibold text-charcoal">Update delivery detail</h2>
                  </div>
                  <button
                    className="rounded-full bg-charcoal px-4 py-2.5 text-sm font-semibold text-cloud disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => {
                      void runAction(async () => {
                        await updateConversationToolTask(
                          conversationId,
                          task.id,
                          {
                            title: draft.title.trim(),
                            details: draft.details.trim() || undefined,
                            category: draft.category.trim() || undefined,
                            taskType: draft.taskType,
                            priority: draft.priority,
                            status: draft.status,
                            boardId: draft.boardId || undefined,
                            columnId: draft.columnId || undefined,
                            sprintId: draft.sprintId || undefined,
                            assignedToUserId: draft.assignedToUserId || undefined,
                            storyPoints: draft.storyPoints ? Number(draft.storyPoints) : undefined,
                            score: draft.score ? Number(draft.score) : undefined,
                            labels: splitLabels(draft.labels),
                            dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : undefined,
                            pinned: draft.pinned,
                          },
                          session.accessToken,
                        );
                        await refreshData(session.accessToken);
                        setIsEditing(false);
                      }, "Task updated.");
                    }}
                    type="button"
                  >
                    Save task
                  </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <Field label="Title">
                    <input
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                      value={draft.title}
                    />
                  </Field>
                  <Field label="Category">
                    <input
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, category: event.target.value } : current))}
                      placeholder="Engineering, growth, follow-up..."
                      value={draft.category}
                    />
                  </Field>
                  <Field className="lg:col-span-2" label="Details">
                    <textarea
                      className="min-h-[160px] w-full rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, details: event.target.value } : current))}
                      value={draft.details}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, taskType: event.target.value as ConversationTaskType } : current))}
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
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, priority: event.target.value as ConversationTaskPriority } : current))}
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
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, status: event.target.value as ConversationTaskStatus } : current))}
                      value={draft.status}
                    >
                      {taskStatuses.map((item) => (
                        <option key={item} value={item}>
                          {formatStatus(item)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Board">
                    <select
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => {
                        const nextBoard = workspace.boards.find((board) => board.id === event.target.value) || null;
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                boardId: event.target.value,
                                columnId: nextBoard?.columns[0]?.id || "",
                                sprintId: "",
                              }
                            : current,
                        );
                      }}
                      value={draft.boardId}
                    >
                      {workspace.boards.map((board) => (
                        <option key={board.id} value={board.id}>
                          {board.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Lane">
                    <select
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, columnId: event.target.value } : current))}
                      value={draft.columnId}
                    >
                      {availableColumns.map((column) => (
                        <option key={column.id} value={column.id}>
                          {column.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sprint">
                    <select
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, sprintId: event.target.value } : current))}
                      value={draft.sprintId}
                    >
                      <option value="">Backlog</option>
                      {availableSprints.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.title} - {formatSprintStatus(sprint.status)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Assignee">
                    <select
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, assignedToUserId: event.target.value } : current))}
                      value={draft.assignedToUserId}
                    >
                      <option value="">Assign later</option>
                      {availableAssignees.map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.displayName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Story points">
                    <input
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, storyPoints: event.target.value } : current))}
                      placeholder="5"
                      value={draft.storyPoints}
                    />
                  </Field>
                  <Field label="Score">
                    <input
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, score: event.target.value } : current))}
                      placeholder="82"
                      value={draft.score}
                    />
                  </Field>
                  <Field label="Due">
                    <input
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, dueAt: event.target.value } : current))}
                      type="datetime-local"
                      value={draft.dueAt}
                    />
                  </Field>
                  <Field className="lg:col-span-2" label="Labels">
                    <input
                      className="w-full rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setDraft((current) => (current ? { ...current, labels: event.target.value } : current))}
                      placeholder="mobile, launch, follow-up"
                      value={draft.labels}
                    />
                  </Field>
                  <label className="inline-flex items-center gap-3 rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm font-medium text-charcoal">
                    <input
                      checked={draft.pinned}
                      onChange={(event) => setDraft((current) => (current ? { ...current, pinned: event.target.checked } : current))}
                      type="checkbox"
                    />
                    Keep pinned on the board
                  </label>
                </div>
              </section>
            ) : null}

            <section className="rounded-[30px] border border-charcoal/10 bg-white p-6 shadow-[0_18px_48px_rgba(24,18,15,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">Discussion</p>
                  <h2 className="mt-2 text-2xl font-semibold text-charcoal">Comments and replies</h2>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-[#faf7f2] px-4 py-2.5 text-sm font-semibold text-charcoal"
                  onClick={() => uploadInputRef.current?.click()}
                  type="button"
                >
                  <Upload className="h-4 w-4" />
                  Upload attachment
                </button>
                <input
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    if (!files.length) {
                      return;
                    }
                    void runAction(async () => {
                      for (const file of files) {
                        const metadata = normalizeCollectedMetadata(await collectFileMetadata(file));
                        const uploaded = await uploadFileToCloudinary(file);
                        await createConversationToolTaskAttachment(
                          conversationId,
                          task.id,
                          {
                            provider: uploaded.provider,
                            storageKey: uploaded.storageKey,
                            url: uploaded.url,
                            mimeType: uploaded.mimeType,
                            sizeBytes: uploaded.sizeBytes,
                            width: uploaded.width ?? metadata.width,
                            height: uploaded.height ?? metadata.height,
                            durationMs: uploaded.durationMs ?? metadata.durationMs,
                          },
                          session.accessToken,
                        );
                      }
                      await refreshData(session.accessToken);
                    }, files.length === 1 ? "Attachment added." : "Attachments added.");
                  }}
                  ref={uploadInputRef}
                  type="file"
                />
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <div className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
                    {replyTargetId ? (
                      <div className="mb-3 flex items-center justify-between rounded-[18px] border border-charcoal/10 bg-white px-3 py-2 text-sm">
                        <span>Replying inside this thread.</span>
                        <button className="font-semibold text-graphite/72" onClick={() => setReplyTargetId(null)} type="button">
                          Clear
                        </button>
                      </div>
                    ) : null}
                    <textarea
                      className="min-h-[140px] w-full bg-transparent text-sm leading-7 outline-none"
                      onChange={(event) => setCommentBody(event.target.value)}
                      placeholder="Add a delivery note, blocker, handoff, or reply..."
                      value={commentBody}
                    />
                    <div className="mt-4 flex justify-end">
                      <button
                        className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2.5 text-sm font-semibold text-cloud disabled:opacity-50"
                        disabled={isSaving || !commentBody.trim()}
                        onClick={() => {
                          void runAction(async () => {
                            const nextTask = await createConversationToolTaskComment(
                              conversationId,
                              task.id,
                              {
                                body: commentBody.trim(),
                                ...(replyTargetId ? { parentId: replyTargetId } : {}),
                              },
                              session.accessToken,
                            );
                            setTask(nextTask);
                            setDraft(buildDraft(nextTask));
                            setCommentBody("");
                            setReplyTargetId(null);
                          }, replyTargetId ? "Reply added." : "Comment added.");
                        }}
                        type="button"
                      >
                        <Send className="h-4 w-4" />
                        {replyTargetId ? "Send reply" : "Post comment"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {commentTree.length === 0 ? (
                      <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-5 text-sm leading-7 text-graphite/64">
                        This task has no discussion yet.
                      </div>
                    ) : (
                      commentTree.map((item) => <CommentThread item={item} key={item.comment.id} onReply={(commentId) => setReplyTargetId(commentId)} />)
                    )}
                  </div>
                </div>

                <aside className="space-y-4">
                  <section className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Task snapshot</p>
                    <div className="mt-4 space-y-3">
                      <SnapshotRow icon={Layers3} label="Board" value={task.board?.title || "No board"} />
                      <SnapshotRow icon={Layers3} label="Lane" value={task.column?.title || "No lane"} />
                      <SnapshotRow icon={CalendarDays} label="Due" value={task.dueAt ? formatDateTime(task.dueAt) : "No due date"} />
                      <SnapshotRow icon={UserRound} label="Assignee" value={task.assignedTo?.displayName || "Unassigned"} />
                      <SnapshotRow icon={Pin} label="Created" value={formatDateTime(task.createdAt)} />
                    </div>
                  </section>
                  <section className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Attachments</p>
                    <div className="mt-4 space-y-3">
                      {task.attachments.length === 0 ? (
                        <p className="text-sm leading-7 text-graphite/64">No task files uploaded yet.</p>
                      ) : (
                        task.attachments.map((attachment) => (
                          <a
                            className="block rounded-[18px] border border-charcoal/10 bg-white px-4 py-3 text-sm text-charcoal transition hover:bg-[#fffdf9]"
                            href={attachment.url}
                            key={attachment.id}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate font-semibold">{attachment.storageKey.split("/").pop() || attachment.storageKey}</span>
                              <Paperclip className="h-4 w-4 text-graphite/52" />
                            </div>
                            <p className="mt-1 text-xs text-graphite/58">{attachment.mimeType} - {formatFileSize(attachment.sizeBytes)}</p>
                          </a>
                        ))
                      )}
                    </div>
                  </section>
                </aside>
              </div>
            </section>
          </div>
          <aside className="space-y-6">
            <section className="rounded-[30px] border border-charcoal/10 bg-white p-6 shadow-[0_18px_48px_rgba(24,18,15,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Board context</p>
              <h2 className="mt-2 text-2xl font-semibold text-charcoal">{activeBoard?.title || "Room board"}</h2>
              <div className="mt-4 space-y-3">
                <StatCard label="Task code" value={task.taskCode || "Pending"} />
                <StatCard label="Sprint" value={task.sprint?.title || task.sprintName || "Backlog"} />
                <StatCard label="Board members" value={String(activeBoard?.memberCount || 0)} />
              </div>
            </section>

            {task.sourceMessage ? (
              <section className="rounded-[30px] border border-charcoal/10 bg-white p-6 shadow-[0_18px_48px_rgba(24,18,15,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Source message</p>
                <p className="mt-3 text-sm leading-7 text-charcoal">{task.sourceMessage.body || "This task was created from a non-text message."}</p>
                <p className="mt-3 text-xs text-graphite/58">
                  {task.sourceMessage.sender?.displayName || "Unknown sender"} - {formatDateTime(task.sourceMessage.createdAt)}
                </p>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function buildDraft(task: ConversationToolTaskDetail): TaskDraft {
  return {
    title: task.title,
    details: task.details ?? "",
    category: task.category ?? "",
    taskType: task.taskType,
    priority: task.priority,
    status: task.status,
    boardId: task.boardId ?? task.board?.id ?? "",
    columnId: task.columnId ?? task.column?.id ?? "",
    sprintId: task.sprintId ?? task.sprint?.id ?? "",
    assignedToUserId: task.assignedTo?.id ?? "",
    storyPoints: task.storyPoints ? String(task.storyPoints) : "",
    score: task.score ? String(task.score) : "",
    labels: task.labels.join(", "),
    dueAt: task.dueAt ? toDatetimeInput(task.dueAt) : "",
    pinned: task.pinned,
  };
}

function normalizeCollectedMetadata(
  value: Awaited<ReturnType<typeof collectFileMetadata>>,
) {
  return {
    width: "width" in value ? value.width : undefined,
    height: "height" in value ? value.height : undefined,
    durationMs: "durationMs" in value ? value.durationMs : undefined,
  };
}

function splitLabels(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDatetimeInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatTaskType(value: ConversationTaskType) {
  return value.toLowerCase().replace(/_/g, " ");
}

function formatPriority(value: ConversationTaskPriority) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatStatus(value: ConversationTaskStatus) {
  return value === "IN_PROGRESS" ? "In progress" : value === "TODO" ? "To do" : "Done";
}

function formatSprintStatus(value: string) {
  return value === "ACTIVE" ? "Active" : value === "COMPLETED" ? "Completed" : "Planned";
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold text-charcoal">{label}</span>
      {children}
    </label>
  );
}

function TaskBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "priority" | "status" | "warm" | "green" | "soft";
}) {
  const palette =
    tone === "priority"
      ? "bg-[#fff1da] text-[#8c6221]"
      : tone === "status"
        ? "bg-[#eee8ff] text-[#6240b8]"
        : tone === "warm"
          ? "bg-[#f8efe1] text-[#86562f]"
          : tone === "green"
            ? "bg-[#eef7ea] text-[#24613a]"
            : tone === "soft"
              ? "bg-[#eef0f6] text-graphite/72"
              : "bg-[#f5f0e8] text-charcoal";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${palette}`}>{children}</span>;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">{label}</p>
      <p className="mt-2 text-[1.7rem] font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function SnapshotRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-charcoal/10 bg-white px-3 py-3">
      <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-[#faf7f2] text-charcoal">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-graphite/50">{label}</p>
        <p className="mt-1 text-sm font-semibold text-charcoal">{value}</p>
      </div>
    </div>
  );
}

type CommentNode = {
  comment: ConversationToolTaskComment;
  children: CommentNode[];
};

function buildCommentTree(comments: ConversationToolTaskComment[]) {
  const byParent = new Map<string | null, ConversationToolTaskComment[]>();
  for (const comment of comments) {
    const bucket = byParent.get(comment.parentId ?? null) ?? [];
    bucket.push(comment);
    byParent.set(comment.parentId ?? null, bucket);
  }

  const walk = (parentId: string | null): CommentNode[] =>
    (byParent.get(parentId) ?? []).map((comment) => ({
      comment,
      children: walk(comment.id),
    }));

  return walk(null);
}

function CommentThread({
  item,
  onReply,
  depth = 0,
}: {
  item: CommentNode;
  onReply: (commentId: string) => void;
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "ml-6 border-l border-charcoal/10 pl-4" : ""}>
      <article className="rounded-[22px] border border-charcoal/10 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-charcoal">{item.comment.author.displayName}</p>
            <p className="mt-1 text-xs text-graphite/58">{formatDateTime(item.comment.createdAt)}</p>
          </div>
          <button
            className="inline-flex items-center gap-1 rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-1.5 text-xs font-semibold text-charcoal"
            onClick={() => onReply(item.comment.id)}
            type="button"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Reply
          </button>
        </div>
        <p className="mt-3 text-sm leading-7 text-graphite/78">{item.comment.deletedAt ? "This reply was removed." : item.comment.body}</p>
      </article>
      {item.children.length > 0 ? (
        <div className="mt-3 space-y-3">
          {item.children.map((child) => (
            <CommentThread item={child} key={child.comment.id} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
