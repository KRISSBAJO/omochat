"use client";

import { useMemo, useState } from "react";
import { Crown, Plus, Users } from "lucide-react";
import {
  addConversationBoardMember,
  removeConversationBoardMember,
  type Conversation,
  type ConversationBoard,
  type ConversationBoardMemberRole,
  updateConversationBoardMember
} from "../../lib/api-client";

type BoardMembersPanelProps = {
  accessToken: string;
  conversation: Conversation;
  board: ConversationBoard;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
};

const boardRoles: ConversationBoardMemberRole[] = ["MANAGER", "EDITOR", "CONTRIBUTOR", "VIEWER"];

export function BoardMembersPanel({
  accessToken,
  conversation,
  board,
  onNotice,
  onRefresh
}: BoardMembersPanelProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [inviteMemberId, setInviteMemberId] = useState("");
  const [inviteRole, setInviteRole] = useState<ConversationBoardMemberRole>("CONTRIBUTOR");

  const assignableBoardMembers = useMemo(
    () =>
      conversation.participants
        .map((participant) => participant.user)
        .filter((user) => !board.members.some((member) => member.user.id === user.id)),
    [board.members, conversation.participants]
  );

  async function runAction(task: () => Promise<void>, success: string) {
    setIsBusy(true);
    try {
      await task();
      await onRefresh();
      onNotice(success);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "That board member action did not finish.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddMember() {
    if (!inviteMemberId) {
      onNotice("Choose someone to add to this board.");
      return;
    }

    await runAction(
      () =>
        addConversationBoardMember(
          conversation.id,
          board.id,
          {
            userId: inviteMemberId,
            role: inviteRole
          },
          accessToken
        ).then(() => undefined),
      "Board member added."
    );

    setInviteMemberId("");
    setInviteRole("CONTRIBUTOR");
  }

  async function handleUpdateMemberRole(memberUserId: string, role: ConversationBoardMemberRole) {
    await runAction(
      () => updateConversationBoardMember(conversation.id, board.id, memberUserId, role, accessToken).then(() => undefined),
      "Board member role updated."
    );
  }

  async function handleRemoveMember(memberUserId: string) {
    await runAction(
      () => removeConversationBoardMember(conversation.id, board.id, memberUserId, accessToken).then(() => undefined),
      "Board member removed."
    );
  }

  return (
    <section className="rounded-[26px] border border-charcoal/10 bg-[#faf7f2] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Board people</p>
          <h4 className="mt-2 text-lg font-semibold text-charcoal">{board.members.length} active on this board</h4>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-charcoal">
          <Users className="h-4 w-4" />
        </span>
      </div>

      {board.canManageMembers && assignableBoardMembers.length > 0 ? (
        <div className="mt-4 rounded-[22px] border border-charcoal/10 bg-white p-3">
          <select
            className="w-full rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-3 py-3 text-sm outline-none"
            onChange={(event) => setInviteMemberId(event.target.value)}
            value={inviteMemberId}
          >
            <option value="">Choose a room participant</option>
            {assignableBoardMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
          <select
            className="mt-3 w-full rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-3 py-3 text-sm outline-none"
            onChange={(event) => setInviteRole(event.target.value as ConversationBoardMemberRole)}
            value={inviteRole}
          >
            {boardRoles.map((role) => (
              <option key={role} value={role}>
                {formatBoardRole(role)}
              </option>
            ))}
          </select>
          <button
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud disabled:opacity-50"
            disabled={isBusy}
            onClick={() => {
              void handleAddMember();
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Add to board
          </button>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {board.members.map((member) => (
          <article className="rounded-[20px] border border-charcoal/10 bg-white p-3" key={member.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-charcoal">{member.user.displayName}</p>
                  {member.role === "MANAGER" ? <Crown className="h-3.5 w-3.5 text-[#c89f3d]" /> : null}
                </div>
                <p className="mt-1 text-xs text-graphite/58">@{member.user.userCode || member.user.username}</p>
              </div>
              <span className="rounded-full bg-[#faf7f2] px-2.5 py-1 text-[11px] font-semibold text-graphite/72">
                {formatBoardRole(member.role)}
              </span>
            </div>

            {board.canManageMembers ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {boardRoles
                  .filter((role) => role !== member.role)
                  .map((role) => (
                    <button
                      className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-1.5 text-xs font-semibold text-charcoal"
                      key={role}
                      onClick={() => {
                        void handleUpdateMemberRole(member.user.id, role);
                      }}
                      type="button"
                    >
                      {formatBoardRole(role)}
                    </button>
                  ))}
                <button
                  className="rounded-full border border-[#e5c2b9] bg-[#fff2ee] px-3 py-1.5 text-xs font-semibold text-[#8c3a27]"
                  onClick={() => {
                    void handleRemoveMember(member.user.id);
                  }}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatBoardRole(role: ConversationBoardMemberRole) {
  switch (role) {
    case "MANAGER":
      return "Manager";
    case "EDITOR":
      return "Editor";
    case "CONTRIBUTOR":
      return "Contributor";
    default:
      return "Viewer";
  }
}
