"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LoaderCircle, Search, Shield, UserPlus, Users, X } from "lucide-react";
import {
  addConversationMembers,
  createConversation,
  searchUsers,
  type Conversation,
  type SearchUser,
  updateConversationMemberRole,
} from "../../lib/api-client";

type RoomToolsTeamPanelProps = {
  accessToken: string;
  conversation: Conversation;
  canManage: boolean;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
};

export function RoomToolsTeamPanel({
  accessToken,
  conversation,
  canManage,
  onNotice,
  onRefresh,
}: RoomToolsTeamPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [groupTitle, setGroupTitle] = useState("");

  const isDirectConversation = conversation.type === "DIRECT";

  const existingUserIds = useMemo(
    () => new Set(conversation.participants.map((participant) => participant.user.id)),
    [conversation.participants],
  );
  const selectedUserIds = useMemo(
    () => new Set(selectedUsers.map((user) => user.id)),
    [selectedUsers],
  );

  useEffect(() => {
    if (!canManage || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    searchUsers(query.trim(), accessToken)
      .then((items) => {
        if (!active) {
          return;
        }
        setResults(
          items.filter(
            (item) =>
              !existingUserIds.has(item.id) && !selectedUserIds.has(item.id),
          ),
        );
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        onNotice(
          error instanceof Error
            ? error.message
            : "Could not search for more room members.",
        );
      })
      .finally(() => {
        if (active) {
          setIsSearching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, canManage, existingUserIds, onNotice, query, selectedUserIds]);

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
          : "That team action did not finish.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateGroupFromRoom() {
    if (!isDirectConversation) {
      return;
    }

    if (!groupTitle.trim()) {
      onNotice("Give the new group a name before creating it.");
      return;
    }

    if (selectedUsers.length === 0) {
      onNotice("Choose at least one more person to bring into the new group.");
      return;
    }

    setIsBusy(true);
    try {
      const created = await createConversation(
        {
          type: "GROUP",
          title: groupTitle.trim(),
          category:
            conversation.category === "GENERAL" ? "WORKSPACE" : conversation.category,
          participantIds: [
            ...conversation.participants.map((participant) => participant.user.id),
            ...selectedUsers.map((user) => user.id),
          ],
        },
        accessToken,
      );
      onNotice("Group created from this room.");
      setSelectedUsers([]);
      setGroupTitle("");
      setQuery("");
      setResults([]);
      router.push(`/new-shell?conversationId=${created.id}&sidebar=tools`);
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : "That group could not be created right now.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
            Room team
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-charcoal">
            {isDirectConversation ? "Turn this room into a group" : "Members and roles"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-graphite/68">
            {isDirectConversation
              ? "Search by username, email, verified phone, or @code, stage the people you want, then create a proper group room from this direct chat."
              : "Add people after room creation, then promote the right members to admin without leaving the tools workspace."}
          </p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#faf7f2] text-charcoal">
          <Users className="h-5 w-5" />
        </span>
      </div>

      {canManage ? (
        <div className="mt-5 rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
          <div className="flex items-center gap-2 rounded-[18px] border border-charcoal/10 bg-white px-3 py-3">
            <Search className="h-4 w-4 text-graphite/52" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isDirectConversation
                  ? "Search by username, email, phone, or @code"
                  : "Search by username, email, phone, or @code"
              }
              value={query}
            />
            {isSearching ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-graphite/52" />
            ) : null}
          </div>

          {isDirectConversation ? (
            <div className="mt-3 rounded-[18px] bg-white px-4 py-4 text-sm leading-7 text-graphite/64">
              Direct rooms stay one-to-one. Adding more people here creates a new group room instead of changing this direct chat.
            </div>
          ) : null}

          {query.trim().length >= 2 ? (
            <div className="mt-3 space-y-2">
              {results.length === 0 ? (
                <div className="rounded-[18px] bg-white px-4 py-4 text-sm leading-7 text-graphite/64">
                  {isSearching
                    ? "Searching for room members..."
                    : "No new people matched this search."}
                </div>
              ) : (
                results.slice(0, 6).map((user) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-4"
                    key={user.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-charcoal">
                        {user.displayName}
                      </p>
                      <p className="mt-1 truncate text-xs text-graphite/58">
                        @{user.userCode || user.username}
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-charcoal px-3 py-2 text-xs font-semibold text-cloud disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => {
                        if (isDirectConversation) {
                          setSelectedUsers((current) => [...current, user]);
                        } else {
                          void runAction(
                            () =>
                              addConversationMembers(
                                conversation.id,
                                [user.id],
                                accessToken,
                              ).then(() => undefined),
                            `${user.displayName} added to the room.`,
                          );
                        }
                        setQuery("");
                        setResults([]);
                      }}
                      type="button"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {isDirectConversation ? "Stage" : "Add"}
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {isDirectConversation ? (
            <div className="mt-4 rounded-[22px] border border-charcoal/10 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-charcoal">New group setup</p>
                  <p className="mt-1 text-xs leading-6 text-graphite/58">
                    Choose the people to carry over from this direct room into a real group workspace.
                  </p>
                </div>
                <span className="rounded-full bg-[#faf7f2] px-3 py-1.5 text-xs font-semibold text-graphite/72">
                  {selectedUsers.length} staged
                </span>
              </div>

              <input
                className="mt-4 w-full rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                onChange={(event) => setGroupTitle(event.target.value)}
                placeholder="Give the new group a name"
                value={groupTitle}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedUsers.length === 0 ? (
                  <span className="rounded-full bg-[#faf7f2] px-3 py-2 text-xs font-medium text-graphite/62">
                    No extra people staged yet.
                  </span>
                ) : (
                  selectedUsers.map((user) => (
                    <span
                      className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-2 text-xs font-semibold text-charcoal"
                      key={user.id}
                    >
                      {user.displayName}
                      <button
                        className="grid h-4 w-4 place-items-center rounded-full text-graphite/62"
                        onClick={() =>
                          setSelectedUsers((current) =>
                            current.filter((item) => item.id !== user.id),
                          )
                        }
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <button
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud disabled:opacity-50"
                disabled={isBusy}
                onClick={() => {
                  void handleCreateGroupFromRoom();
                }}
                type="button"
              >
                <ArrowRight className="h-4 w-4" />
                Create group from this room
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {conversation.participants.map((participant) => (
          <article
            className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4"
            key={participant.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">
                  {participant.user.displayName}
                </p>
                <p className="mt-1 truncate text-xs text-graphite/58">
                  @{participant.user.userCode || participant.user.username}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-graphite/72">
                {formatParticipantRole(participant.role)}
              </span>
            </div>

            {canManage && !isDirectConversation && participant.role !== "OWNER" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {participant.role !== "ADMIN" ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal"
                    disabled={isBusy}
                    onClick={() => {
                      void runAction(
                        () =>
                          updateConversationMemberRole(
                            conversation.id,
                            participant.user.id,
                            "ADMIN",
                            accessToken,
                          ).then(() => undefined),
                        `${participant.user.displayName} promoted to admin.`,
                      );
                    }}
                    type="button"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Make admin
                  </button>
                ) : null}
                {participant.role === "ADMIN" ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal"
                    disabled={isBusy}
                    onClick={() => {
                      void runAction(
                        () =>
                          updateConversationMemberRole(
                            conversation.id,
                            participant.user.id,
                            "MEMBER",
                            accessToken,
                          ).then(() => undefined),
                        `${participant.user.displayName} returned to member.`,
                      );
                    }}
                    type="button"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Make member
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatParticipantRole(role: string) {
  if (role === "OWNER") {
    return "Owner";
  }
  if (role === "ADMIN") {
    return "Admin";
  }
  if (role === "GUEST") {
    return "Guest";
  }
  return "Member";
}
