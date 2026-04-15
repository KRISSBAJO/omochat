"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, KanbanSquare, LayoutList, Plus, Settings2, Users } from "lucide-react";
import {
  createConversationBoardSprint,
  createConversationBoard,
  createConversationBoardColumn,
  deleteConversationBoardSprint,
  deleteConversationBoard,
  type Conversation,
  type ConversationBoard,
  type ConversationBoardSprintStatus,
  type ConversationBoardTemplate,
  type ConversationTaskPriority,
  type ConversationToolTask,
  updateConversationBoardColumn,
  updateConversationBoardSprint,
  updateConversationBoard,
  updateConversationToolTask,
} from "../../lib/api-client";
import { BoardKanbanColumn } from "./tools-board-kanban-column";
import { BoardListView } from "./tools-board-list-view";
import { BoardMembersPanel } from "./tools-board-members-panel";
import { BoardTaskDrawer } from "./tools-board-task-drawer";
import { formatConversationCategory } from "./tools-registry";

type RoomBoardWorkspaceProps = {
  accessToken: string;
  conversation: Conversation;
  boards: ConversationBoard[];
  canManageRoom: boolean;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
};

type SortBy = "manual" | "priority" | "due" | "updated" | "points";
type BoardViewMode = "KANBAN" | "LIST";

const MAX_VISIBLE_COLUMNS = 4;
const COLUMN_TRACK_COLLAPSED = "72px";
const COLUMN_TRACK_EXPANDED = "minmax(224px, 1fr)";
const COLUMN_TRACK_SCROLLED = "minmax(224px, 18.5%)";
const boardTemplates: ConversationBoardTemplate[] = [
  "KANBAN",
  "SPRINT",
  "CUSTOM",
];
const sprintStatuses: ConversationBoardSprintStatus[] = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
];
const priorityFilters: Array<ConversationTaskPriority | "ALL"> = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

export function RoomBoardWorkspace({
  accessToken,
  conversation,
  boards,
  canManageRoom,
  onNotice,
  onRefresh,
}: RoomBoardWorkspaceProps) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [localBoards, setLocalBoards] = useState(boards);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(
    boards[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ConversationToolTask["status"] | "ALL"
  >("ALL");
  const [priorityFilter, setPriorityFilter] = useState<
    ConversationTaskPriority | "ALL"
  >("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("manual");
  const [ascending, setAscending] = useState(true);
  const [viewMode, setViewMode] = useState<BoardViewMode>("KANBAN");
  const [collapsedColumns, setCollapsedColumns] = useState<
    Record<string, boolean>
  >({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showPlanningPanel, setShowPlanningPanel] = useState(false);
  const [showColumnComposer, setShowColumnComposer] = useState(false);
  const [sprintTitle, setSprintTitle] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [sprintStatus, setSprintStatus] =
    useState<ConversationBoardSprintStatus>("PLANNED");
  const [sprintStartsAt, setSprintStartsAt] = useState("");
  const [sprintEndsAt, setSprintEndsAt] = useState("");
  const [boardTitle, setBoardTitle] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [boardTemplate, setBoardTemplate] =
    useState<ConversationBoardTemplate>("KANBAN");
  const [draftBoardTitle, setDraftBoardTitle] = useState("");
  const [draftBoardDescription, setDraftBoardDescription] = useState("");
  const [draftBoardTemplate, setDraftBoardTemplate] =
    useState<ConversationBoardTemplate>("KANBAN");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("");
  const [newColumnStatus, setNewColumnStatus] =
    useState<ConversationToolTask["status"]>("TODO");

  useEffect(() => {
    setLocalBoards(boards);
  }, [boards]);

  useEffect(() => {
    if (
      !selectedBoardId ||
      !localBoards.some((board) => board.id === selectedBoardId)
    ) {
      setSelectedBoardId(localBoards[0]?.id ?? null);
    }
  }, [localBoards, selectedBoardId]);

  const selectedBoard =
    localBoards.find((board) => board.id === selectedBoardId) ??
    localBoards[0] ??
    null;
  const memberOptions = conversation.participants.map(
    (participant) => participant.user,
  );

  useEffect(() => {
    if (!selectedBoard) {
      setDraftBoardTitle("");
      setDraftBoardDescription("");
      setDraftBoardTemplate("KANBAN");
      return;
    }
    setDraftBoardTitle(selectedBoard.title);
    setDraftBoardDescription(selectedBoard.description ?? "");
    setDraftBoardTemplate(selectedBoard.template);
  }, [selectedBoard]);

  const dragEnabled =
    sortBy === "manual" &&
    !search.trim() &&
    statusFilter === "ALL" &&
    priorityFilter === "ALL" &&
    assigneeFilter === "ALL" &&
    !pinnedOnly;
  const activeSprint = useMemo(() => {
    if (!selectedBoard) return "Backlog";
    const activeBoardSprint = selectedBoard.sprints.find(
      (sprint) => sprint.status === "ACTIVE",
    );
    if (activeBoardSprint) {
      return activeBoardSprint.title;
    }
    const frequency = new Map<string, number>();
    for (const task of selectedBoard.columns.flatMap(
      (column) => column.tasks,
    )) {
      if (task.sprintName)
        frequency.set(
          task.sprintName,
          (frequency.get(task.sprintName) ?? 0) + 1,
        );
    }
    return (
      Array.from(frequency.entries()).sort(
        (left, right) => right[1] - left[1],
      )[0]?.[0] ?? "Backlog"
    );
  }, [selectedBoard]);

  const filteredColumns = useMemo(() => {
    if (!selectedBoard) return [];
    return selectedBoard.columns.map((column) => {
      let tasks = [...column.tasks];
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        tasks = tasks.filter((task) =>
          [
            task.title,
            task.details ?? "",
            task.sprintName ?? "",
            task.taskCode ?? "",
            task.labels.join(" "),
            task.id,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query),
        );
      }
      if (statusFilter !== "ALL")
        tasks = tasks.filter((task) => task.status === statusFilter);
      if (priorityFilter !== "ALL")
        tasks = tasks.filter((task) => task.priority === priorityFilter);
      if (assigneeFilter !== "ALL")
        tasks = tasks.filter((task) => task.assignedTo?.id === assigneeFilter);
      if (pinnedOnly) tasks = tasks.filter((task) => task.pinned);
      tasks.sort((left, right) => compareTasks(left, right, sortBy, ascending));
      return { ...column, tasks };
    });
  }, [
    ascending,
    assigneeFilter,
    pinnedOnly,
    priorityFilter,
    search,
    selectedBoard,
    sortBy,
    statusFilter,
  ]);

  const filteredTaskRows = useMemo(() => {
    const rows = filteredColumns.flatMap((column) =>
      column.tasks.map((task) => ({
        column,
        task,
      })),
    );

    return rows.sort((left, right) => {
      if (sortBy === "manual") {
        const columnDelta = left.column.sortOrder - right.column.sortOrder;
        if (columnDelta !== 0) {
          return ascending ? columnDelta : -columnDelta;
        }
      }
      return compareTasks(left.task, right.task, sortBy, ascending);
    });
  }, [ascending, filteredColumns, sortBy]);

  const showInlineAddLaneCard = Boolean(
    selectedBoard?.canManage &&
    !showColumnComposer &&
    filteredColumns.length < MAX_VISIBLE_COLUMNS,
  );
  const visibleExpandedColumnCount =
    filteredColumns.filter((column) => !collapsedColumns[column.id]).length +
    (showColumnComposer || showInlineAddLaneCard ? 1 : 0);
  const expandedColumnWidth =
    visibleExpandedColumnCount > MAX_VISIBLE_COLUMNS
      ? COLUMN_TRACK_SCROLLED
      : COLUMN_TRACK_EXPANDED;
  const boardGridTemplateColumns = [
    ...filteredColumns.map((column) =>
      collapsedColumns[column.id]
        ? COLUMN_TRACK_COLLAPSED
        : expandedColumnWidth,
    ),
    ...(showColumnComposer || showInlineAddLaneCard
      ? [expandedColumnWidth]
      : []),
  ].join(" ");

  async function runAction(task: () => Promise<void>, success: string) {
    setIsBusy(true);
    try {
      await task();
      await onRefresh();
      onNotice(success);
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : "That board action did not finish.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateBoard() {
    if (!boardTitle.trim())
      return onNotice("Give the board a title before creating it.");
    await runAction(async () => {
      const created = await createConversationBoard(
        conversation.id,
        {
          title: boardTitle,
          description: boardDescription.trim() || undefined,
          template: boardTemplate,
        },
        accessToken,
      );
      setBoardTitle("");
      setBoardDescription("");
      setBoardTemplate("KANBAN");
      setSelectedBoardId(created.id);
      setShowPlanningPanel(false);
    }, "Board created.");
  }

  async function handleSaveBoard() {
    if (!selectedBoard) return;
    if (!draftBoardTitle.trim())
      return onNotice("Give the board a title before saving.");
    await runAction(
      () =>
        updateConversationBoard(
          conversation.id,
          selectedBoard.id,
          {
            title: draftBoardTitle,
            description: draftBoardDescription.trim() || undefined,
            template: draftBoardTemplate,
          },
          accessToken,
        ).then(() => undefined),
      "Board settings updated.",
    );
  }

  async function handleSetDefaultBoard() {
    if (!selectedBoard) return;
    await runAction(
      () =>
        updateConversationBoard(
          conversation.id,
          selectedBoard.id,
          { isDefault: true },
          accessToken,
        ).then(() => undefined),
      "Default board updated.",
    );
  }

  async function handleDeleteBoard() {
    if (!selectedBoard) return;
    await runAction(async () => {
      await deleteConversationBoard(
        conversation.id,
        selectedBoard.id,
        accessToken,
      );
      setSelectedBoardId(null);
      setShowPlanningPanel(false);
    }, "Board removed.");
  }

  async function handleCreateColumn() {
    if (!selectedBoard) return onNotice("Choose a board first.");
    if (!newColumnTitle.trim())
      return onNotice("Give the lane a title before creating it.");
    await runAction(async () => {
      await createConversationBoardColumn(
        conversation.id,
        selectedBoard.id,
        {
          title: newColumnTitle,
          color: newColumnColor.trim() || undefined,
          taskStatus: newColumnStatus,
        },
        accessToken,
      );
      setNewColumnTitle("");
      setNewColumnColor("");
      setNewColumnStatus("TODO");
      setShowColumnComposer(false);
    }, "Lane created.");
  }

  async function handleUpdateColumn(
    columnId: string,
    input: {
      title?: string;
      color?: string;
      taskStatus?: ConversationToolTask["status"];
    },
  ) {
    if (!selectedBoard) return;
    if (!input.title?.trim()) {
      onNotice("Give the lane a title before saving.");
      return;
    }

    await runAction(
      () =>
        updateConversationBoardColumn(
          conversation.id,
          selectedBoard.id,
          columnId,
          input,
          accessToken,
        ).then(() => undefined),
      "Lane updated.",
    );
  }

  async function handleCreateSprint() {
    if (!selectedBoard) {
      onNotice("Choose a board before creating a sprint.");
      return;
    }
    if (!sprintTitle.trim()) {
      onNotice("Give the sprint a title first.");
      return;
    }

    await runAction(async () => {
      await createConversationBoardSprint(
        conversation.id,
        selectedBoard.id,
        {
          title: sprintTitle.trim(),
          goal: sprintGoal.trim() || undefined,
          status: sprintStatus,
          startsAt: sprintStartsAt
            ? new Date(sprintStartsAt).toISOString()
            : undefined,
          endsAt: sprintEndsAt ? new Date(sprintEndsAt).toISOString() : undefined,
          sortOrder: selectedBoard.sprints.length,
        },
        accessToken,
      );
      setSprintTitle("");
      setSprintGoal("");
      setSprintStatus("PLANNED");
      setSprintStartsAt("");
      setSprintEndsAt("");
    }, "Sprint created.");
  }

  async function handleSprintStatusChange(
    sprintId: string,
    status: ConversationBoardSprintStatus,
  ) {
    if (!selectedBoard) return;
    await runAction(
      () =>
        updateConversationBoardSprint(
          conversation.id,
          selectedBoard.id,
          sprintId,
          { status },
          accessToken,
        ).then(() => undefined),
      "Sprint updated.",
    );
  }

  async function handleDeleteSprint(sprintId: string) {
    if (!selectedBoard) return;
    await runAction(
      () =>
        deleteConversationBoardSprint(
          conversation.id,
          selectedBoard.id,
          sprintId,
          accessToken,
        ).then(() => undefined),
      "Sprint removed.",
    );
  }

  async function handleDropTask(columnId: string, targetIndex: number) {
    if (!selectedBoard || !draggedTaskId || !dragEnabled) return;
    const targetColumn = selectedBoard.columns.find(
      (column) => column.id === columnId,
    );
    if (!targetColumn) return;

    const sourceColumn = selectedBoard.columns.find((column) =>
      column.tasks.some((task) => task.id === draggedTaskId),
    );
    const sourceTask =
      sourceColumn?.tasks.find((task) => task.id === draggedTaskId) ?? null;
    if (!sourceColumn || !sourceTask) {
      setDraggedTaskId(null);
      return;
    }

    const previousBoards = localBoards;
    const insertIndex = Math.max(
      0,
      Math.min(targetIndex, targetColumn.tasks.length),
    );
    const movedTask: ConversationToolTask = {
      ...sourceTask,
      boardId: selectedBoard.id,
      columnId,
      status: targetColumn.taskStatus,
      sortOrder: insertIndex,
      updatedAt: new Date().toISOString(),
    };

    setLocalBoards((current) =>
      current.map((board) => {
        if (board.id !== selectedBoard.id) {
          return board;
        }

        return {
          ...board,
          columns: board.columns.map((column) => {
            const remainingTasks = column.tasks.filter(
              (task) => task.id !== draggedTaskId,
            );

            if (column.id === columnId) {
              const nextTasks = [
                ...remainingTasks.slice(0, insertIndex),
                movedTask,
                ...remainingTasks.slice(insertIndex),
              ].map((task, index) => ({
                ...task,
                sortOrder: index,
              }));

              return {
                ...column,
                taskStatus: targetColumn.taskStatus,
                tasks: nextTasks,
              };
            }

            return {
              ...column,
              tasks: remainingTasks.map((task, index) => ({
                ...task,
                sortOrder: index,
              })),
            };
          }),
        };
      }),
    );

    setDraggedTaskId(null);
    try {
      await updateConversationToolTask(
        conversation.id,
        draggedTaskId,
        {
          boardId: selectedBoard.id,
          columnId,
          sortOrder: insertIndex,
          status: targetColumn.taskStatus,
        },
        accessToken,
      );
      onNotice("Task moved.");
    } catch (error) {
      setLocalBoards(previousBoards);
      onNotice(
        error instanceof Error
          ? error.message
          : "That task move did not finish.",
      );
    }
  }

  async function handleMoveColumn(columnId: string, direction: "left" | "right") {
    if (!selectedBoard) return;
    const currentIndex = selectedBoard.columns.findIndex((column) => column.id === columnId);
    if (currentIndex === -1) return;
    const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= selectedBoard.columns.length) return;

    const previousBoards = localBoards;
    setLocalBoards((current) =>
      current.map((board) => {
        if (board.id !== selectedBoard.id) {
          return board;
        }

        const nextColumns = [...board.columns];
        const [movedColumn] = nextColumns.splice(currentIndex, 1);
        nextColumns.splice(nextIndex, 0, movedColumn);
        return {
          ...board,
          columns: nextColumns.map((column, index) => ({
            ...column,
            sortOrder: index,
          })),
        };
      }),
    );

    try {
      await updateConversationBoardColumn(
        conversation.id,
        selectedBoard.id,
        columnId,
        { sortOrder: nextIndex },
        accessToken,
      );
      onNotice("Lane order updated.");
    } catch (error) {
      setLocalBoards(previousBoards);
      onNotice(
        error instanceof Error
          ? error.message
          : "That lane move did not finish.",
      );
    }
  }

  function toggleColumnCollapse(columnId: string) {
    setCollapsedColumns((current) => ({
      ...current,
      [columnId]: !current[columnId],
    }));
  }

  if (!selectedBoard && !canManageRoom) {
    return (
      <section className="rounded-[34px] border border-charcoal/10 bg-white p-8 shadow-[0_18px_50px_rgba(24,18,15,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
          Board engine
        </p>
        <h3 className="mt-3 text-3xl font-semibold text-charcoal">
          This room does not have a board yet
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-graphite/68">
          Once a room lead creates the first board, this workspace will turn
          into a full project canvas with lanes, task detail, and role-based
          planning.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-[34px] border border-charcoal/10 bg-white shadow-[0_18px_50px_rgba(24,18,15,0.08)]">
        <div className="border-b border-charcoal/10 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-graphite/62">
                {formatConversationCategory(conversation.category)} board
                workspace
              </p>
              <h2 className="mt-1 text-[2rem] font-semibold text-charcoal">
                {selectedBoard?.title || "Room board"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-graphite/68">
                {selectedBoard?.description ||
                  "Manage work, sprint flow, and board ownership without burying the room under chat noise."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TopAction
                icon={Users}
                label="Members"
                onClick={() => setShowMembersPanel(true)}
              />
              <TopAction
                icon={CalendarDays}
                label="Sprints"
                onClick={() => setShowPlanningPanel(true)}
              />
              <TopAction
                icon={Plus}
                label="New task"
                primary
                onClick={() => {
                  setShowCreateTask(true);
                }}
              />
            </div>
          </div>
        </div>
        <div className="border-b border-charcoal/10 px-6 py-5">
          <div className="grid gap-4 xl:grid-cols-4">
            <HeaderMetric
              label="Workspace"
              title={selectedBoard?.title || "Room board"}
              subtitle={
                selectedBoard?.description || "Board operations for this room"
              }
            />
            <HeaderMetric
              label="Members"
              title={String(selectedBoard?.memberCount ?? 0)}
              subtitle="Board contributors"
            />
            <HeaderMetric
              label="Current sprint"
              title={activeSprint}
              subtitle="Use sprint naming to focus delivery"
            />
            <HeaderMetric
              label="View"
              title={viewMode === "KANBAN" ? "Kanban" : "List"}
              subtitle={
                viewMode === "KANBAN"
                  ? `${Math.min(visibleExpandedColumnCount, MAX_VISIBLE_COLUMNS)} of ${Math.max(filteredColumns.length, MAX_VISIBLE_COLUMNS)} lanes visible before scroll`
                  : `${filteredTaskRows.length} tasks in the current filtered list`
              }
            />
          </div>
        </div>
        <div className="border-b border-charcoal/10 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              {localBoards.map((board) => (
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${selectedBoard?.id === board.id ? "border-charcoal/20 bg-charcoal text-cloud" : "border-charcoal/10 bg-white text-charcoal hover:bg-[#faf7f2]"}`}
                  key={board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                  type="button"
                >
                  {board.title}
                  {board.isDefault ? " • default" : ""}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-2 text-xs font-semibold text-graphite/74">
                {selectedBoard?.columns.length ?? 0} lanes
              </span>
              <div className="inline-flex rounded-full border border-charcoal/10 bg-[#faf7f2] p-1">
                <button
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                    viewMode === "KANBAN"
                      ? "bg-charcoal text-cloud"
                      : "text-charcoal hover:bg-white"
                  }`}
                  onClick={() => setViewMode("KANBAN")}
                  type="button"
                >
                  <KanbanSquare className="h-4 w-4" />
                  Kanban
                </button>
                <button
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                    viewMode === "LIST"
                      ? "bg-charcoal text-cloud"
                      : "text-charcoal hover:bg-white"
                  }`}
                  onClick={() => setViewMode("LIST")}
                  type="button"
                >
                  <LayoutList className="h-4 w-4" />
                  List
                </button>
              </div>
              {selectedBoard?.canManage ? (
                <button
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${showColumnComposer ? "border-charcoal/16 bg-charcoal text-cloud" : "border-charcoal/10 bg-white text-charcoal hover:bg-[#faf7f2]"}`}
                  onClick={() => setShowColumnComposer((current) => !current)}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  {showColumnComposer ? "Close lane editor" : "Add lane"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="border-b border-charcoal/10 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
                Sprint flow
              </p>
              <p className="mt-2 text-sm leading-7 text-graphite/68">
                Create and switch sprints here, then assign tasks into them from
                the new-task form or the task detail page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(selectedBoard?.sprints ?? []).length === 0 ? (
                <button
                  className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-4 py-2 text-sm font-semibold text-charcoal transition hover:bg-white"
                  onClick={() => setShowPlanningPanel(true)}
                  type="button"
                >
                  Create first sprint
                </button>
              ) : (
                (selectedBoard?.sprints ?? []).map((sprint) => (
                  <button
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      sprint.status === "ACTIVE"
                        ? "border-[#9bd0a5] bg-[#eef7ea] text-[#24613a]"
                        : sprint.status === "COMPLETED"
                          ? "border-charcoal/10 bg-white text-graphite/68"
                          : "border-charcoal/10 bg-[#faf7f2] text-charcoal hover:bg-white"
                    }`}
                    key={sprint.id}
                    onClick={() => setShowPlanningPanel(true)}
                    type="button"
                  >
                    {sprint.title}
                    {sprint.status === "ACTIVE"
                      ? " • Active"
                      : sprint.status === "COMPLETED"
                        ? " • Done"
                        : ""}
                  </button>
                ))
              )}
              {selectedBoard?.canManage ? (
                <button
                  className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition hover:bg-[#faf7f2]"
                  onClick={() => setShowPlanningPanel(true)}
                  type="button"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New sprint
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="border-b border-charcoal/10 px-6 py-5">
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            <input
              className="rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-4 py-2.5 text-sm outline-none"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks..."
              value={search}
            />
            <select
              className="rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-4 py-2.5 text-sm outline-none"
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as ConversationToolTask["status"] | "ALL",
                )
              }
              value={statusFilter}
            >
              <option value="ALL">All status</option>
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
            </select>
            <select
              className="rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-4 py-2.5 text-sm outline-none"
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value as ConversationTaskPriority | "ALL",
                )
              }
              value={priorityFilter}
            >
              {priorityFilters.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === "ALL"
                    ? "All priority"
                    : formatPriority(priority)}
                </option>
              ))}
            </select>
            <select
              className="rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-4 py-2.5 text-sm outline-none"
              onChange={(event) => setAssigneeFilter(event.target.value)}
              value={assigneeFilter}
            >
              <option value="ALL">Any assignee</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <button
              className={`rounded-[18px] border px-3.5 py-2.5 text-left text-sm ${
                pinnedOnly
                  ? "border-charcoal/20 bg-white font-semibold text-charcoal"
                  : "border-charcoal/10 bg-[#faf7f2] text-graphite/72"
              }`}
              onClick={() => setPinnedOnly((current) => !current)}
              type="button"
            >
              {pinnedOnly ? "Pinned only" : "Show pinned"}
            </button>
            <select
              className="rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-3.5 py-2.5 text-sm outline-none"
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              value={sortBy}
            >
              <option value="manual">Manual order</option>
              <option value="priority">Priority</option>
              <option value="due">Due date</option>
              <option value="points">Story points</option>
              <option value="updated">Updated</option>
            </select>
            <button
              className="rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-3.5 py-2.5 text-left text-sm font-semibold text-charcoal outline-none"
              onClick={() => setAscending((current) => !current)}
              type="button"
            >
              {ascending ? "Ascending" : "Descending"}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-charcoal/10 bg-white px-3 py-2 text-xs font-semibold text-graphite/72">
                {selectedBoard?.memberCount ?? 0} contributors
              </span>
            </div>
            {!dragEnabled ? (
              <span className="text-xs font-medium text-graphite/58">
                Drag stays available in manual order with no active filters.
              </span>
            ) : null}
          </div>
        </div>
        <div className="px-6 py-6">
          {viewMode === "KANBAN" ? (
            <div className="overflow-x-auto">
              <div
                className="grid min-h-[540px] w-max min-w-full gap-4"
                style={{ gridTemplateColumns: boardGridTemplateColumns }}
              >
                {filteredColumns.map((column, index) => (
                  <BoardKanbanColumn
                    canManage={Boolean(selectedBoard?.canManage)}
                    canMoveLeft={index > 0}
                    canMoveRight={index < filteredColumns.length - 1}
                    collapsed={Boolean(collapsedColumns[column.id])}
                    column={column}
                    dragEnabled={dragEnabled}
                    key={column.id}
                    onColumnDrop={(columnId) => {
                      void handleDropTask(columnId, column.tasks.length);
                    }}
                    onMoveLeft={(columnId) => {
                      void handleMoveColumn(columnId, "left");
                    }}
                    onMoveRight={(columnId) => {
                      void handleMoveColumn(columnId, "right");
                    }}
                    onTaskDragStart={(taskId) => setDraggedTaskId(taskId)}
                    onTaskDrop={(columnId, targetIndex) => {
                      void handleDropTask(columnId, targetIndex);
                    }}
                    onTaskOpen={(task) => {
                      router.push(`/new-shell/tasks/${conversation.id}/${task.id}`);
                    }}
                    onToggleCollapse={toggleColumnCollapse}
                    onUpdateColumn={(columnId, input) => {
                      void handleUpdateColumn(columnId, input);
                    }}
                    tasks={column.tasks}
                  />
                ))}
                {showColumnComposer || showInlineAddLaneCard ? (
                  <LaneComposerCard
                    color={newColumnColor}
                    isBusy={isBusy}
                    isOpen={showColumnComposer}
                    onClose={() => {
                      setShowColumnComposer(false);
                      setNewColumnTitle("");
                      setNewColumnColor("");
                      setNewColumnStatus("TODO");
                    }}
                    onColorChange={setNewColumnColor}
                    onOpen={() => setShowColumnComposer(true)}
                    onSave={() => {
                      void handleCreateColumn();
                    }}
                    onStatusChange={setNewColumnStatus}
                    onTitleChange={setNewColumnTitle}
                    status={newColumnStatus}
                    title={newColumnTitle}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <BoardListView
              items={filteredTaskRows}
              onTaskOpen={(task) => {
                router.push(`/new-shell/tasks/${conversation.id}/${task.id}`);
              }}
            />
          )}
        </div>
      </section>

      {selectedBoard ? (
        <BoardTaskDrawer
          accessToken={accessToken}
          board={selectedBoard}
          conversation={conversation}
          open={showCreateTask}
          onClose={() => {
            setShowCreateTask(false);
          }}
          onNotice={onNotice}
          onRefresh={onRefresh}
          task={null}
        />
      ) : null}
      {selectedBoard && showMembersPanel ? (
        <OverlayPanel
          title="Board members"
          subtitle="Invite contributors, assign roles, and keep board ownership clean."
          onClose={() => setShowMembersPanel(false)}
        >
          <BoardMembersPanel
            accessToken={accessToken}
            board={selectedBoard}
            conversation={conversation}
            onNotice={onNotice}
            onRefresh={onRefresh}
          />
        </OverlayPanel>
      ) : null}
      {showPlanningPanel ? (
        <OverlayPanel
          title="Board planning"
          subtitle="Create boards, set the default workspace, and keep the board identity clean."
          onClose={() => setShowPlanningPanel(false)}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {canManageRoom ? (
              <section className="rounded-[26px] border border-charcoal/10 bg-[#faf7f2] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
                  Create board
                </p>
                <input
                  className="mt-4 w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                  onChange={(event) => setBoardTitle(event.target.value)}
                  placeholder="Board title"
                  value={boardTitle}
                />
                <textarea
                  className="mt-3 min-h-[90px] w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm leading-7 outline-none"
                  onChange={(event) => setBoardDescription(event.target.value)}
                  placeholder="Board description"
                  value={boardDescription}
                />
                <select
                  className="mt-3 w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                  onChange={(event) =>
                    setBoardTemplate(
                      event.target.value as ConversationBoardTemplate,
                    )
                  }
                  value={boardTemplate}
                >
                  {boardTemplates.map((template) => (
                    <option key={template} value={template}>
                      {formatBoardTemplate(template)}
                    </option>
                  ))}
                </select>
                <button
                  className="mt-3 rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => {
                    void handleCreateBoard();
                  }}
                  type="button"
                >
                  Create board
                </button>
              </section>
            ) : null}
            {selectedBoard?.canManage ? (
              <section className="rounded-[26px] border border-charcoal/10 bg-[#faf7f2] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
                  Selected board
                </p>
                <input
                  className="mt-4 w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                  onChange={(event) => setDraftBoardTitle(event.target.value)}
                  placeholder="Board title"
                  value={draftBoardTitle}
                />
                <textarea
                  className="mt-3 min-h-[90px] w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm leading-7 outline-none"
                  onChange={(event) =>
                    setDraftBoardDescription(event.target.value)
                  }
                  placeholder="Board description"
                  value={draftBoardDescription}
                />
                <select
                  className="mt-3 w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                  onChange={(event) =>
                    setDraftBoardTemplate(
                      event.target.value as ConversationBoardTemplate,
                    )
                  }
                  value={draftBoardTemplate}
                >
                  {boardTemplates.map((template) => (
                    <option key={template} value={template}>
                      {formatBoardTemplate(template)}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => {
                      void handleSaveBoard();
                    }}
                    type="button"
                  >
                    Save board
                  </button>
                  {!selectedBoard.isDefault ? (
                    <button
                      className="rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm font-semibold text-charcoal disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => {
                        void handleSetDefaultBoard();
                      }}
                      type="button"
                    >
                      Make default
                    </button>
                  ) : null}
                  <button
                    className="rounded-full border border-[#e5c2b9] bg-[#fff2ee] px-5 py-3 text-sm font-semibold text-[#8c3a27] disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => {
                      void handleDeleteBoard();
                    }}
                    type="button"
                  >
                    Delete board
                  </button>
                </div>
              </section>
            ) : null}
            {selectedBoard?.canManage ? (
              <section className="rounded-[26px] border border-charcoal/10 bg-[#faf7f2] p-4 xl:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
                      Sprint planner
                    </p>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-graphite/68">
                      Create named sprints, shift them from planned to active,
                      and attach delivery windows before tasks move into them.
                    </p>
                  </div>
                  <span className="rounded-full border border-charcoal/10 bg-white px-3 py-2 text-xs font-semibold text-graphite/72">
                    {selectedBoard.sprints.length} sprint
                    {selectedBoard.sprints.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
                  <input
                    className="rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                    onChange={(event) => setSprintTitle(event.target.value)}
                    placeholder="Sprint title"
                    value={sprintTitle}
                  />
                  <input
                    className="rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                    onChange={(event) => setSprintGoal(event.target.value)}
                    placeholder="Sprint goal"
                    value={sprintGoal}
                  />
                  <select
                    className="rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                    onChange={(event) =>
                      setSprintStatus(
                        event.target.value as ConversationBoardSprintStatus,
                      )
                    }
                    value={sprintStatus}
                  >
                    {sprintStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatSprintPanelStatus(status)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                    onChange={(event) => setSprintStartsAt(event.target.value)}
                    type="date"
                    value={sprintStartsAt}
                  />
                  <input
                    className="rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
                    onChange={(event) => setSprintEndsAt(event.target.value)}
                    type="date"
                    value={sprintEndsAt}
                  />
                </div>
                <button
                  className="mt-4 rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => {
                    void handleCreateSprint();
                  }}
                  type="button"
                >
                  Create sprint
                </button>
                <div className="mt-5 space-y-3">
                  {selectedBoard.sprints.length === 0 ? (
                    <div className="rounded-[20px] border border-charcoal/10 bg-white px-4 py-4 text-sm leading-7 text-graphite/64">
                      No sprint has been created for this board yet.
                    </div>
                  ) : (
                    selectedBoard.sprints.map((sprint) => (
                      <article
                        className="rounded-[22px] border border-charcoal/10 bg-white px-4 py-4"
                        key={sprint.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-charcoal">
                              {sprint.title}
                            </p>
                            <p className="mt-1 text-xs text-graphite/58">
                              {sprint.goal || "No sprint goal yet."}
                            </p>
                            <p className="mt-2 text-xs text-graphite/58">
                              {sprint.startsAt
                                ? formatSprintDate(sprint.startsAt)
                                : "No start"}{" "}
                              -{" "}
                              {sprint.endsAt
                                ? formatSprintDate(sprint.endsAt)
                                : "No end"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#faf7f2] px-3 py-1.5 text-xs font-semibold text-graphite/72">
                              {formatSprintPanelStatus(sprint.status)}
                            </span>
                            {sprintStatuses
                              .filter((status) => status !== sprint.status)
                              .map((status) => (
                                <button
                                  className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal"
                                  key={status}
                                  onClick={() => {
                                    void handleSprintStatusChange(
                                      sprint.id,
                                      status,
                                    );
                                  }}
                                  type="button"
                                >
                                  {formatSprintPanelStatus(status)}
                                </button>
                              ))}
                            <button
                              className="rounded-full border border-[#e5c2b9] bg-[#fff2ee] px-3 py-1.5 text-xs font-semibold text-[#8c3a27]"
                              onClick={() => {
                                void handleDeleteSprint(sprint.id);
                              }}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            ) : null}
            {selectedBoard?.canManage ? (
              <section className="rounded-[26px] border border-charcoal/10 bg-[#faf7f2] p-4 xl:col-span-2">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
                  Lane behavior
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-graphite/68">
                  This board is tuned for a four-lane project rhythm. Use the
                  board header to add a new lane and collapse quieter lanes
                  whenever the board needs more breathing room.
                </p>
              </section>
            ) : null}
          </div>
        </OverlayPanel>
      ) : null}
    </>
  );
}

function formatSprintPanelStatus(status: ConversationBoardSprintStatus) {
  return status === "ACTIVE"
    ? "Active"
    : status === "COMPLETED"
      ? "Completed"
      : "Planned";
}

function formatSprintDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function TopAction({
  icon: Icon,
  label,
  onClick,
  primary = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${primary ? "bg-[#3f8f5b] text-white shadow-[0_10px_24px_rgba(63,143,91,0.22)]" : "border border-charcoal/10 bg-white text-charcoal hover:bg-[#faf7f2]"}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function HeaderMetric({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="rounded-[24px] border border-charcoal/10 bg-[#fbfbfd] px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
        {label}
      </p>
      <h3 className="mt-2 text-[1.7rem] font-semibold text-charcoal">
        {title}
      </h3>
      <p className="mt-2 text-sm text-graphite/68">{subtitle}</p>
    </section>
  );
}

function LaneComposerCard({
  title,
  color,
  status,
  isOpen,
  isBusy,
  onOpen,
  onClose,
  onTitleChange,
  onColorChange,
  onStatusChange,
  onSave,
}: {
  title: string;
  color: string;
  status: ConversationToolTask["status"];
  isOpen: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onStatusChange: (value: ConversationToolTask["status"]) => void;
  onSave: () => void;
}) {
  if (!isOpen) {
    return (
      <button
        className="flex min-h-[520px] min-w-[224px] snap-start flex-col items-center justify-center rounded-[24px] border border-dashed border-charcoal/12 bg-[#faf7f2] px-5 text-center transition hover:border-charcoal/20 hover:bg-white"
        onClick={onOpen}
        type="button"
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-charcoal shadow-[0_10px_24px_rgba(24,18,15,0.08)]">
          <Plus className="h-5 w-5" />
        </span>
        <p className="mt-4 text-lg font-semibold text-charcoal">
          Add another lane
        </p>
        <p className="mt-2 max-w-[220px] text-sm leading-7 text-graphite/65">
          Save a new column directly into this board without leaving the canvas.
        </p>
      </button>
    );
  }

  return (
    <section className="min-h-[520px] min-w-[224px] rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4 shadow-[0_10px_24px_rgba(24,18,15,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
            New lane
          </p>
          <h4 className="mt-2 text-xl font-semibold text-charcoal">
            Create and save a column
          </h4>
        </div>
        <button
          className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <input
          className="w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Column title"
          value={title}
        />
        <input
          className="w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
          onChange={(event) => onColorChange(event.target.value)}
          placeholder="Accent color or token"
          value={color}
        />
        <select
          className="w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none"
          onChange={(event) =>
            onStatusChange(event.target.value as ConversationToolTask["status"])
          }
          value={status}
        >
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>

      <button
        className="mt-4 rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud disabled:opacity-50"
        disabled={isBusy}
        onClick={onSave}
        type="button"
      >
        Save column
      </button>

      <div className="mt-6 rounded-[22px] border border-charcoal/10 bg-white p-4 text-sm leading-7 text-graphite/65">
        Keep the core workflow at four strong lanes. Add more only when the
        delivery process truly needs them.
      </div>
    </section>
  );
}

function OverlayPanel({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/35 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-[1480px] overflow-y-auto rounded-[32px] bg-white p-6 shadow-[0_30px_120px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
              {title}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-graphite/68">
              {subtitle}
            </p>
          </div>
          <button
            className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-4 py-2 text-sm font-semibold text-charcoal"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function compareTasks(
  left: ConversationToolTask,
  right: ConversationToolTask,
  sortBy: SortBy,
  ascending: boolean,
) {
  let result = 0;
  switch (sortBy) {
    case "priority":
      result = priorityRank(left.priority) - priorityRank(right.priority);
      break;
    case "due":
      result = compareOptionalDate(left.dueAt, right.dueAt);
      break;
    case "points":
      result = (left.storyPoints ?? 0) - (right.storyPoints ?? 0);
      break;
    case "updated":
      result =
        new Date(left.updatedAt).getTime() -
        new Date(right.updatedAt).getTime();
      break;
    default:
      result = left.sortOrder - right.sortOrder;
      break;
  }
  return ascending ? result : -result;
}

function compareOptionalDate(left: string | null, right: string | null) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return new Date(left).getTime() - new Date(right).getTime();
}

function priorityRank(value: ConversationTaskPriority) {
  switch (value) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    default:
      return 3;
  }
}

function formatBoardTemplate(template: ConversationBoardTemplate) {
  switch (template) {
    case "SPRINT":
      return "Sprint board";
    case "CUSTOM":
      return "Custom workflow";
    default:
      return "Kanban board";
  }
}

function formatPriority(priority: ConversationTaskPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}
