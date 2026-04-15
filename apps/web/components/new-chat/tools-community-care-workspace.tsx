"use client";

import { useMemo, useState } from "react";
import { BellRing, CalendarClock, HeartHandshake } from "lucide-react";
import {
  type Conversation,
  type ConversationPrayerRequest,
  type ConversationToolNote,
  type ConversationToolsWorkspace,
  createConversationPrayerRequest,
  createConversationPrayerUpdate,
  createConversationToolNote,
  toggleConversationPrayerSupport,
  updateConversationPrayerRequest,
  updateConversationToolNote,
} from "../../lib/api-client";

const careRequestTypes = [
  "PRAYER",
  "FOLLOW_UP",
  "VISITATION",
  "COUNSELING",
  "SUPPORT",
  "WELFARE",
  "GUEST",
] as const;

const careVisibilities = ["CARE_TEAM", "ROOM", "PRIVATE"] as const;
const carePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const careStatuses = ["OPEN", "ANSWERED", "ARCHIVED"] as const;

type CommunityCareWorkspaceProps = {
  accessToken: string;
  conversation: Conversation;
  workspace: ConversationToolsWorkspace;
  canManageRoom: boolean;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
};

export function CommunityCareWorkspace({
  accessToken,
  conversation,
  workspace,
  canManageRoom,
  onNotice,
  onRefresh,
}: CommunityCareWorkspaceProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [careFilter, setCareFilter] = useState<"ALL" | "OPEN" | "ANSWERED" | "ARCHIVED">("OPEN");
  const [careTitle, setCareTitle] = useState("");
  const [careBody, setCareBody] = useState("");
  const [careType, setCareType] = useState<(typeof careRequestTypes)[number]>("PRAYER");
  const [careVisibility, setCareVisibility] = useState<(typeof careVisibilities)[number]>("CARE_TEAM");
  const [carePriority, setCarePriority] = useState<(typeof carePriorities)[number]>("MEDIUM");
  const [careSubjectName, setCareSubjectName] = useState("");
  const [careSubjectContact, setCareSubjectContact] = useState("");
  const [careAssigneeId, setCareAssigneeId] = useState("");
  const [careFollowUpAt, setCareFollowUpAt] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementAudience, setAnnouncementAudience] =
    useState<ConversationToolNote["audience"]>("ROOM");
  const [announcementExpiresAt, setAnnouncementExpiresAt] = useState("");
  const [updateDrafts, setUpdateDrafts] = useState<Record<string, string>>({});
  const [privateDrafts, setPrivateDrafts] = useState<Record<string, boolean>>({});

  const announcements = useMemo(
    () => workspace.notes.filter((item) => item.kind === "ANNOUNCEMENT"),
    [workspace.notes],
  );
  const careRequests = useMemo(() => {
    const items = [...workspace.prayerRequests];
    if (careFilter === "ALL") {
      return items;
    }
    return items.filter((item) => item.status === careFilter);
  }, [careFilter, workspace.prayerRequests]);
  const activeAssignees = workspace.conversation.participants;

  async function runAction(task: () => Promise<void>, success: string) {
    setIsBusy(true);
    try {
      await task();
      await onRefresh();
      onNotice(success);
    } catch (error) {
      onNotice(
        error instanceof Error ? error.message : "That community care action did not finish.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateCareRequest() {
    if (!careTitle.trim() || !careBody.trim()) {
      onNotice("Give the care case a title and detail before saving it.");
      return;
    }

    await runAction(
      async () => {
        await createConversationPrayerRequest(
          conversation.id,
          {
            title: careTitle,
            body: careBody,
            requestType: careType,
            visibility: careVisibility,
            priority: carePriority,
            subjectName: careSubjectName || undefined,
            subjectContact: careSubjectContact || undefined,
            assignedToUserId: careAssigneeId || undefined,
            followUpAt: careFollowUpAt ? new Date(careFollowUpAt).toISOString() : undefined,
          },
          accessToken,
        );
        setCareTitle("");
        setCareBody("");
        setCareType("PRAYER");
        setCareVisibility("CARE_TEAM");
        setCarePriority("MEDIUM");
        setCareSubjectName("");
        setCareSubjectContact("");
        setCareAssigneeId("");
        setCareFollowUpAt("");
      },
      "Care case added to the room inbox.",
    );
  }

  async function handleCreateAnnouncement() {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      onNotice("Give the announcement a title and body first.");
      return;
    }

    await runAction(
      async () => {
        await createConversationToolNote(
          conversation.id,
          {
            kind: "ANNOUNCEMENT",
            title: announcementTitle,
            body: announcementBody,
            audience: announcementAudience,
            expiresAt: announcementExpiresAt ? new Date(announcementExpiresAt).toISOString() : undefined,
            pinned: true,
          },
          accessToken,
        );
        setAnnouncementTitle("");
        setAnnouncementBody("");
        setAnnouncementAudience("ROOM");
        setAnnouncementExpiresAt("");
      },
      "Announcement published in Community Care.",
    );
  }

  function updateDraft(requestId: string, value: string) {
    setUpdateDrafts((current) => ({ ...current, [requestId]: value }));
  }

  function updatePrivateFlag(requestId: string, value: boolean) {
    setPrivateDrafts((current) => ({ ...current, [requestId]: value }));
  }

  async function handleCreateFollowUp(request: ConversationPrayerRequest) {
    const body = updateDrafts[request.id]?.trim();
    if (!body) {
      onNotice("Write the follow-up note before saving it.");
      return;
    }

    await runAction(
      async () => {
        await createConversationPrayerUpdate(
          conversation.id,
          request.id,
          {
            body,
            isPrivate: Boolean(privateDrafts[request.id]),
          },
          accessToken,
        );
        setUpdateDrafts((current) => ({ ...current, [request.id]: "" }));
        setPrivateDrafts((current) => ({ ...current, [request.id]: false }));
      },
      "Follow-up note added.",
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <div className="space-y-5">
        <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
                Community care
              </p>
              <h3 className="mt-2 text-[2rem] font-semibold text-charcoal">
                Care inbox and targeted updates
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-graphite/68">
                Run follow-up, pastoral support, welfare, guest care, and room announcements
                from one calm lane. Sensitive requests stay private while room-safe updates stay
                visible to the right people.
              </p>
            </div>
            <div className="grid min-w-[250px] grid-cols-2 gap-3">
              <MetricTile label="Open care" value={workspace.dashboard.prayerCount} />
              <MetricTile label="Urgent" value={workspace.dashboard.urgentCareCount} />
              <MetricTile label="Assigned" value={workspace.dashboard.careAssignedCount} />
              <MetricTile label="Due today" value={workspace.dashboard.dueFollowUpCount} />
            </div>
          </div>
        </section>

        <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
          <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
              Care intake
            </p>
            <h4 className="mt-2 text-2xl font-semibold text-charcoal">Open a care case</h4>
            <p className="mt-2 text-sm leading-7 text-graphite/66">
              Capture prayer, visitation, counseling, welfare, or guest follow-up with
              assignment and visibility from the start.
            </p>

            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              <SelectField
                label="Case type"
                onChange={(value) => setCareType(value as (typeof careRequestTypes)[number])}
                options={careRequestTypes.map((value) => ({ label: formatCareRequestType(value), value }))}
                value={careType}
              />
              <SelectField
                label="Visibility"
                onChange={(value) =>
                  setCareVisibility(value as (typeof careVisibilities)[number])
                }
                options={careVisibilities.map((value) => ({ label: formatCareVisibility(value), value }))}
                value={careVisibility}
              />
              <SelectField
                label="Priority"
                onChange={(value) => setCarePriority(value as (typeof carePriorities)[number])}
                options={carePriorities.map((value) => ({ label: formatPriority(value), value }))}
                value={carePriority}
              />
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <TextField
                label="Title"
                onChange={setCareTitle}
                placeholder="Family follow-up after Sunday service"
                value={careTitle}
              />
              <TextField
                label="Person / household"
                onChange={setCareSubjectName}
                placeholder="Brother James / Adekunle family"
                value={careSubjectName}
              />
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <TextField
                label="Contact hint"
                onChange={setCareSubjectContact}
                placeholder="+1 615 555 9012 or @guest-card"
                value={careSubjectContact}
              />
              <SelectField
                label="Assign to"
                onChange={setCareAssigneeId}
                options={[
                  { label: "Assign later", value: "" },
                  ...activeAssignees.map((participant) => ({
                    label: participant.user.displayName,
                    value: participant.userId,
                  })),
                ]}
                value={careAssigneeId}
              />
              <DateTimeField label="Next follow-up" onChange={setCareFollowUpAt} value={careFollowUpAt} />
            </div>

            <label className="mt-3 block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
                Care detail
              </span>
              <textarea
                className="mt-2 min-h-[160px] w-full rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
                onChange={(event) => setCareBody(event.target.value)}
                placeholder="Describe what happened, what support is needed, and any time-sensitive follow-up."
                value={careBody}
              />
            </label>

            <button
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
              disabled={isBusy}
              onClick={() => {
                void handleCreateCareRequest();
              }}
              type="button"
            >
              <HeartHandshake className="h-4 w-4" />
              Create care case
            </button>
          </section>

          <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
              Announcement center
            </p>
            <h4 className="mt-2 text-2xl font-semibold text-charcoal">Publish targeted updates</h4>
            <p className="mt-2 text-sm leading-7 text-graphite/66">
              Keep public room updates here while private care work stays inside the inbox.
              Audience and expiry help avoid stale notices.
            </p>

            {canManageRoom ? (
              <>
                <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
                  <TextField
                    label="Announcement title"
                    onChange={setAnnouncementTitle}
                    placeholder="Wednesday prayer line update"
                    value={announcementTitle}
                  />
                  <SelectField
                    label="Audience"
                    onChange={(value) => setAnnouncementAudience(value as ConversationToolNote["audience"])}
                    options={[
                      { label: "Entire room", value: "ROOM" },
                      { label: "Leads only", value: "LEADS_ONLY" },
                      { label: "Care team", value: "CARE_TEAM" },
                      { label: "Follow-up team", value: "FOLLOW_UP_TEAM" },
                      { label: "New guests", value: "NEW_GUESTS" },
                    ]}
                    value={announcementAudience}
                  />
                </div>
                <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
                      Announcement body
                    </span>
                    <textarea
                      className="mt-2 min-h-[140px] w-full rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
                      onChange={(event) => setAnnouncementBody(event.target.value)}
                      placeholder="What should this audience know, when, and what action is expected?"
                      value={announcementBody}
                    />
                  </label>
                  <DateTimeField label="Expires" onChange={setAnnouncementExpiresAt} value={announcementExpiresAt} />
                </div>
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => {
                    void handleCreateAnnouncement();
                  }}
                  type="button"
                >
                  <BellRing className="h-4 w-4" />
                  Publish announcement
                </button>
              </>
            ) : (
              <div className="mt-5 rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-5 text-sm leading-7 text-graphite/64">
                Room leads publish announcements here. Everyone else can still read the active
                updates below.
              </div>
            )}

            <div className="mt-5 space-y-3">
              {announcements.length === 0 ? (
                <EmptyState text="No care announcements are live yet." />
              ) : (
                announcements.map((announcement) => (
                  <article
                    className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4"
                    key={announcement.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Pill label={formatAnnouncementAudience(announcement.audience)} />
                          {announcement.pinnedAt ? <Pill label="Pinned" tone="success" /> : null}
                          {announcement.expiresAt ? (
                            <Pill label={`Ends ${formatDateShort(announcement.expiresAt)}`} tone="soft" />
                          ) : null}
                        </div>
                        <h5 className="mt-3 text-lg font-semibold text-charcoal">{announcement.title}</h5>
                      </div>
                      {canManageRoom ? (
                        <button
                          className="rounded-full border border-charcoal/10 bg-white px-3 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/20 hover:bg-[#f7f2e8]"
                          onClick={() => {
                            void runAction(
                              () =>
                                updateConversationToolNote(
                                  conversation.id,
                                  announcement.id,
                                  { pinned: !announcement.pinnedAt },
                                  accessToken,
                                ).then(() => undefined),
                              announcement.pinnedAt ? "Announcement unpinned." : "Announcement pinned.",
                            );
                          }}
                          type="button"
                        >
                          {announcement.pinnedAt ? "Unpin" : "Pin"}
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-graphite/72">{announcement.body}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
                Care inbox
              </p>
              <h4 className="mt-2 text-2xl font-semibold text-charcoal">
                Follow-up, assignment, and progress
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "OPEN", "ANSWERED", "ARCHIVED"] as const).map((value) => (
                <button
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    careFilter === value
                      ? "border-charcoal bg-charcoal text-cloud"
                      : "border-charcoal/10 bg-white text-charcoal hover:border-charcoal/25 hover:bg-[#faf7f2]"
                  }`}
                  key={value}
                  onClick={() => setCareFilter(value)}
                  type="button"
                >
                  {value === "ALL" ? "All cases" : formatCareStatus(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {careRequests.length === 0 ? (
              <EmptyState text="No care cases match this filter yet." />
            ) : (
              careRequests.map((request) => (
                <CareRequestCard
                  activeAssignees={activeAssignees}
                  canManageRoom={canManageRoom}
                  isBusy={isBusy}
                  key={request.id}
                  onCreateFollowUp={() => {
                    void handleCreateFollowUp(request);
                  }}
                  onStatusChange={(status) => {
                    void runAction(
                      () =>
                        updateConversationPrayerRequest(conversation.id, request.id, { status }, accessToken).then(() => undefined),
                      "Care case updated.",
                    );
                  }}
                  onSupportToggle={() => {
                    void runAction(
                      () =>
                        toggleConversationPrayerSupport(conversation.id, request.id, accessToken).then(() => undefined),
                      request.viewerSupported ? "Support removed." : "Support added.",
                    );
                  }}
                  onUpdate={(input, notice) => {
                    void runAction(
                      () =>
                        updateConversationPrayerRequest(conversation.id, request.id, input, accessToken).then(() => undefined),
                      notice,
                    );
                  }}
                  privateUpdate={Boolean(privateDrafts[request.id])}
                  request={request}
                  updateBody={updateDrafts[request.id] ?? ""}
                  updateDraft={updateDraft}
                  updatePrivateFlag={updatePrivateFlag}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
        <SummaryCard
          body={workspace.dashboard.latestAnnouncement?.body || "No active announcement is pinned right now."}
          label="Latest announcement"
          title={workspace.dashboard.latestAnnouncement?.title || "Nothing posted yet"}
        />
        <SummaryCard
          body={
            workspace.dashboard.latestPrayer
              ? `${workspace.dashboard.latestPrayer.supportCount} people are standing with this case and ${workspace.dashboard.latestPrayer.updates.length} follow-up note${workspace.dashboard.latestPrayer.updates.length === 1 ? "" : "s"} are recorded.`
              : "Open requests that need follow-up will surface here."
          }
          label="Next active case"
          title={workspace.dashboard.latestPrayer?.title || "No open case"}
        />
        <SummaryCard
          body={`${workspace.prayerRequests.filter((item) => item.visibility !== "ROOM").length} private or care-team-only case${workspace.prayerRequests.filter((item) => item.visibility !== "ROOM").length === 1 ? "" : "s"} are currently protected from the wider room feed.`}
          label="Privacy guard"
          title="Sensitive work stays contained"
        />
      </aside>
    </section>
  );
}

function CareRequestCard({
  request,
  canManageRoom,
  activeAssignees,
  onStatusChange,
  onSupportToggle,
  onUpdate,
  onCreateFollowUp,
  updateBody,
  updateDraft,
  updatePrivateFlag,
  privateUpdate,
  isBusy,
}: {
  request: ConversationPrayerRequest;
  canManageRoom: boolean;
  activeAssignees: ConversationToolsWorkspace["conversation"]["participants"];
  onStatusChange: (status: (typeof careStatuses)[number]) => void;
  onSupportToggle: () => void;
  onUpdate: (
    input: Parameters<typeof updateConversationPrayerRequest>[2],
    notice: string,
  ) => void;
  onCreateFollowUp: () => void;
  updateBody: string;
  updateDraft: (requestId: string, value: string) => void;
  updatePrivateFlag: (requestId: string, value: boolean) => void;
  privateUpdate: boolean;
  isBusy: boolean;
}) {
  return (
    <article className="rounded-[28px] border border-charcoal/10 bg-[#faf7f2] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill label={formatCareRequestType(request.requestType)} />
            <Pill label={formatCareStatus(request.status)} tone={statusTone(request.status)} />
            <Pill label={formatPriority(request.priority)} tone={priorityTone(request.priority)} />
            <Pill label={formatCareVisibility(request.visibility)} tone="soft" />
          </div>
          <h5 className="mt-3 text-xl font-semibold text-charcoal">{request.title}</h5>
          <p className="mt-2 text-sm leading-7 text-graphite/72">{request.body}</p>
        </div>
        <button
          className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
            request.viewerSupported
              ? "border-[#d7ecd2] bg-[#eef8ea] text-[#2d5b22]"
              : "border-charcoal/10 bg-white text-charcoal hover:border-charcoal/25 hover:bg-[#f7f2e8]"
          }`}
          onClick={onSupportToggle}
          type="button"
        >
          {request.viewerSupported ? "Supporting" : "Stand with this"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        <InfoChip label="Subject" value={request.subjectName || "Not specified"} />
        <InfoChip label="Assigned" value={request.assignedTo?.displayName || "Unassigned"} />
        <InfoChip
          label="Follow-up"
          value={request.followUpAt ? formatDateShort(request.followUpAt) : "Not scheduled"}
        />
        <InfoChip label="Support" value={`${request.supportCount} standing`} />
      </div>

      {canManageRoom ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-[220px_220px_220px]">
          <SelectField
            label="Status"
            onChange={(value) => onStatusChange(value as (typeof careStatuses)[number])}
            options={careStatuses.map((value) => ({ label: formatCareStatus(value), value }))}
            value={request.status}
          />
          <SelectField
            label="Assign"
            onChange={(value) => {
              onUpdate(
                { assignedToUserId: value || null },
                value ? "Care assignee updated." : "Care assignee cleared.",
              );
            }}
            options={[
              { label: "Assign later", value: "" },
              ...activeAssignees.map((participant) => ({
                label: participant.user.displayName,
                value: participant.userId,
              })),
            ]}
            value={request.assignedTo?.id ?? ""}
          />
          <DateTimeField
            label="Follow-up due"
            onChange={(value) => {
              onUpdate(
                { followUpAt: value ? new Date(value).toISOString() : null },
                value ? "Follow-up date updated." : "Follow-up date cleared.",
              );
            }}
            value={request.followUpAt ? toDateInputValue(request.followUpAt) : ""}
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.92fr)]">
        <div className="rounded-[22px] border border-charcoal/10 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h6 className="text-sm font-bold uppercase tracking-[0.18em] text-graphite/55">
              Timeline
            </h6>
            <span className="text-xs font-semibold text-graphite/55">
              {request.updates.length} note{request.updates.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {request.updates.length === 0 ? (
              <EmptyState text="No follow-up note has been recorded for this case yet." />
            ) : (
              request.updates.map((update) => (
                <div
                  className="rounded-[18px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3"
                  key={update.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-charcoal">
                      {update.author.displayName}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {update.isPrivate ? <Pill label="Private" tone="warning" /> : null}
                      <span className="text-xs text-graphite/55">
                        {formatDateShort(update.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-graphite/72">{update.body}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[22px] border border-charcoal/10 bg-white p-4">
          <h6 className="text-sm font-bold uppercase tracking-[0.18em] text-graphite/55">
            Add follow-up
          </h6>
          <textarea
            className="mt-3 min-h-[120px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
            onChange={(event) => updateDraft(request.id, event.target.value)}
            placeholder="Log the call, visit, update, or decision from this case."
            value={updateBody}
          />
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-graphite/72">
            <input
              checked={privateUpdate}
              className="h-4 w-4 rounded border-charcoal/20"
              onChange={(event) => updatePrivateFlag(request.id, event.target.checked)}
              type="checkbox"
            />
            Keep this note private to the active care team
          </label>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
            disabled={isBusy}
            onClick={onCreateFollowUp}
            type="button"
          >
            <CalendarClock className="h-4 w-4" />
            Save follow-up
          </button>
        </div>
      </div>
    </article>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-charcoal">{value}</p>
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
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">{label}</p>
      <h4 className="mt-3 text-[1.65rem] font-semibold leading-tight text-charcoal">{title}</h4>
      <p className="mt-3 text-sm leading-7 text-graphite/68">{body}</p>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-charcoal/12 bg-white px-4 py-5 text-sm leading-7 text-graphite/62">
      {text}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</span>
      <select
        className="mt-2 w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</span>
      <input
        className="mt-2 w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</span>
      <input
        className="mt-2 w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
        onChange={(event) => onChange(event.target.value)}
        type="datetime-local"
        value={value}
      />
    </label>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-charcoal/10 bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</p>
      <p className="mt-2 text-sm font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function Pill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "soft";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[#eef8ea] text-[#2d5b22]"
      : tone === "warning"
        ? "bg-[#fbf2dc] text-[#8b5b00]"
        : tone === "danger"
          ? "bg-[#fde9e7] text-[#a63d2f]"
          : tone === "soft"
            ? "bg-[#f3ede2] text-graphite/78"
            : "bg-white text-charcoal";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${toneClass}`}>
      {label}
    </span>
  );
}

function formatCareRequestType(value: ConversationPrayerRequest["requestType"]) {
  return value
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatCareVisibility(value: ConversationPrayerRequest["visibility"]) {
  if (value === "CARE_TEAM") {
    return "Care team";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatPriority(value: ConversationPrayerRequest["priority"]) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatCareStatus(value: ConversationPrayerRequest["status"] | "ALL") {
  if (value === "ALL") {
    return "All cases";
  }
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatAnnouncementAudience(value: ConversationToolNote["audience"]) {
  switch (value) {
    case "LEADS_ONLY":
      return "Leads only";
    case "CARE_TEAM":
      return "Care team";
    case "FOLLOW_UP_TEAM":
      return "Follow-up team";
    case "NEW_GUESTS":
      return "New guests";
    default:
      return "Entire room";
  }
}

function formatDateShort(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateInputValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function priorityTone(priority: ConversationPrayerRequest["priority"]) {
  switch (priority) {
    case "CRITICAL":
      return "danger";
    case "HIGH":
      return "warning";
    case "LOW":
      return "soft";
    default:
      return "default";
  }
}

function statusTone(status: ConversationPrayerRequest["status"]) {
  switch (status) {
    case "ANSWERED":
      return "success";
    case "ARCHIVED":
      return "soft";
    default:
      return "default";
  }
}
