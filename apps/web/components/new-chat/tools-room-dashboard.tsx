"use client";

import type { ConversationToolsWorkspace } from "../../lib/api-client";

type RoomToolsMetricsPanelProps = {
  workspace: ConversationToolsWorkspace;
};

type RoomToolsSidebarSummaryProps = {
  workspace: ConversationToolsWorkspace;
  hasCare: boolean;
};

export function RoomToolsMetricsPanel({ workspace }: RoomToolsMetricsPanelProps) {
  return (
    <div className="grid gap-3 rounded-[28px] border border-charcoal/10 bg-[#faf7f2] p-4 sm:min-w-[320px]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Room dashboard</p>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Boards" value={workspace.dashboard.boardCount} />
        <MetricCard label="Open tasks" value={workspace.dashboard.openTasks} />
        <MetricCard label="Live polls" value={workspace.dashboard.livePollCount} />
        <MetricCard label="Prayer lane" value={workspace.dashboard.prayerCount} />
      </div>
    </div>
  );
}

export function RoomToolsSidebarSummary({ workspace, hasCare }: RoomToolsSidebarSummaryProps) {
  const careTitle = hasCare
    ? workspace.dashboard.latestPrayer?.title || "No care requests open"
    : "Private until approved";
  const careBody = hasCare
    ? workspace.dashboard.latestPrayer
      ? `${workspace.dashboard.latestPrayer.supportCount} people are standing with this request.`
      : "Prayer and support requests will appear here once the room starts using them."
    : "Announcements, prayer requests, and follow-up stay hidden until a site admin approves this pack for the room.";

  return (
    <>
      <SummaryCard
        body={workspace.dashboard.latestAnnouncement?.body || "No announcement is pinned right now."}
        label="Latest announcement"
        title={workspace.dashboard.latestAnnouncement?.title || "Nothing posted yet"}
      />
      <SummaryCard
        body={
          workspace.dashboard.defaultBoard
            ? `${workspace.dashboard.defaultBoard.memberCount} members and ${workspace.dashboard.defaultBoard.taskCount} tasks are active in the default board.`
            : "No board is pinned as the default workspace yet."
        }
        label="Default board"
        title={workspace.dashboard.defaultBoard?.title || "No board running"}
      />
      <SummaryCard
        body={
          workspace.dashboard.nextTask
            ? `${workspace.dashboard.nextTask.assignedTo?.displayName ?? "Unassigned"}${workspace.dashboard.nextTask.dueAt ? ` - due ${formatWhen(workspace.dashboard.nextTask.dueAt)}` : ""}`
            : "No active task is waiting right now."
        }
        label="Next task"
        title={workspace.dashboard.nextTask?.title || "Nothing queued"}
      />
      <SummaryCard
        body={
          workspace.dashboard.activePoll
            ? `${workspace.dashboard.activePoll.totalVotes} vote${workspace.dashboard.activePoll.totalVotes === 1 ? "" : "s"} recorded so far.`
            : "No live poll is open right now."
        }
        label="Active poll"
        title={workspace.dashboard.activePoll?.question || "No poll running"}
      />
      <SummaryCard body={careBody} label="Care lane" title={careTitle} />
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function SummaryCard({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">{label}</p>
      <h3 className="mt-2 text-xl font-semibold text-charcoal">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-graphite/68">{body}</p>
    </section>
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
    minute: "2-digit"
  }).format(new Date(value));
}
