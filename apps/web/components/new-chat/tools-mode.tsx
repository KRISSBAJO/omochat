"use client";

import { ClipboardList } from "lucide-react";
import type { Conversation, ConversationToolsWorkspace } from "../../lib/api-client";
import { RoomToolsWorkspace } from "./tools-workspace";

type ToolsWorkspacePaneProps = {
  accessToken: string;
  conversation: Conversation | null;
  isLoading: boolean;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
  workspace: ConversationToolsWorkspace | null;
};

export function hasCoreWorkspacePack(workspace: ConversationToolsWorkspace | null) {
  return Boolean(
    workspace?.activePacks.some(
      (activation) => activation.pack === "CORE_WORKSPACE" || activation.pack === "BOARDS"
    )
  );
}

export function buildToolsStatusLine(
  conversation: Conversation | null,
  isLoading: boolean,
  workspace: ConversationToolsWorkspace | null
) {
  if (!conversation) {
    return "Choose a room to open its shared tools.";
  }

  if (isLoading) {
    return "Loading the room workspace...";
  }

  if (!workspace) {
    return "This room is still waiting for its tools lane.";
  }

  if (workspace.activePacks.length === 0) {
    return "This room has no active packs yet. Request activation to begin.";
  }

  return `${workspace.activePacks.length} live pack${workspace.activePacks.length === 1 ? "" : "s"} • ${workspace.dashboard.boardCount} boards • ${workspace.dashboard.openTasks} open tasks`;
}

export function ToolsWorkspacePane({
  accessToken,
  conversation,
  isLoading,
  onNotice,
  onRefresh,
  workspace
}: ToolsWorkspacePaneProps) {
  if (conversation) {
    return (
      <RoomToolsWorkspace
        accessToken={accessToken}
        conversation={conversation}
        isLoading={isLoading}
        onNotice={onNotice}
        onRefresh={onRefresh}
        workspace={workspace}
      />
    );
  }

  return (
    <div className="grid flex-1 place-items-center py-10">
      <div className="max-w-md rounded-[28px] bg-white/84 px-8 py-10 text-center shadow-[0_20px_50px_rgba(24,18,15,0.08)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#efe6d7] text-charcoal">
          <ClipboardList className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-[1.65rem] font-semibold text-charcoal">Open a room to use shared tools</h2>
        <p className="mt-3 text-sm leading-7 text-graphite/68">
          Pick a room from the left. Once site admins approve its pack, the board, notes, polls, and care lane will
          all live here.
        </p>
      </div>
    </div>
  );
}
