"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, UserRound } from "lucide-react";
import {
  getConversationAttendanceMemberHistory,
  type Conversation,
  type ConversationAttendanceMemberHistory,
} from "../../lib/api-client";
import {
  AttendanceCard,
  AttendanceEmptyCard,
  AttendanceMetricTile,
  AttendanceSelectField,
  AttendanceStatePill,
  formatDateOnly,
  formatDateTime,
  formatFlag,
  formatMinutes,
  formatRecordStatus,
  recordTone,
  startCase,
} from "./tools-attendance-shared";

type AttendanceHistoryPanelProps = {
  accessToken: string;
  conversation: Conversation;
  canManageRoom: boolean;
  onNotice: (message: string) => void;
};

export function AttendanceHistoryPanel({
  accessToken,
  conversation,
  canManageRoom,
  onNotice,
}: AttendanceHistoryPanelProps) {
  const viewerUserId = useMemo(() => getJwtSubject(accessToken), [accessToken]);
  const historyMembers = useMemo(
    () =>
      canManageRoom
        ? conversation.participants
        : conversation.participants.filter((participant) => participant.userId === viewerUserId),
    [canManageRoom, conversation.participants, viewerUserId],
  );

  const [selectedMemberUserId, setSelectedMemberUserId] = useState(
    historyMembers[0]?.userId ?? "",
  );
  const [history, setHistory] = useState<ConversationAttendanceMemberHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!historyMembers.some((participant) => participant.userId === selectedMemberUserId)) {
      setSelectedMemberUserId(historyMembers[0]?.userId ?? "");
    }
  }, [historyMembers, selectedMemberUserId]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberUserId) {
      setHistory(null);
      return undefined;
    }

    setIsLoading(true);
    void getConversationAttendanceMemberHistory(
      conversation.id,
      selectedMemberUserId,
      accessToken,
    )
      .then((nextHistory) => {
        if (isMounted) {
          setHistory(nextHistory);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setHistory(null);
        }
        onNotice(
          error instanceof Error
            ? error.message
            : "Attendance history could not be loaded right now.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, conversation.id, onNotice, selectedMemberUserId]);

  return (
    <AttendanceCard
      eyebrow="Member history"
      title="Per-person attendance trail"
      body="Open a member history to review worked time, late trends, leave usage, and upcoming assignments without leaving the room."
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <AttendanceSelectField
          label="Member"
          onChange={setSelectedMemberUserId}
          options={
            historyMembers.length === 0
              ? [{ label: "No eligible member", value: "" }]
              : historyMembers.map((participant) => ({
                  label: `${participant.user.displayName} (@${
                    participant.user.userCode || participant.user.username
                  })`,
                  value: participant.userId,
                }))
          }
          value={selectedMemberUserId}
        />
        <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 text-graphite/64">
          {canManageRoom
            ? "Supervisors can inspect any room member."
            : "This view is scoped to your own attendance history."}
        </div>
      </div>

      {!selectedMemberUserId ? (
        <div className="mt-5">
          <AttendanceEmptyCard text="No room member is available for attendance history in this lane." />
        </div>
      ) : isLoading ? (
        <div className="mt-5">
          <AttendanceEmptyCard text="Loading attendance history..." />
        </div>
      ) : !history ? (
        <div className="mt-5">
          <AttendanceEmptyCard text="Attendance history is not available for that member yet." />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AttendanceMetricTile
              label="Worked"
              value={Math.round(history.summary.workedMinutes / 60)}
            />
            <AttendanceMetricTile label="Late" value={history.summary.lateCount} />
            <AttendanceMetricTile
              label="Exceptions"
              value={history.summary.exceptionCount}
            />
            <AttendanceMetricTile
              label="Approved leave"
              value={history.summary.approvedLeaveCount}
            />
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <section className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 grid h-10 w-10 place-items-center rounded-full bg-white text-charcoal">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-charcoal">
                      {history.member.displayName}
                    </p>
                    <p className="mt-1 text-xs text-graphite/58">
                      @{history.member.userCode || history.member.username}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-graphite/66 sm:grid-cols-2">
                  <span className="rounded-full bg-white px-2.5 py-1">
                    Scheduled shifts {history.summary.scheduledShifts}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1">
                    Completed shifts {history.summary.completedShifts}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1">
                    Worked {formatMinutes(history.summary.workedMinutes)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1">
                    Overtime {formatMinutes(history.summary.overtimeMinutes)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1">
                    Pending leave {history.summary.pendingLeaveCount}
                  </span>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-graphite/55">
                  Recent records
                </p>
                {history.recentRecords.length === 0 ? (
                  <AttendanceEmptyCard text="No attendance records have been captured for this member yet." />
                ) : (
                  history.recentRecords.map((record) => {
                    const latestEvent = record.clockEvents[record.clockEvents.length - 1];
                    return (
                      <article
                        className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4"
                        key={record.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-charcoal">
                              {latestEvent
                                ? `${startCase(latestEvent.eventType)} ${formatDateTime(
                                    latestEvent.occurredAt,
                                  )}`
                                : "Awaiting activity"}
                            </p>
                            <p className="mt-1 text-xs text-graphite/58">
                              Worked {formatMinutes(record.workedMinutes)} | Late{" "}
                              {record.lateMinutes} mins
                            </p>
                          </div>
                          <AttendanceStatePill tone={recordTone(record)}>
                            {formatRecordStatus(record.status)}
                          </AttendanceStatePill>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-graphite/66">
                          {record.flags.length === 0 ? (
                            <span className="rounded-full bg-white px-2.5 py-1">
                              No exception flags
                            </span>
                          ) : (
                            record.flags.map((flag) => (
                              <span
                                className="rounded-full bg-white px-2.5 py-1"
                                key={flag}
                              >
                                {formatFlag(flag)}
                              </span>
                            ))
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-graphite/55">
                  Upcoming assignments
                </p>
                <div className="mt-3 space-y-3">
                  {history.upcomingAssignments.length === 0 ? (
                    <AttendanceEmptyCard text="No future assignments are scheduled for this member." />
                  ) : (
                    history.upcomingAssignments.map((assignment) => (
                      <article className="rounded-[18px] bg-white p-3" key={assignment.id}>
                        <p className="text-sm font-semibold text-charcoal">{assignment.title}</p>
                        <p className="mt-1 text-xs text-graphite/58">
                          {formatDateTime(assignment.startsAt)} -{" "}
                          {formatDateTime(assignment.endsAt)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-graphite/66">
                          <span className="rounded-full bg-[#faf7f2] px-2.5 py-1">
                            {startCase(assignment.status)}
                          </span>
                          <span className="rounded-full bg-[#faf7f2] px-2.5 py-1">
                            {assignment.assignmentCount} assigned
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-graphite/55">
                  Leave history
                </p>
                <div className="mt-3 space-y-3">
                  {history.leaveRequests.length === 0 ? (
                    <AttendanceEmptyCard text="No leave history is recorded for this member yet." />
                  ) : (
                    history.leaveRequests.map((request) => (
                      <article className="rounded-[18px] bg-white p-3" key={request.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-charcoal">{request.title}</p>
                            <p className="mt-1 text-xs text-graphite/58">
                              {startCase(request.leaveType)} | {formatDateOnly(request.startsAt)} -{" "}
                              {formatDateOnly(request.endsAt)}
                            </p>
                          </div>
                          <AttendanceStatePill
                            tone={
                              request.status === "APPROVED"
                                ? "positive"
                                : request.status === "PENDING"
                                  ? "warning"
                                  : request.status === "DECLINED"
                                    ? "critical"
                                    : "neutral"
                            }
                          >
                            {startCase(request.status)}
                          </AttendanceStatePill>
                        </div>
                        <p className="mt-2 text-xs text-graphite/66">
                          {formatMinutes(request.minutesRequested)}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </AttendanceCard>
  );
}

function getJwtSubject(accessToken: string) {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return typeof decoded?.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
}
