"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCheck,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  NotebookText,
  Sparkles,
  Vote,
} from "lucide-react";
import {
  type Conversation,
  type ConversationToolNote,
  type ConversationToolPack,
  type ConversationToolPoll,
  type ConversationToolRequest,
  type ConversationToolRequestStatus,
  type ConversationToolsWorkspace,
  createConversationToolNote,
  createConversationToolPoll,
  requestConversationToolPack,
  updateConversationToolNote,
  updateConversationToolPoll,
  voteConversationToolPoll,
} from "../../lib/api-client";
import { RoomBoardWorkspace } from "./tools-board-workspace";
import { AttendanceWorkspace } from "./tools-attendance-workspace";
import { CommunityCareWorkspace } from "./tools-community-care-workspace";
import {
  describeRecommendedCategories,
  formatConversationCategory,
  getToolPackMeta,
} from "./tools-registry";
import { RoomToolsTeamPanel } from "./tools-room-team-panel";

type RoomToolsWorkspaceProps = {
  accessToken: string;
  conversation: Conversation;
  workspace: ConversationToolsWorkspace | null;
  isLoading: boolean;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
};

type ToolsTab = "GENERAL" | ConversationToolPack;

const toolTabs: ToolsTab[] = [
  "GENERAL",
  "BOARDS",
  "ATTENDANCE",
  "COMMUNITY_CARE",
  "CORE_WORKSPACE",
];
const packTabs: ConversationToolPack[] = [
  "BOARDS",
  "ATTENDANCE",
  "COMMUNITY_CARE",
  "CORE_WORKSPACE",
];

export function RoomToolsWorkspace({
  accessToken,
  conversation,
  workspace,
  isLoading,
  onNotice,
  onRefresh,
}: RoomToolsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ToolsTab>("GENERAL");
  const [isBusy, setIsBusy] = useState(false);
  const [sharedNoteTitle, setSharedNoteTitle] = useState("");
  const [sharedNoteBody, setSharedNoteBody] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [requestNotes, setRequestNotes] = useState<Record<ConversationToolPack, string>>({
    CORE_WORKSPACE: "",
    COMMUNITY_CARE: "",
    BOARDS: "",
    ATTENDANCE: "",
  });

  const activePacks = useMemo(
    () => new Set(workspace?.activePacks.map((item) => item.pack) ?? []),
    [workspace?.activePacks],
  );
  const latestRequestByPack = useMemo(() => {
    const next = new Map<ConversationToolPack, ConversationToolRequest>();
    const sorted = [...(workspace?.requests ?? [])].sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
    for (const request of sorted) {
      if (!next.has(request.pack)) {
        next.set(request.pack, request);
      }
    }
    return next;
  }, [workspace?.requests]);

  const notes = (workspace?.notes ?? []).filter((note) => note.kind === "NOTE");
  const hasCore = activePacks.has("CORE_WORKSPACE");
  const hasCare = activePacks.has("COMMUNITY_CARE");
  const hasBoards = activePacks.has("BOARDS");
  const hasAttendance = activePacks.has("ATTENDANCE");
  const pendingRequestCount = (workspace?.requests ?? []).filter(
    (request) => request.status === "PENDING",
  ).length;

  function getPackStatus(
    pack: ConversationToolPack,
  ): ConversationToolRequestStatus | "LOCKED" {
    if (activePacks.has(pack)) {
      return "APPROVED";
    }
    return latestRequestByPack.get(pack)?.status ?? "LOCKED";
  }

  async function runAction(task: () => Promise<void>, success: string) {
    setIsBusy(true);
    try {
      await task();
      await onRefresh();
      onNotice(success);
    } catch (error) {
      onNotice(
        error instanceof Error ? error.message : "That tools action did not finish.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRequestPack(pack: ConversationToolPack) {
    await runAction(
      async () => {
        await requestConversationToolPack(
          conversation.id,
          { pack, note: requestNotes[pack].trim() || undefined },
          accessToken,
        );
        setRequestNotes((current) => ({ ...current, [pack]: "" }));
      },
      `${getToolPackMeta(workspace, pack).title} request sent for site admin review.`,
    );
  }

  async function handleCreateSharedNote() {
    if (!sharedNoteTitle.trim() || !sharedNoteBody.trim()) {
      onNotice("Give the note a title and body before saving it.");
      return;
    }

    await runAction(
      async () => {
        await createConversationToolNote(
          conversation.id,
          { kind: "NOTE", title: sharedNoteTitle, body: sharedNoteBody },
          accessToken,
        );
        setSharedNoteTitle("");
        setSharedNoteBody("");
      },
      "Shared note saved.",
    );
  }

  async function handleCreatePoll() {
    const options = pollOptions
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) {
      onNotice("Ask a question and add at least two options.");
      return;
    }

    await runAction(
      async () => {
        await createConversationToolPoll(
          conversation.id,
          { question: pollQuestion, options },
          accessToken,
        );
        setPollQuestion("");
        setPollOptions("");
      },
      "Poll published in the room.",
    );
  }

  if (isLoading) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-10">
        <div className="flex items-center gap-3 rounded-full bg-white px-5 py-4 text-sm font-semibold text-charcoal shadow-[0_16px_40px_rgba(24,18,15,0.08)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Opening tools for this room...
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-10">
        <div className="max-w-lg rounded-[32px] bg-white/84 px-8 py-10 text-center shadow-[0_24px_60px_rgba(24,18,15,0.08)]">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#efe6d7] text-charcoal">
            <Sparkles className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-[1.9rem] font-semibold text-charcoal">
            This room tools lane is not ready yet
          </h2>
          <p className="mt-3 text-sm leading-7 text-graphite/68">
            Refresh the room or open another conversation and come back.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex w-full min-w-0 flex-col gap-5">
        <section className="rounded-[32px] border border-charcoal/10 bg-white p-5 shadow-[0_20px_60px_rgba(24,18,15,0.06)]">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_340px]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#faf7f2] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-graphite/58">
                <Sparkles className="h-3.5 w-3.5" />
                Tools identity
              </p>
              <h2 className="mt-4 text-[2rem] font-semibold leading-tight text-charcoal">
                Shared planning for {workspace.conversation.title ?? "this room"} starts here.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-graphite/68">
                Use the tabs to move through the room workspace. Each lane stays
                focused on its own work instead of mixing boards, care, and notes
                together.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {toolTabs.map((tab) => (
                  <button
                    className={buildTabClass(tab, activeTab, getPackStatus)}
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-2">
                      {renderTabIcon(
                        tab,
                        workspace,
                        tab === "GENERAL" ? "LOCKED" : getPackStatus(tab),
                      )}
                      {tabLabel(tab)}
                    </span>
                    {tab !== "GENERAL" ? (
                      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]">
                        {formatApprovalState(getPackStatus(tab))}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <TabSummaryPanel
              activeTab={activeTab}
              participantCount={workspace.conversation.participantCount}
              pendingRequestCount={pendingRequestCount}
              workspace={workspace}
            />
          </div>
        </section>

        {activeTab === "GENERAL" ? (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
            <RoomToolsTeamPanel
              accessToken={accessToken}
              canManage={workspace.access.canManage}
              conversation={conversation}
              onNotice={onNotice}
              onRefresh={onRefresh}
            />
            <PackOverviewPanel
              getPackStatus={getPackStatus}
              onOpenPack={(pack) => setActiveTab(pack)}
              workspace={workspace}
            />
          </section>
        ) : null}

        {activeTab === "BOARDS" ? (
          hasBoards ? (
            <RoomBoardWorkspace
              accessToken={accessToken}
              boards={workspace.boards}
              canManageRoom={workspace.access.canManage}
              conversation={conversation}
              onNotice={onNotice}
              onRefresh={onRefresh}
            />
          ) : (
            <FocusedPackPanel
              canRequest={workspace.access.canRequest}
              isBusy={isBusy}
              onNoteChange={(value) =>
                setRequestNotes((current) => ({ ...current, BOARDS: value }))
              }
              onOpenGeneral={() => setActiveTab("GENERAL")}
              onRequest={() => {
                void handleRequestPack("BOARDS");
              }}
              request={latestRequestByPack.get("BOARDS")}
              requestNote={requestNotes.BOARDS}
              workspace={workspace}
              pack="BOARDS"
            />
          )
        ) : null}

        {activeTab === "ATTENDANCE" ? (
          hasAttendance ? (
            <AttendanceWorkspace
              accessToken={accessToken}
              canManageRoom={workspace.access.canManage}
              conversation={conversation}
              onNotice={onNotice}
              onRefresh={onRefresh}
              workspace={workspace}
            />
          ) : (
            <FocusedPackPanel
              canRequest={workspace.access.canRequest}
              isBusy={isBusy}
              onNoteChange={(value) =>
                setRequestNotes((current) => ({ ...current, ATTENDANCE: value }))
              }
              onOpenGeneral={() => setActiveTab("GENERAL")}
              onRequest={() => {
                void handleRequestPack("ATTENDANCE");
              }}
              request={latestRequestByPack.get("ATTENDANCE")}
              requestNote={requestNotes.ATTENDANCE}
              workspace={workspace}
              pack="ATTENDANCE"
            />
          )
        ) : null}

        {activeTab === "CORE_WORKSPACE" ? (
          hasCore ? (
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
              <div className="space-y-5">
                <SectionCard
                  body="Capture room memory, decisions, and practical next steps without losing the thread."
                  eyebrow="Core workspace"
                  title="Shared notes"
                >
                  <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <input
                      className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                      onChange={(event) => setSharedNoteTitle(event.target.value)}
                      placeholder="Note title"
                      value={sharedNoteTitle}
                    />
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => {
                        void handleCreateSharedNote();
                      }}
                      type="button"
                    >
                      <NotebookText className="h-4 w-4" />
                      Save note
                    </button>
                  </div>
                  <textarea
                    className="mt-3 min-h-[140px] w-full rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
                    onChange={(event) => setSharedNoteBody(event.target.value)}
                    placeholder="Capture the note, meeting summary, or room plan."
                    value={sharedNoteBody}
                  />
                  <div className="mt-5">
                    <NoteLane
                      emptyText="Shared notes will appear here once the room starts saving them."
                      items={notes}
                      onTogglePin={(note) => {
                        void runAction(
                          () =>
                            updateConversationToolNote(
                              conversation.id,
                              note.id,
                              { pinned: !note.pinnedAt },
                              accessToken,
                            ).then(() => undefined),
                          note.pinnedAt ? "Note unpinned." : "Note pinned.",
                        );
                      }}
                      title="Shared notes"
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  body="Run lightweight polls inside the room without opening a separate thread."
                  eyebrow="Core workspace"
                  title="Polls"
                >
                  <input
                    className="w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                    onChange={(event) => setPollQuestion(event.target.value)}
                    placeholder="Poll question"
                    value={pollQuestion}
                  />
                  <textarea
                    className="mt-3 min-h-[120px] w-full rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
                    onChange={(event) => setPollOptions(event.target.value)}
                    placeholder={"One option per line\nFriday evening\nSaturday morning"}
                    value={pollOptions}
                  />
                  <button
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => {
                      void handleCreatePoll();
                    }}
                    type="button"
                  >
                    <Vote className="h-4 w-4" />
                    Publish poll
                  </button>
                  <div className="mt-5 space-y-4">
                    {(workspace.polls ?? []).length === 0 ? (
                      <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-5 text-sm leading-7 text-graphite/64">
                        No polls yet. The first question will appear here.
                      </div>
                    ) : (
                      workspace.polls.map((poll) => (
                        <PollCard
                          canManage={workspace.access.canManage}
                          key={poll.id}
                          onCloseToggle={() => {
                            void runAction(
                              () =>
                                updateConversationToolPoll(
                                  conversation.id,
                                  poll.id,
                                  { closed: !poll.closedAt },
                                  accessToken,
                                ).then(() => undefined),
                              poll.closedAt ? "Poll reopened." : "Poll closed.",
                            );
                          }}
                          onVote={(optionId) => {
                            void runAction(
                              () =>
                                voteConversationToolPoll(
                                  conversation.id,
                                  poll.id,
                                  optionId,
                                  accessToken,
                                ).then(() => undefined),
                              "Poll vote updated.",
                            );
                          }}
                          poll={poll}
                        />
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>

              <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
                <SummaryCard
                  body={
                    notes[0]
                      ? `Latest note updated ${formatWhen(notes[0].updatedAt) || "recently"}.`
                      : "No shared note is pinned or saved yet."
                  }
                  label="Shared notes"
                  title={notes[0]?.title || "No notes yet"}
                />
                <SummaryCard
                  body={
                    workspace.dashboard.activePoll
                      ? `${workspace.dashboard.activePoll.totalVotes} vote${
                          workspace.dashboard.activePoll.totalVotes === 1 ? "" : "s"
                        } recorded so far.`
                      : "No live poll is open right now."
                  }
                  label="Active poll"
                  title={workspace.dashboard.activePoll?.question || "No poll running"}
                />
                <SummaryCard
                  body={
                    workspace.dashboard.nextTask
                      ? `${workspace.dashboard.nextTask.assignedTo?.displayName ?? "Unassigned"}${
                          workspace.dashboard.nextTask.dueAt
                            ? ` - due ${formatWhen(workspace.dashboard.nextTask.dueAt)}`
                            : ""
                        }`
                      : "No active task is waiting right now."
                  }
                  label="Next task"
                  title={workspace.dashboard.nextTask?.title || "Nothing queued"}
                />
              </aside>
            </section>
          ) : (
            <FocusedPackPanel
              canRequest={workspace.access.canRequest}
              isBusy={isBusy}
              onNoteChange={(value) =>
                setRequestNotes((current) => ({ ...current, CORE_WORKSPACE: value }))
              }
              onOpenGeneral={() => setActiveTab("GENERAL")}
              onRequest={() => {
                void handleRequestPack("CORE_WORKSPACE");
              }}
              request={latestRequestByPack.get("CORE_WORKSPACE")}
              requestNote={requestNotes.CORE_WORKSPACE}
              workspace={workspace}
              pack="CORE_WORKSPACE"
            />
          )
        ) : null}

        {activeTab === "COMMUNITY_CARE" ? (
          hasCare ? (
            <CommunityCareWorkspace
              accessToken={accessToken}
              canManageRoom={workspace.access.canManage}
              conversation={conversation}
              onNotice={onNotice}
              onRefresh={onRefresh}
              workspace={workspace}
            />
          ) : (
            <FocusedPackPanel
              canRequest={workspace.access.canRequest}
              isBusy={isBusy}
              onNoteChange={(value) =>
                setRequestNotes((current) => ({ ...current, COMMUNITY_CARE: value }))
              }
              onOpenGeneral={() => setActiveTab("GENERAL")}
              onRequest={() => {
                void handleRequestPack("COMMUNITY_CARE");
              }}
              request={latestRequestByPack.get("COMMUNITY_CARE")}
              requestNote={requestNotes.COMMUNITY_CARE}
              workspace={workspace}
              pack="COMMUNITY_CARE"
            />
          )
        ) : null}
      </div>
    </div>
  );
}

function PackOverviewPanel({
  workspace,
  getPackStatus,
  onOpenPack,
}: {
  workspace: ConversationToolsWorkspace;
  getPackStatus: (
    pack: ConversationToolPack,
  ) => ConversationToolRequestStatus | "LOCKED";
  onOpenPack: (pack: ConversationToolPack) => void;
}) {
  return (
    <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
            Pack overview
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-charcoal">
            Open the right lane for this room
          </h3>
          <p className="mt-2 text-sm leading-7 text-graphite/68">
            The tabs above are the real workspace switcher. This overview only
            shows which lanes are live and where to go next.
          </p>
        </div>
        <span className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-2 text-xs font-semibold text-graphite/72">
          {workspace.activePacks.length} live
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        {packTabs.map((pack) => (
          <PackOverviewCard
            key={pack}
            onOpen={() => onOpenPack(pack)}
            request={workspace.requests.find((item) => item.pack === pack) ?? null}
            status={getPackStatus(pack)}
            workspace={workspace}
            pack={pack}
          />
        ))}
      </div>
    </section>
  );
}

function PackOverviewCard({
  pack,
  workspace,
  status,
  request,
  onOpen,
}: {
  pack: ConversationToolPack;
  workspace: ConversationToolsWorkspace;
  status: ConversationToolRequestStatus | "LOCKED";
  request: ConversationToolRequest | null;
  onOpen: () => void;
}) {
  const meta = getToolPackMeta(workspace, pack);
  const Icon = meta.icon;
  const isApproved = status === "APPROVED";

  return (
    <article
      className={`rounded-[24px] border p-4 shadow-[0_12px_30px_rgba(24,18,15,0.04)] transition ${
        isApproved
          ? "border-[#c8e5cd] bg-[#eef7ea]"
          : "border-charcoal/10 bg-[#faf7f2]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`grid h-11 w-11 place-items-center rounded-2xl ${
              isApproved ? "bg-white text-[#24613a]" : "bg-white text-charcoal"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-charcoal">{meta.title}</p>
              <ApprovalChip status={status} />
            </div>
            <p className="mt-2 text-sm leading-7 text-graphite/68">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-6 text-graphite/58">
        Best fit: {describeRecommendedCategories(meta.recommendedCategories)}
      </p>

      {request ? <StatusBox request={request} /> : null}

      <button
        className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
          isApproved
            ? "border-[#9bd0a5] bg-white text-[#24613a]"
            : "border-charcoal/10 bg-white text-charcoal hover:bg-[#fffdf9]"
        }`}
        onClick={onOpen}
        type="button"
      >
        {isApproved ? <BadgeCheck className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        {isApproved ? "Open lane" : status === "PENDING" ? "View request" : "Go to lane"}
      </button>
    </article>
  );
}

function FocusedPackPanel({
  pack,
  workspace,
  request,
  requestNote,
  canRequest,
  isBusy,
  onNoteChange,
  onRequest,
  onOpenGeneral,
}: {
  pack: ConversationToolPack;
  workspace: ConversationToolsWorkspace;
  request: ConversationToolRequest | undefined;
  requestNote: string;
  canRequest: boolean;
  isBusy: boolean;
  onNoteChange: (value: string) => void;
  onRequest: () => void;
  onOpenGeneral: () => void;
}) {
  const meta = getToolPackMeta(workspace, pack);
  const Icon = meta.icon;
  const status = request?.status ?? "LOCKED";

  return (
    <section className="rounded-[32px] border border-charcoal/10 bg-white p-6 shadow-[0_18px_50px_rgba(24,18,15,0.08)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_340px]">
        <div>
          <span className="grid h-14 w-14 place-items-center rounded-[22px] bg-[#efe6d7] text-charcoal">
            <Icon className="h-6 w-6" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
            {tabLabel(pack)}
          </p>
          <h3 className="mt-3 text-3xl font-semibold text-charcoal">{meta.title}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-graphite/68">
            {meta.subtitle}
          </p>
          <p className="mt-4 text-sm leading-7 text-graphite/64">
            This lane is not live in the room yet. Once it is approved, the tab
            becomes active and the room can work directly from here.
          </p>

          {canRequest ? (
            <>
              <textarea
                className="mt-5 min-h-[120px] w-full rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Tell the site admin why this room needs this pack."
                value={requestNote}
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                  disabled={isBusy || status === "PENDING"}
                  onClick={onRequest}
                  type="button"
                >
                  <ArrowRight className="h-4 w-4" />
                  {status === "PENDING"
                    ? "Waiting on review"
                    : status === "DECLINED"
                      ? "Request again"
                      : "Request activation"}
                </button>
                <button
                  className="rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal"
                  onClick={onOpenGeneral}
                  type="button"
                >
                  Back to general room
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite/64">
              Only room leads can request this pack from the site admin desk.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SummaryCard
            body={describeRecommendedCategories(meta.recommendedCategories)}
            label="Recommended for"
            title={formatConversationCategory(workspace.conversation.category)}
          />
          <SummaryCard
            body={
              request?.reviewNote ||
              request?.note ||
              "No request note has been added for this pack in this room yet."
            }
            label="Approval state"
            title={formatApprovalState(status)}
          />
        </div>
      </div>
    </section>
  );
}

function buildTabClass(
  tab: ToolsTab,
  activeTab: ToolsTab,
  getPackStatus: (
    pack: ConversationToolPack,
  ) => ConversationToolRequestStatus | "LOCKED",
) {
  const isActive = tab === activeTab;
  if (tab === "GENERAL") {
    return `inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "border-charcoal/18 bg-charcoal text-cloud shadow-[0_10px_24px_rgba(24,18,15,0.16)]"
        : "border-charcoal/10 bg-white text-charcoal hover:bg-[#faf7f2]"
    }`;
  }

  const status = getPackStatus(tab);
  const isApproved = status === "APPROVED";

  if (isApproved) {
    return `inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "border-[#9bd0a5] bg-[#dff2e1] text-[#215a35] shadow-[0_10px_24px_rgba(55,128,76,0.14)]"
        : "border-[#c8e5cd] bg-[#eef7ea] text-[#24613a] hover:bg-[#e7f5e7]"
    }`;
  }

  return `inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
    isActive
      ? "border-charcoal/18 bg-[#faf7f2] text-charcoal shadow-[0_10px_24px_rgba(24,18,15,0.08)]"
      : "border-charcoal/10 bg-white text-charcoal hover:bg-[#faf7f2]"
  }`;
}

function renderTabIcon(
  tab: ToolsTab,
  workspace: ConversationToolsWorkspace,
  status: ConversationToolRequestStatus | "LOCKED",
) {
  if (tab === "GENERAL") {
    return <Sparkles className="h-4 w-4" />;
  }

  const Icon = getToolPackMeta(workspace, tab).icon;
  if (status === "APPROVED") {
    return <BadgeCheck className="h-4 w-4" />;
  }
  if (status === "PENDING") {
    return <Clock3 className="h-4 w-4" />;
  }
  if (status === "DECLINED") {
    return <LockKeyhole className="h-4 w-4" />;
  }
  return <Icon className="h-4 w-4" />;
}

function tabLabel(tab: ToolsTab) {
  switch (tab) {
    case "BOARDS":
      return "Boards";
    case "ATTENDANCE":
      return "Time & attendance";
    case "COMMUNITY_CARE":
      return "Community care";
    case "CORE_WORKSPACE":
      return "Core workspace";
    default:
      return "General room";
  }
}

function formatApprovalState(
  status: ConversationToolRequestStatus | "LOCKED",
) {
  switch (status) {
    case "APPROVED":
      return "live";
    case "PENDING":
      return "pending";
    case "DECLINED":
      return "declined";
    default:
      return "request";
  }
}

function TabSummaryPanel({
  activeTab,
  participantCount,
  pendingRequestCount,
  workspace,
}: {
  activeTab: ToolsTab;
  participantCount: number;
  pendingRequestCount: number;
  workspace: ConversationToolsWorkspace;
}) {
  if (activeTab === "BOARDS") {
    return (
      <SummaryPanelShell label="Boards lane">
        <MetricCard label="Boards" value={workspace.dashboard.boardCount} />
        <MetricCard label="Open tasks" value={workspace.dashboard.openTasks} />
        <MetricCard
          label="In progress"
          value={workspace.dashboard.inProgressTasks}
        />
        <MetricCard label="Done" value={workspace.dashboard.completedTasks} />
      </SummaryPanelShell>
    );
  }

  if (activeTab === "CORE_WORKSPACE") {
    return (
      <SummaryPanelShell label="Core workspace">
        <MetricCard label="Notes" value={workspace.dashboard.noteCount} />
        <MetricCard label="Live polls" value={workspace.dashboard.livePollCount} />
        <MetricCard label="Open tasks" value={workspace.dashboard.openTasks} />
        <MetricCard label="People here" value={participantCount} />
      </SummaryPanelShell>
    );
  }

  if (activeTab === "ATTENDANCE") {
    return (
      <SummaryPanelShell label="Time & attendance">
        <MetricCard
          label="Templates"
          value={workspace.dashboard.attendanceTemplateCount}
        />
        <MetricCard
          label="Scheduled"
          value={workspace.dashboard.scheduledShiftCount}
        />
        <MetricCard
          label="On clock"
          value={workspace.dashboard.onClockCount}
        />
        <MetricCard
          label="Approvals"
          value={workspace.dashboard.pendingAttendanceApprovals}
        />
      </SummaryPanelShell>
    );
  }

  if (activeTab === "COMMUNITY_CARE") {
    return (
      <SummaryPanelShell label="Community care">
        <MetricCard
          label="Announcements"
          value={workspace.dashboard.announcementCount}
        />
        <MetricCard label="Prayer lane" value={workspace.dashboard.prayerCount} />
        <MetricCard
          label="Live polls"
          value={workspace.dashboard.livePollCount}
        />
        <MetricCard label="People here" value={participantCount} />
      </SummaryPanelShell>
    );
  }

  return (
    <SummaryPanelShell label="Room dashboard">
      <MetricCard label="Boards" value={workspace.dashboard.boardCount} />
      <MetricCard label="Open tasks" value={workspace.dashboard.openTasks} />
      <MetricCard label="Pending" value={pendingRequestCount} />
      <MetricCard label="Active packs" value={workspace.activePacks.length} />
    </SummaryPanelShell>
  );
}

function SummaryPanelShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-[28px] border border-charcoal/10 bg-[#faf7f2] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-graphite/55">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-charcoal">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-graphite/68">{body}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ApprovalChip({
  status,
}: {
  status: ConversationToolRequestStatus | "LOCKED";
}) {
  const classes =
    status === "APPROVED"
      ? "bg-white text-[#24613a]"
      : status === "PENDING"
        ? "bg-[#fff6dd] text-[#7c5b1d]"
        : status === "DECLINED"
          ? "bg-[#fff2ee] text-[#8d4e40]"
          : "bg-white text-graphite/72";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${classes}`}
    >
      {formatApprovalState(status)}
    </span>
  );
}

function StatusBox({ request }: { request: ConversationToolRequest }) {
  const tone =
    request.status === "PENDING"
      ? "border-[#e4c77b] bg-[#fff7de]"
      : request.status === "DECLINED"
        ? "border-[#e5c2b9] bg-[#fff2ee]"
        : "border-[#c8e5cd] bg-[#eef7ea]";
  const title =
    request.status === "PENDING"
      ? "Pending site-admin review"
      : request.status === "DECLINED"
        ? "Request declined for now"
        : "Already approved";

  return (
    <div
      className={`mt-4 rounded-[20px] border px-4 py-3 text-sm leading-7 text-charcoal ${tone}`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">
        {request.reviewNote || request.note || "No note was added to this request yet."}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
        {label}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-charcoal">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-graphite/68">{body}</p>
    </section>
  );
}

function NoteLane({
  title,
  items,
  emptyText,
  onTogglePin,
}: {
  title: string;
  items: ConversationToolNote[];
  emptyText: string;
  onTogglePin: (note: ConversationToolNote) => void;
}) {
  return (
    <div className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-charcoal">{title}</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-graphite/70">
          {items.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[20px] bg-white px-4 py-4 text-sm leading-7 text-graphite/62">
            {emptyText}
          </div>
        ) : (
          items.map((note) => (
            <article
              className="rounded-[22px] border border-charcoal/10 bg-white p-4"
              key={note.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-charcoal">{note.title}</p>
                  <p className="mt-1 text-xs text-graphite/58">
                    By {note.createdBy.displayName}
                  </p>
                </div>
                <button
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    note.pinnedAt
                      ? "bg-charcoal text-cloud"
                      : "border border-charcoal/10 bg-[#faf7f2] text-charcoal"
                  }`}
                  onClick={() => onTogglePin(note)}
                  type="button"
                >
                  {note.pinnedAt ? "Pinned" : "Pin"}
                </button>
              </div>
              <p className="mt-3 text-sm leading-7 text-graphite/68">{note.body}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function PollCard({
  poll,
  canManage,
  onVote,
  onCloseToggle,
}: {
  poll: ConversationToolPoll;
  canManage: boolean;
  onVote: (optionId: string) => void;
  onCloseToggle: () => void;
}) {
  return (
    <article className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-charcoal">{poll.question}</p>
          <p className="mt-1 text-xs text-graphite/58">
            By {poll.createdBy.displayName} • {poll.totalVotes} votes
          </p>
        </div>
        {canManage ? (
          <button
            className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal"
            onClick={onCloseToggle}
            type="button"
          >
            {poll.closedAt ? "Reopen" : "Close poll"}
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {poll.options.map((option) => {
          const selected = poll.viewerVoteOptionId === option.id;
          return (
            <button
              className={`rounded-[20px] border px-4 py-4 text-left transition ${
                selected
                  ? "border-charcoal/16 bg-white text-charcoal"
                  : "border-charcoal/10 bg-white/60 text-charcoal"
              }`}
              disabled={Boolean(poll.closedAt)}
              key={option.id}
              onClick={() => onVote(option.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{option.label}</p>
                <span className="rounded-full bg-[#faf7f2] px-2.5 py-1 text-[11px] font-semibold text-graphite/72">
                  {option.voteCount}
                </span>
              </div>
              {selected ? (
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#eef7ea] px-2.5 py-1 text-[11px] font-semibold text-[#24613a]">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Your vote
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function formatWhen(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
