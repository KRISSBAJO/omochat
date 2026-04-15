"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import {
  reviewConversationAttendanceLeaveRequest,
  reviewConversationAttendanceRecord,
  type Conversation,
  type ConversationAttendanceLeaveStatus,
  type ConversationAttendanceRecordStatus,
  type ConversationToolsWorkspace,
} from "../../lib/api-client";
import {
  AttendanceCard,
  AttendanceEmptyCard,
  AttendanceMutedNotice,
  AttendanceStatePill,
  formatDateOnly,
  formatDateTime,
  formatFlag,
  formatMinutes,
  formatRecordStatus,
  recordTone,
  startCase,
} from "./tools-attendance-shared";

type AttendanceActionRunner = (task: () => Promise<void>, success: string) => Promise<boolean>;

type AttendanceApprovalsPanelProps = {
  accessToken: string;
  conversation: Conversation;
  workspace: ConversationToolsWorkspace;
  canManageRoom: boolean;
  isBusy: boolean;
  onAction: AttendanceActionRunner;
};

export function AttendanceApprovalsPanel({
  accessToken,
  conversation,
  workspace,
  canManageRoom,
  isBusy,
  onAction,
}: AttendanceApprovalsPanelProps) {
  const [recordReviewNotes, setRecordReviewNotes] = useState<Record<string, string>>({});
  const [leaveReviewNotes, setLeaveReviewNotes] = useState<Record<string, string>>({});

  const approvalQueue = useMemo(
    () =>
      workspace.attendanceRecords.filter(
        (record) => record.status === "PENDING_APPROVAL" || record.flags.length > 0,
      ),
    [workspace.attendanceRecords],
  );
  const pendingLeave = useMemo(
    () =>
      workspace.attendanceLeaveRequests.filter(
        (request) => request.status === "PENDING" || request.status === "DRAFT",
      ),
    [workspace.attendanceLeaveRequests],
  );

  async function handleReviewRecord(
    recordId: string,
    status: Extract<ConversationAttendanceRecordStatus, "APPROVED" | "REJECTED">,
  ) {
    await onAction(
      () =>
        reviewConversationAttendanceRecord(
          conversation.id,
          recordId,
          {
            status,
            reviewNote: recordReviewNotes[recordId]?.trim() || undefined,
          },
          accessToken,
        ).then(() => undefined),
      status === "APPROVED"
        ? "Attendance record approved."
        : "Attendance record marked for follow-up.",
    );
  }

  async function handleReviewLeave(
    leaveRequestId: string,
    status: Extract<ConversationAttendanceLeaveStatus, "APPROVED" | "DECLINED" | "CANCELLED">,
  ) {
    await onAction(
      () =>
        reviewConversationAttendanceLeaveRequest(
          conversation.id,
          leaveRequestId,
          {
            status,
            reviewNote: leaveReviewNotes[leaveRequestId]?.trim() || undefined,
          },
          accessToken,
        ).then(() => undefined),
      status === "APPROVED" ? "Leave request approved." : "Leave request updated.",
    );
  }

  return (
    <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.9fr)]">
      <AttendanceCard
        eyebrow="Supervisor console"
        title="Attendance exceptions and approvals"
        body="Late, overtime, missed clock-out, and unusual activity all arrive here for supervisor review with a note trail."
      >
        {!canManageRoom ? (
          <AttendanceMutedNotice text="Only room leads and attendance supervisors can approve attendance exceptions." />
        ) : approvalQueue.length === 0 ? (
          <AttendanceEmptyCard text="No attendance record is waiting on approval right now." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {approvalQueue.map((record) => (
              <article className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4" key={record.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-charcoal">{record.user.displayName}</p>
                    <p className="mt-1 text-xs text-graphite/58">
                      {formatRecordStatus(record.status)} | {record.lateMinutes} late mins |{" "}
                      {record.overtimeMinutes} overtime mins
                    </p>
                  </div>
                  <AttendanceStatePill tone={recordTone(record)}>
                    {record.flags.length > 0 ? "Needs review" : "Pending"}
                  </AttendanceStatePill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-graphite/66">
                  <span className="rounded-full bg-white px-2.5 py-1">
                    {record.workedMinutes} worked mins
                  </span>
                  {record.flags.length === 0 ? (
                    <span className="rounded-full bg-white px-2.5 py-1">No exception flags</span>
                  ) : (
                    record.flags.map((flag) => (
                      <span className="rounded-full bg-white px-2.5 py-1" key={flag}>
                        {formatFlag(flag)}
                      </span>
                    ))
                  )}
                  {record.approvedAt ? (
                    <span className="rounded-full bg-white px-2.5 py-1">
                      Reviewed {formatDateTime(record.approvedAt)}
                    </span>
                  ) : null}
                </div>
                <textarea
                  className="mt-3 min-h-[88px] w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm leading-7 outline-none"
                  onChange={(event) =>
                    setRecordReviewNotes((current) => ({
                      ...current,
                      [record.id]: event.target.value,
                    }))
                  }
                  placeholder="Supervisor note for approval or rejection."
                  value={recordReviewNotes[record.id] ?? ""}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[#24613a] px-4 py-2.5 text-sm font-semibold text-cloud disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => {
                      void handleReviewRecord(record.id, "APPROVED");
                    }}
                    type="button"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => {
                      void handleReviewRecord(record.id, "REJECTED");
                    }}
                    type="button"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </AttendanceCard>

      <AttendanceCard
        eyebrow="Leave approvals"
        title="Time away review"
        body="Holiday, ministry, sick, and personal requests stay in one queue so supervisors can approve them with context before export."
      >
        {!canManageRoom ? (
          <AttendanceMutedNotice text="Leave approvals are reserved for room leads and attendance supervisors." />
        ) : pendingLeave.length === 0 ? (
          <AttendanceEmptyCard text="No leave request is waiting for review right now." />
        ) : (
          <div className="space-y-3">
            {pendingLeave.map((request) => (
              <article className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4" key={request.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-charcoal">{request.title}</p>
                    <p className="mt-1 text-xs text-graphite/58">
                      {request.user.displayName} | {startCase(request.leaveType)}
                    </p>
                  </div>
                  <AttendanceStatePill
                    tone={request.status === "PENDING" ? "warning" : "neutral"}
                  >
                    {startCase(request.status)}
                  </AttendanceStatePill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-graphite/66">
                  <span className="rounded-full bg-white px-2.5 py-1">
                    {formatDateOnly(request.startsAt)} - {formatDateOnly(request.endsAt)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1">
                    {formatMinutes(request.minutesRequested)}
                  </span>
                  {request.isPartialDay ? (
                    <span className="rounded-full bg-white px-2.5 py-1">Partial day</span>
                  ) : null}
                  {!request.deductFromBalance ? (
                    <span className="rounded-full bg-white px-2.5 py-1">No balance deduction</span>
                  ) : null}
                </div>
                {request.reason ? (
                  <p className="mt-3 text-sm leading-7 text-graphite/68">{request.reason}</p>
                ) : null}
                <textarea
                  className="mt-3 min-h-[88px] w-full rounded-[20px] border border-charcoal/10 bg-white px-4 py-3 text-sm leading-7 outline-none"
                  onChange={(event) =>
                    setLeaveReviewNotes((current) => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))
                  }
                  placeholder="Supervisor note for this leave decision."
                  value={leaveReviewNotes[request.id] ?? ""}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[#24613a] px-4 py-2.5 text-sm font-semibold text-cloud disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => {
                      void handleReviewLeave(request.id, "APPROVED");
                    }}
                    type="button"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => {
                      void handleReviewLeave(request.id, "DECLINED");
                    }}
                    type="button"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Decline
                  </button>
                </div>
                {request.reviewedBy || request.decidedAt ? (
                  <p className="mt-3 text-xs text-graphite/58">
                    {request.reviewedBy ? `Reviewed by ${request.reviewedBy.displayName}` : "Reviewed"}{" "}
                    {request.decidedAt ? `on ${formatDateTime(request.decidedAt)}` : ""}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </AttendanceCard>
    </section>
  );
}
