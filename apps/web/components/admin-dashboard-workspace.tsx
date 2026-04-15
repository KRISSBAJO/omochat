"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Gavel, Search, ShieldAlert, ShieldCheck, Sparkles, UserCog, UserRound, Users, X } from "lucide-react";
import {
  AdminAction,
  AdminOverview,
  AdminStatus,
  AdminUser,
  ConversationToolRequest,
  getAdminActions,
  getAdminOverview,
  getAdminStatuses,
  getAdminToolRequests,
  getAdminUsers,
  moderateStatus,
  refreshSession,
  reviewAdminToolRequest,
  updateAdminUserRoles,
  updateAdminUserStatus
} from "../lib/api-client";
import { ChatLoadingScreen } from "./chat-loading-screen";
import { getToolPackLabel } from "./new-chat/tools-registry";

type UserFilter = "ALL" | "ACTIVE" | "SUSPENDED";
type StatusFilter = "ALL" | "LIVE" | "REMOVED" | "EXPIRED";
type ManagedRole = "SITE_ADMIN" | "PLATFORM_ADMIN" | "MODERATOR";
type StatusChangeDraft = { user: AdminUser; nextStatus: "ACTIVE" | "SUSPENDED" } | null;

export function AdminDashboardWorkspace() {
  const [booting, setBooting] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [canEnterAdmin, setCanEnterAdmin] = useState(false);
  const [canOpenReports, setCanOpenReports] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [statuses, setStatuses] = useState<AdminStatus[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [toolRequests, setToolRequests] = useState<ConversationToolRequest[]>([]);
  const [userFilter, setUserFilter] = useState<UserFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("LIVE");
  const [userQuery, setUserQuery] = useState("");
  const [statusQuery, setStatusQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyStatusId, setBusyStatusId] = useState<string | null>(null);
  const [busyToolRequestId, setBusyToolRequestId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [statusDraft, setStatusDraft] = useState<StatusChangeDraft>(null);
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    refreshSession()
      .then((session) => {
        setAccessToken(session.accessToken);
        setCanEnterAdmin(session.user.access.isSiteAdmin);
        setCanOpenReports(session.user.access.isModerator || session.user.access.isPlatformAdmin || session.user.access.isSiteAdmin);
        if (!session.user.access.isSiteAdmin) {
          setNotice("This workspace is reserved for site admins only.");
        }
      })
      .catch(() => setNotice("Sign in first to open the site admin workspace."))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!accessToken || !canEnterAdmin) {
      return;
    }

    Promise.all([
      getAdminOverview(accessToken),
      getAdminUsers(accessToken, {
        q: userQuery.trim() || undefined,
        status: userFilter === "ALL" ? undefined : userFilter,
        pageSize: 24
      }),
      getAdminStatuses(accessToken, {
        q: statusQuery.trim() || undefined,
        state: statusFilter,
        pageSize: 10
      }),
      getAdminActions(accessToken),
      getAdminToolRequests(accessToken, {
        status: "PENDING"
      })
    ])
      .then(([nextOverview, nextUsers, nextStatuses, nextActions, nextToolRequests]) => {
        setOverview(nextOverview);
        setUsers(nextUsers.items);
        setStatuses(nextStatuses.items);
        setActions(nextActions);
        setToolRequests(nextToolRequests);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Could not load the site admin workspace."));
  }, [accessToken, canEnterAdmin, reloadTick, statusFilter, statusQuery, userFilter, userQuery]);

  const cards = useMemo(
    () =>
      overview
        ? [
            { label: "Total users", value: overview.totalUsers, icon: Users },
            { label: "Active access", value: overview.activeUsers, icon: ShieldCheck },
            { label: "Suspended", value: overview.suspendedUsers, icon: ShieldAlert },
            { label: "Site admins", value: overview.siteAdmins, icon: Gavel },
            { label: "Platform admins", value: overview.platformAdmins, icon: UserCog },
            { label: "Open reports", value: overview.openReports, icon: Activity },
            { label: "Tool requests", value: toolRequests.length, icon: Sparkles }
          ]
        : [],
    [overview, toolRequests.length]
  );

  async function handleRoleToggle(user: AdminUser, role: ManagedRole) {
    if (!accessToken) return;
    const hasRole = user.access.roles.includes(role);
    const nextRoles = hasRole ? user.access.roles.filter((item) => item !== role) : [...user.access.roles, role];
    setBusyUserId(user.id);
    try {
      await updateAdminUserRoles(user.id, nextRoles, accessToken);
      setReloadTick((current) => current + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update that role.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleStatusAction() {
    if (!accessToken || !statusDraft) return;
    setBusyUserId(statusDraft.user.id);
    try {
      await updateAdminUserStatus(statusDraft.user.id, statusDraft.nextStatus, statusNote.trim() || undefined, accessToken);
      setStatusDraft(null);
      setStatusNote("");
      setReloadTick((current) => current + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update that user.");
    } finally {
      setBusyUserId(null);
    }
  }

  function openUserStatusDraft(user: AdminUser, nextStatus: "ACTIVE" | "SUSPENDED") {
    setStatusDraft({ user, nextStatus });
    setStatusNote(
      nextStatus === "SUSPENDED"
        ? ""
        : user.latestAdminAction?.type === "USER_SUSPENDED"
          ? `Restored after reviewing the earlier suspension for ${user.displayName}.`
          : ""
    );
  }

  async function handleModerateStatus(status: AdminStatus, remove: boolean) {
    if (!accessToken) return;
    setBusyStatusId(status.id);
    try {
      await moderateStatus(
        status.id,
        remove ? { remove: true, removedReason: `Taken down by site admin on ${new Date().toLocaleString()}.` } : { remove: false },
        accessToken
      );
      setNotice(remove ? `Status from ${status.owner.displayName} is down.` : `Status from ${status.owner.displayName} is live again.`);
      setReloadTick((current) => current + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update that status.");
    } finally {
      setBusyStatusId(null);
    }
  }

  async function handleReviewToolRequest(requestId: string, status: "APPROVED" | "DECLINED") {
    if (!accessToken) return;
    setBusyToolRequestId(requestId);
    try {
      await reviewAdminToolRequest(
        requestId,
        {
          status,
          reviewNote: status === "APPROVED" ? "Approved from the site admin desk." : "Declined from the site admin desk."
        },
        accessToken
      );
      setNotice(status === "APPROVED" ? "Tool pack approved for that room." : "Tool pack request declined.");
      setReloadTick((current) => current + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not review that tool request.");
    } finally {
      setBusyToolRequestId(null);
    }
  }

  if (booting) return <ChatLoadingScreen label="Opening site admin workspace..." />;

  if (!accessToken || !canEnterAdmin) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] px-4 py-6 text-charcoal sm:px-6">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-charcoal/10 bg-white p-8 shadow-[0_20px_60px_rgba(24,18,15,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">Site admin</p>
          <h1 className="mt-3 text-3xl font-semibold">Control desk unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-graphite/68">{notice || "This workspace is not available yet."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm font-semibold text-charcoal" href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to chats
            </Link>
            {canOpenReports ? <Link className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal" href="/admin/reports">Open moderation desk</Link> : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] px-4 py-6 text-charcoal sm:px-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="grid gap-5 rounded-[34px] border border-charcoal/10 bg-white p-6 shadow-[0_24px_70px_rgba(24,18,15,0.06)] xl:grid-cols-[minmax(0,1.45fr)_340px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-graphite/60">
              <Sparkles className="h-3.5 w-3.5" />
              Site admin
            </div>
            <h1 className="mt-4 text-[2.2rem] font-semibold leading-tight text-charcoal sm:text-[2.8rem]">Search first. Moderate fast. Keep the trail readable.</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-graphite/68">This desk is now built around direct search, readable identity cards, and a dedicated status lane so nobody has to dig through endless rows to act.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-1 text-xs font-semibold text-graphite/72">User search by email, username, @code, name, or phone</span>
              <span className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-1 text-xs font-semibold text-graphite/72">Status moderation now has its own search lane</span>
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-[28px] border border-charcoal/10 bg-[#faf7f2] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Quick actions</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal" href="/"><ArrowLeft className="h-4 w-4" />Back to chats</Link>
                <Link className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal" href="/admin/reports">Open reports</Link>
              </div>
            </div>
            {notice ? <div className="rounded-[24px] border border-[#e2c890] bg-[#fff6e6] px-4 py-3 text-sm text-graphite">{notice}</div> : null}
          </aside>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="rounded-[26px] border border-charcoal/10 bg-white p-5 shadow-[0_14px_34px_rgba(24,18,15,0.05)]" key={card.label}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">{card.label}</p><p className="mt-4 text-3xl font-semibold text-charcoal">{card.value}</p></div>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#efe6d7] text-charcoal"><Icon className="h-4 w-4" /></span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
          <section className="rounded-[32px] border border-charcoal/10 bg-white p-5 shadow-[0_20px_60px_rgba(24,18,15,0.06)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">User directory</p>
                <h2 className="mt-2 text-2xl font-semibold text-charcoal">Search, suspend, and manage roles</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((value) => (
                  <button className={`rounded-full border px-4 py-2 text-sm font-semibold ${userFilter === value ? "border-charcoal/16 bg-charcoal text-cloud" : "border-charcoal/10 bg-white text-charcoal"}`} key={value} onClick={() => setUserFilter(value)} type="button">
                    {value === "ALL" ? "All users" : value.charAt(0) + value.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <label className="mt-5 block text-sm font-semibold text-charcoal">
              <span>Search users</span>
              <div className="mt-2 flex items-center gap-3 rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3">
                <Search className="h-4 w-4 text-graphite/48" />
                <input className="w-full bg-transparent text-sm outline-none placeholder:text-graphite/42" onChange={(event) => setUserQuery(event.target.value)} placeholder="Search email, username, @code, display name, or phone" value={userQuery} />
              </div>
            </label>
            <div className="mt-5 space-y-4">
              {users.length === 0 ? <div className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-5 text-sm leading-7 text-graphite/68">No users match this lane yet.</div> : users.map((user) => (
                <article className="rounded-[26px] border border-charcoal/10 bg-[#fcfbf7] p-4" key={user.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <AvatarCircle name={user.displayName} avatarUrl={user.avatarUrl} />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-charcoal">{user.displayName}</p>
                        <p className="truncate text-xs text-graphite/60">@{user.username}{user.userCode ? ` - @${user.userCode}` : ""}</p>
                        <p className="mt-2 truncate text-sm text-charcoal">{user.email}</p>
                        <p className="truncate text-xs text-graphite/60">{user.phoneNumber || "No phone added yet"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.status === "ACTIVE" ? "bg-[#eef7ea] text-[#1f6b36]" : "bg-[#fff0ee] text-[#a34a2b]"}`}>{user.status === "ACTIVE" ? "Active" : "Suspended"}</span>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-graphite/62">Joined {formatCalendarDate(user.createdAt)}{user.lastSeenAt ? ` - last seen ${formatDateTime(user.lastSeenAt)}` : ""}</p>
                  <p className="mt-2 text-sm leading-7 text-graphite/68">{user.statusMessage || user.bio || [user.city, user.stateRegion, user.countryCode].filter(Boolean).join(", ") || "No profile summary yet."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["SITE_ADMIN", "PLATFORM_ADMIN", "MODERATOR"] as const).map((role) => {
                      const active = user.access.roles.includes(role);
                      const label = role === "SITE_ADMIN" ? "Site admin" : role === "PLATFORM_ADMIN" ? "Platform admin" : "Moderator";
                      return <button className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-charcoal/15 bg-charcoal text-cloud" : "border-charcoal/10 bg-white text-graphite/74"}`} disabled={busyUserId === user.id} key={role} onClick={() => { void handleRoleToggle(user, role); }} type="button">{label}</button>;
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-graphite/70">{user.counts.conversations} chats - {user.counts.reportsReceived} received - {user.counts.reportsFiled} filed</span>
                    {user.status === "ACTIVE"
                      ? <button className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-xs font-semibold text-charcoal" disabled={busyUserId === user.id} onClick={() => openUserStatusDraft(user, "SUSPENDED")} type="button">Suspend access</button>
                      : <button className="rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-cloud" disabled={busyUserId === user.id} onClick={() => openUserStatusDraft(user, "ACTIVE")} type="button">Restore access</button>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[32px] border border-charcoal/10 bg-white p-5 shadow-[0_20px_60px_rgba(24,18,15,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Status moderation</p><h2 className="mt-2 text-xl font-semibold text-charcoal">Find a status directly</h2></div>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#efe6d7] text-charcoal"><ShieldAlert className="h-4 w-4" /></span>
              </div>
              <p className="mt-2 text-sm leading-7 text-graphite/68">Search the owner or the status content. You no longer have to scroll through the full user base to bring a status down.</p>
              <label className="mt-4 block text-sm font-semibold text-charcoal">
                <span>Search statuses</span>
                <div className="mt-2 flex items-center gap-3 rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3">
                  <Search className="h-4 w-4 text-graphite/48" />
                  <input className="w-full bg-transparent text-sm outline-none placeholder:text-graphite/42" onChange={(event) => setStatusQuery(event.target.value)} placeholder="Search owner, @code, phone, text, or caption" value={statusQuery} />
                </div>
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["LIVE", "REMOVED", "EXPIRED", "ALL"] as const).map((value) => (
                  <button className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusFilter === value ? "border-charcoal/16 bg-charcoal text-cloud" : "border-charcoal/10 bg-white text-charcoal"}`} key={value} onClick={() => setStatusFilter(value)} type="button">
                    {value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {statuses.length === 0 ? <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite/68">No statuses match this lane yet.</div> : statuses.map((status) => (
                  <article className="rounded-[22px] border border-charcoal/10 bg-[#fcfbf7] p-4" key={status.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <AvatarCircle name={status.owner.displayName} avatarUrl={status.owner.avatarUrl} small />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-charcoal">{status.owner.displayName}</p>
                          <p className="truncate text-xs text-graphite/60">@{status.owner.username}{status.owner.userCode ? ` - @${status.owner.userCode}` : ""}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.removedAt ? "bg-[#fff0ee] text-[#a34a2b]" : new Date(status.expiresAt).getTime() <= Date.now() ? "bg-[#efe6d7] text-graphite" : "bg-[#eef7ea] text-[#1f6b36]"}`}>{status.removedAt ? "Down" : new Date(status.expiresAt).getTime() <= Date.now() ? "Expired" : "Live"}</span>
                    </div>
                    {status.media?.mimeType.startsWith("image/") ? <img alt={status.caption || status.text || "Status preview"} className="mt-3 h-32 w-full rounded-[18px] object-cover" src={status.media.url} /> : null}
                    <p className="mt-3 text-xs leading-6 text-graphite/62">{formatDateTime(status.createdAt)} - expires {formatDateTime(status.expiresAt)}</p>
                    <p className="mt-2 text-sm leading-7 text-graphite/70">{status.text || status.caption || (status.media ? `${status.type.toLowerCase()} upload` : "No visible text on this status.")}</p>
                    {status.removedReason ? <p className="mt-2 rounded-[18px] border border-charcoal/10 bg-white px-3 py-2 text-xs leading-6 text-graphite/68">{status.removedReason}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-graphite/70">{status.counts.views} views - {status.counts.reactions} reactions - {status.counts.comments} comments</span>
                      <button className={`rounded-full px-4 py-2 text-xs font-semibold ${status.removedAt ? "border border-charcoal/10 bg-white text-charcoal" : "bg-charcoal text-cloud"}`} disabled={busyStatusId === status.id} onClick={() => { void handleModerateStatus(status, !Boolean(status.removedAt)); }} type="button">{status.removedAt ? "Restore status" : "Bring down status"}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-charcoal/10 bg-white p-5 shadow-[0_20px_60px_rgba(24,18,15,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Tools activation</p><h2 className="mt-2 text-xl font-semibold text-charcoal">Approve room tool packs</h2></div>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#efe6d7] text-charcoal"><Sparkles className="h-4 w-4" /></span>
              </div>
              <p className="mt-2 text-sm leading-7 text-graphite/68">Rooms can request shared boards, notes, polls, and community-care lanes. Nothing goes live until a site admin approves it here.</p>
              <div className="mt-4 space-y-3">
                {toolRequests.length === 0 ? <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite/68">No pending tool requests are waiting right now.</div> : toolRequests.map((request) => (
                  <article className="rounded-[22px] border border-charcoal/10 bg-[#fcfbf7] p-4" key={request.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-charcoal">{getToolPackLabel(request.pack)}</p>
                        <p className="mt-1 text-xs text-graphite/58">{request.conversation.title || request.conversation.type.toLowerCase()} • from {request.requestedBy.displayName}</p>
                      </div>
                      <span className="rounded-full bg-[#fff7de] px-2.5 py-1 text-[11px] font-semibold text-charcoal">Pending</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-graphite/68">{request.note || "No extra reason was added to this request."}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-cloud disabled:opacity-50" disabled={busyToolRequestId === request.id} onClick={() => { void handleReviewToolRequest(request.id, "APPROVED"); }} type="button">Approve</button>
                      <button className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-xs font-semibold text-charcoal disabled:opacity-50" disabled={busyToolRequestId === request.id} onClick={() => { void handleReviewToolRequest(request.id, "DECLINED"); }} type="button">Decline</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-charcoal/10 bg-white p-5 shadow-[0_20px_60px_rgba(24,18,15,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Recent admin actions</p><h3 className="mt-2 text-xl font-semibold text-charcoal">Audit trail</h3></div>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#efe6d7] text-charcoal"><Activity className="h-4 w-4" /></span>
              </div>
              <div className="mt-4 space-y-3">
                {actions.length === 0 ? <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite/68">No admin actions have been recorded yet.</div> : actions.map((action) => (
                  <article className="rounded-[22px] border border-charcoal/10 bg-[#fcfbf7] px-4 py-4" key={action.id}>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{formatActionType(action.type)}</p>
                    <p className="mt-2 text-sm font-semibold text-charcoal">{action.targetUser.displayName}</p>
                    <p className="mt-1 text-xs leading-5 text-graphite/62">by {action.actorUser?.displayName || "System"} - {formatDateTime(action.createdAt)}</p>
                    <p className="mt-2 text-sm leading-6 text-graphite/68">{action.note || "No note recorded."}</p>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>

      {statusDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(24,18,15,0.35)] px-4 py-6">
          <div className="w-full max-w-xl rounded-[32px] border border-charcoal/10 bg-white p-6 shadow-[0_30px_80px_rgba(24,18,15,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Admin action</p>
                <h2 className="mt-2 text-2xl font-semibold text-charcoal">{statusDraft.nextStatus === "SUSPENDED" ? "Suspend user access" : "Restore user access"}</h2>
              </div>
              <button className="grid h-11 w-11 place-items-center rounded-full border border-charcoal/10 bg-[#faf7f2] text-charcoal" onClick={() => { setStatusDraft(null); setStatusNote(""); }} type="button"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4">
              <p className="text-sm font-semibold text-charcoal">{statusDraft.user.displayName}</p>
              <p className="mt-1 text-sm text-graphite/66">@{statusDraft.user.username}{statusDraft.user.userCode ? ` - @${statusDraft.user.userCode}` : ""}</p>
            </div>
            <label className="mt-5 block text-sm font-semibold text-charcoal">
              <span>{statusDraft.nextStatus === "SUSPENDED" ? "Suspension note *" : "Restore note"}</span>
              <textarea className="mt-2 min-h-[140px] w-full rounded-[24px] border border-charcoal/10 bg-white px-4 py-3 text-sm leading-7 outline-none" onChange={(event) => setStatusNote(event.target.value)} placeholder={statusDraft.nextStatus === "SUSPENDED" ? "Why is this account being paused?" : "Why is this account being restored?"} value={statusNote} />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="rounded-full border border-charcoal/10 bg-white px-5 py-3 text-sm font-semibold text-charcoal" onClick={() => { setStatusDraft(null); setStatusNote(""); }} type="button">Cancel</button>
              <button className={`rounded-full px-5 py-3 text-sm font-semibold text-cloud ${statusDraft.nextStatus === "SUSPENDED" ? "bg-[#9a4328]" : "bg-charcoal"} disabled:opacity-50`} disabled={busyUserId === statusDraft.user.id || (statusDraft.nextStatus === "SUSPENDED" && !statusNote.trim())} onClick={() => { void handleStatusAction(); }} type="button">{statusDraft.nextStatus === "SUSPENDED" ? "Record suspension" : "Record restore"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function AvatarCircle({ name, avatarUrl, small = false }: { name: string; avatarUrl: string | null; small?: boolean }) {
  const sizeClass = small ? "h-10 w-10" : "h-12 w-12";
  if (avatarUrl) return <img alt={name} className={`${sizeClass} rounded-2xl object-cover`} src={avatarUrl} />;
  return <span className={`grid ${sizeClass} place-items-center rounded-2xl bg-[#efe6d7] text-charcoal`}><UserRound className={small ? "h-4 w-4" : "h-5 w-5"} /></span>;
}

function formatCalendarDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatActionType(type: AdminAction["type"]) {
  if (type === "USER_SUSPENDED") return "User suspended";
  if (type === "USER_RESTORED") return "User restored";
  if (type === "USER_ROLE_UPDATED") return "Roles updated";
  return type;
}
