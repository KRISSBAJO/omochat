"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Clock3, ShieldCheck } from "lucide-react";
import {
  createConversationAttendanceHoliday,
  createConversationAttendanceLeaveRequest,
  updateConversationAttendanceHoliday,
  updateConversationAttendancePolicy,
  type Conversation,
  type ConversationAttendanceLeaveType,
  type ConversationToolsWorkspace,
} from "../../lib/api-client";
import {
  AttendanceCard,
  AttendanceDateField,
  AttendanceEmptyCard,
  AttendanceNumberField,
  AttendanceSelectField,
  AttendanceStatePill,
  AttendanceTextField,
  AttendanceToggleChip,
  combineDateAndTime,
  formatDateOnly,
  formatMinutes,
  startCase,
} from "./tools-attendance-shared";

type AttendanceActionRunner = (task: () => Promise<void>, success: string) => Promise<boolean>;

type AttendancePolicyPanelProps = {
  accessToken: string;
  conversation: Conversation;
  workspace: ConversationToolsWorkspace;
  canManageRoom: boolean;
  isBusy: boolean;
  onAction: AttendanceActionRunner;
  onNotice: (message: string) => void;
};

const leaveTypeOptions: Array<{ label: string; value: ConversationAttendanceLeaveType }> = [
  { value: "VACATION", label: "Vacation" },
  { value: "SICK", label: "Sick" },
  { value: "PERSONAL", label: "Personal" },
  { value: "COMPASSIONATE", label: "Compassionate" },
  { value: "MINISTRY", label: "Ministry" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "OTHER", label: "Other" },
];

export function AttendancePolicyPanel({
  accessToken,
  conversation,
  workspace,
  canManageRoom,
  isBusy,
  onAction,
  onNotice,
}: AttendancePolicyPanelProps) {
  const existingPolicy = workspace.attendancePolicy;
  const defaultUserId = conversation.participants[0]?.userId ?? "";
  const [timezone, setTimezone] = useState(existingPolicy?.timezone ?? "America/Chicago");
  const [standardHoursPerDay, setStandardHoursPerDay] = useState(String(existingPolicy?.standardHoursPerDay ?? 8));
  const [standardHoursPerWeek, setStandardHoursPerWeek] = useState(String(existingPolicy?.standardHoursPerWeek ?? 40));
  const [overtimeAfterMinutes, setOvertimeAfterMinutes] = useState(String(existingPolicy?.overtimeAfterMinutes ?? 480));
  const [doubleTimeAfterMinutes, setDoubleTimeAfterMinutes] = useState(String(existingPolicy?.doubleTimeAfterMinutes ?? 720));
  const [lateGraceMinutes, setLateGraceMinutes] = useState(String(existingPolicy?.lateGraceMinutes ?? 10));
  const [breakRequiredAfterMinutes, setBreakRequiredAfterMinutes] = useState(String(existingPolicy?.breakRequiredAfterMinutes ?? 360));
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(String(existingPolicy?.breakDurationMinutes ?? 30));
  const [allowSelfClock, setAllowSelfClock] = useState(existingPolicy?.allowSelfClock ?? true);
  const [allowManualAdjustments, setAllowManualAdjustments] = useState(existingPolicy?.allowManualAdjustments ?? false);
  const [requireSupervisorApproval, setRequireSupervisorApproval] = useState(existingPolicy?.requireSupervisorApproval ?? true);
  const [requireLocation, setRequireLocation] = useState(existingPolicy?.requireLocation ?? false);
  const [requirePhoto, setRequirePhoto] = useState(existingPolicy?.requirePhoto ?? false);
  const [requireQr, setRequireQr] = useState(existingPolicy?.requireQr ?? false);
  const [requireNfc, setRequireNfc] = useState(existingPolicy?.requireNfc ?? false);
  const [stationLabel, setStationLabel] = useState(existingPolicy?.stationLabel ?? "");
  const [stationCode, setStationCode] = useState(existingPolicy?.stationCode ?? "");

  const [holidayTitle, setHolidayTitle] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const [holidayStartsOn, setHolidayStartsOn] = useState("");
  const [holidayEndsOn, setHolidayEndsOn] = useState("");
  const [holidayPaid, setHolidayPaid] = useState(true);

  const [leaveTitle, setLeaveTitle] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveType, setLeaveType] = useState<ConversationAttendanceLeaveType>("PERSONAL");
  const [leaveUserId, setLeaveUserId] = useState(defaultUserId);
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveStartTime, setLeaveStartTime] = useState("09:00");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveEndTime, setLeaveEndTime] = useState("17:00");
  const [leaveIsPartialDay, setLeaveIsPartialDay] = useState(false);
  const [leaveDeductFromBalance, setLeaveDeductFromBalance] = useState(true);

  useEffect(() => {
    setTimezone(existingPolicy?.timezone ?? "America/Chicago");
    setStandardHoursPerDay(String(existingPolicy?.standardHoursPerDay ?? 8));
    setStandardHoursPerWeek(String(existingPolicy?.standardHoursPerWeek ?? 40));
    setOvertimeAfterMinutes(String(existingPolicy?.overtimeAfterMinutes ?? 480));
    setDoubleTimeAfterMinutes(String(existingPolicy?.doubleTimeAfterMinutes ?? 720));
    setLateGraceMinutes(String(existingPolicy?.lateGraceMinutes ?? 10));
    setBreakRequiredAfterMinutes(String(existingPolicy?.breakRequiredAfterMinutes ?? 360));
    setBreakDurationMinutes(String(existingPolicy?.breakDurationMinutes ?? 30));
    setAllowSelfClock(existingPolicy?.allowSelfClock ?? true);
    setAllowManualAdjustments(existingPolicy?.allowManualAdjustments ?? false);
    setRequireSupervisorApproval(existingPolicy?.requireSupervisorApproval ?? true);
    setRequireLocation(existingPolicy?.requireLocation ?? false);
    setRequirePhoto(existingPolicy?.requirePhoto ?? false);
    setRequireQr(existingPolicy?.requireQr ?? false);
    setRequireNfc(existingPolicy?.requireNfc ?? false);
    setStationLabel(existingPolicy?.stationLabel ?? "");
    setStationCode(existingPolicy?.stationCode ?? "");
  }, [existingPolicy]);

  useEffect(() => {
    setLeaveUserId((current) => current || defaultUserId);
  }, [defaultUserId]);

  const recentLeave = useMemo(
    () => [...workspace.attendanceLeaveRequests].sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()).slice(0, 5),
    [workspace.attendanceLeaveRequests],
  );

  async function handleSavePolicy() {
    if (!timezone.trim()) {
      onNotice("Give the attendance policy a valid timezone.");
      return;
    }

    await onAction(
      () =>
        updateConversationAttendancePolicy(
          conversation.id,
          {
            timezone: timezone.trim(),
            standardHoursPerDay: Number(standardHoursPerDay) || 8,
            standardHoursPerWeek: Number(standardHoursPerWeek) || 40,
            overtimeAfterMinutes: Number(overtimeAfterMinutes) || 480,
            doubleTimeAfterMinutes: Number(doubleTimeAfterMinutes) || 720,
            lateGraceMinutes: Number(lateGraceMinutes) || 10,
            breakRequiredAfterMinutes: Number(breakRequiredAfterMinutes) || 360,
            breakDurationMinutes: Number(breakDurationMinutes) || 30,
            allowSelfClock,
            allowManualAdjustments,
            requireSupervisorApproval,
            requireLocation,
            requirePhoto,
            requireQr,
            requireNfc,
            stationLabel: stationLabel.trim() || null,
            stationCode: stationCode.trim() || null,
          },
          accessToken,
        ).then(() => undefined),
      "Attendance policy saved.",
    );
  }

  async function handleCreateHoliday() {
    if (!holidayTitle.trim() || !holidayStartsOn || !holidayEndsOn) {
      onNotice("Give the holiday a title plus start and end dates.");
      return;
    }

    const created = await onAction(
      () =>
        createConversationAttendanceHoliday(
          conversation.id,
          {
            title: holidayTitle.trim(),
            description: holidayDescription.trim() || undefined,
            startsOn: new Date(`${holidayStartsOn}T00:00:00`).toISOString(),
            endsOn: new Date(`${holidayEndsOn}T23:59:59`).toISOString(),
            isPaid: holidayPaid,
          },
          accessToken,
        ).then(() => undefined),
      "Holiday saved.",
    );

    if (created) {
      setHolidayTitle("");
      setHolidayDescription("");
      setHolidayStartsOn("");
      setHolidayEndsOn("");
      setHolidayPaid(true);
    }
  }

  async function handleCreateLeaveRequest() {
    const startsAt = combineDateAndTime(leaveStartDate, leaveStartTime);
    const endsAt = combineDateAndTime(leaveEndDate || leaveStartDate, leaveEndTime);
    if (!leaveTitle.trim() || !leaveUserId || !startsAt || !endsAt) {
      onNotice("Choose the member, title, and leave time window before saving.");
      return;
    }

    const created = await onAction(
      () =>
        createConversationAttendanceLeaveRequest(
          conversation.id,
          {
            title: leaveTitle.trim(),
            reason: leaveReason.trim() || undefined,
            leaveType,
            startsAt,
            endsAt,
            userId: leaveUserId,
            isPartialDay: leaveIsPartialDay,
            deductFromBalance: leaveDeductFromBalance,
          },
          accessToken,
        ).then(() => undefined),
      "Leave request submitted.",
    );

    if (created) {
      setLeaveTitle("");
      setLeaveReason("");
      setLeaveType("PERSONAL");
      setLeaveUserId(defaultUserId);
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveStartTime("09:00");
      setLeaveEndTime("17:00");
      setLeaveIsPartialDay(false);
      setLeaveDeductFromBalance(true);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_380px]">
      <div className="space-y-5">
        <AttendanceCard
          eyebrow="Attendance policy"
          title="Rules, leave, and holiday controls"
          body="Set the attendance rules once, then use the same policy for kiosk checks, leave handling, holiday closures, and supervisor approvals."
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <AttendanceTextField label="Timezone" onChange={setTimezone} placeholder="America/Chicago" value={timezone} />
            <AttendanceNumberField label="Hours / day" onChange={setStandardHoursPerDay} value={standardHoursPerDay} />
            <AttendanceNumberField label="Hours / week" onChange={setStandardHoursPerWeek} value={standardHoursPerWeek} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-4">
            <AttendanceNumberField label="Overtime after (min)" onChange={setOvertimeAfterMinutes} value={overtimeAfterMinutes} />
            <AttendanceNumberField label="Double time after (min)" onChange={setDoubleTimeAfterMinutes} value={doubleTimeAfterMinutes} />
            <AttendanceNumberField label="Late grace (min)" onChange={setLateGraceMinutes} value={lateGraceMinutes} />
            <AttendanceNumberField label="Break length (min)" onChange={setBreakDurationMinutes} value={breakDurationMinutes} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <AttendanceNumberField label="Break required after (min)" onChange={setBreakRequiredAfterMinutes} value={breakRequiredAfterMinutes} />
            <AttendanceTextField icon={ShieldCheck} label="Station label" onChange={setStationLabel} placeholder="Main lobby kiosk" value={stationLabel} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <AttendanceTextField icon={Clock3} label="Station code" onChange={setStationCode} placeholder="LOBBY-01" value={stationCode} />
            <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 text-graphite/64">
              Default station requirements flow into new shifts automatically. Staff can still override them per shift if the room lead needs a different kiosk or proof rule.
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <AttendanceToggleChip active={allowSelfClock} label="Allow self clock" onClick={() => setAllowSelfClock((current) => !current)} />
            <AttendanceToggleChip active={allowManualAdjustments} label="Allow manual edits" onClick={() => setAllowManualAdjustments((current) => !current)} />
            <AttendanceToggleChip active={requireSupervisorApproval} label="Need supervisor approval" onClick={() => setRequireSupervisorApproval((current) => !current)} />
            <AttendanceToggleChip active={requireLocation} label="Require location" onClick={() => setRequireLocation((current) => !current)} />
            <AttendanceToggleChip active={requirePhoto} label="Require photo" onClick={() => setRequirePhoto((current) => !current)} />
            <AttendanceToggleChip active={requireQr} label="Require QR" onClick={() => setRequireQr((current) => !current)} />
            <AttendanceToggleChip active={requireNfc} label="Require NFC" onClick={() => setRequireNfc((current) => !current)} />
          </div>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
            disabled={isBusy || !canManageRoom}
            onClick={() => {
              void handleSavePolicy();
            }}
            type="button"
          >
            <ShieldCheck className="h-4 w-4" />
            Save policy
          </button>
        </AttendanceCard>

        <AttendanceCard
          eyebrow="Holiday calendar"
          title="Paid and unpaid holiday rules"
          body="Publish closure windows and paid holidays once so rosters, leave, and payroll exports use the same official calendar."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <AttendanceTextField label="Holiday title" onChange={setHolidayTitle} placeholder="Christmas day" value={holidayTitle} />
            <AttendanceTextField icon={CalendarRange} label="Holiday note" onChange={setHolidayDescription} placeholder="Optional guidance for the team" value={holidayDescription} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <AttendanceDateField label="Starts on" onChange={setHolidayStartsOn} value={holidayStartsOn} />
            <AttendanceDateField label="Ends on" onChange={setHolidayEndsOn} value={holidayEndsOn} />
            <div className="flex items-end">
              <AttendanceToggleChip active={holidayPaid} label={holidayPaid ? "Paid holiday" : "Unpaid closure"} onClick={() => setHolidayPaid((current) => !current)} />
            </div>
          </div>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
            disabled={isBusy || !canManageRoom}
            onClick={() => {
              void handleCreateHoliday();
            }}
            type="button"
          >
            <CalendarRange className="h-4 w-4" />
            Save holiday
          </button>

          <div className="mt-5 space-y-3">
            {workspace.attendanceHolidays.length === 0 ? (
              <AttendanceEmptyCard text="No holiday has been scheduled for this room yet." />
            ) : (
              workspace.attendanceHolidays.map((holiday) => (
                <article className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4" key={holiday.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-charcoal">{holiday.title}</p>
                      <p className="mt-1 text-xs text-graphite/58">
                        {formatDateOnly(holiday.startsOn)} - {formatDateOnly(holiday.endsOn)}
                      </p>
                    </div>
                    <AttendanceStatePill tone={holiday.isPaid ? "positive" : "neutral"}>
                      {holiday.isPaid ? "Paid" : "Unpaid"}
                    </AttendanceStatePill>
                  </div>
                  {holiday.description ? <p className="mt-3 text-sm leading-7 text-graphite/68">{holiday.description}</p> : null}
                  {canManageRoom ? (
                    <button
                      className="mt-3 rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal"
                      onClick={() => {
                        void onAction(
                          () =>
                            updateConversationAttendanceHoliday(
                              conversation.id,
                              holiday.id,
                              { isPaid: !holiday.isPaid },
                              accessToken,
                            ).then(() => undefined),
                          holiday.isPaid ? "Holiday changed to unpaid." : "Holiday changed to paid.",
                        );
                      }}
                      type="button"
                    >
                      Toggle paid state
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </AttendanceCard>
      </div>

      <div className="space-y-5">
        <AttendanceCard
          eyebrow="Leave requests"
          title="Time away and special leave"
          body="Submit leave directly from the room workspace, then let supervisors approve or decline it in the attendance queue."
        >
          <div className="grid gap-3">
            <AttendanceTextField label="Request title" onChange={setLeaveTitle} placeholder="Family support leave" value={leaveTitle} />
            <AttendanceSelectField
              label="Leave type"
              onChange={(value) => setLeaveType(value as ConversationAttendanceLeaveType)}
              options={leaveTypeOptions}
              value={leaveType}
            />
            <AttendanceSelectField
              label="Member"
              onChange={setLeaveUserId}
              options={conversation.participants.map((participant) => ({
                value: participant.userId,
                label: `${participant.user.displayName} (${participant.user.userCode ? `@${participant.user.userCode}` : participant.user.username})`,
              }))}
              value={leaveUserId}
            />
          </div>
          <textarea
            className="mt-3 min-h-[120px] w-full rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
            onChange={(event) => setLeaveReason(event.target.value)}
            placeholder="Why is this leave needed, and what should the supervisor know?"
            value={leaveReason}
          />
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <AttendanceDateField label="Start date" onChange={setLeaveStartDate} value={leaveStartDate} />
            <AttendanceDateField label="End date" onChange={setLeaveEndDate} value={leaveEndDate} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <AttendanceTextField label="Start time" onChange={setLeaveStartTime} placeholder="09:00" value={leaveStartTime} />
            <AttendanceTextField label="End time" onChange={setLeaveEndTime} placeholder="17:00" value={leaveEndTime} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AttendanceToggleChip active={leaveIsPartialDay} label="Partial day" onClick={() => setLeaveIsPartialDay((current) => !current)} />
            <AttendanceToggleChip active={leaveDeductFromBalance} label="Deduct from balance" onClick={() => setLeaveDeductFromBalance((current) => !current)} />
          </div>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
            disabled={isBusy}
            onClick={() => {
              void handleCreateLeaveRequest();
            }}
            type="button"
          >
            <Clock3 className="h-4 w-4" />
            Submit leave request
          </button>

          <div className="mt-5 space-y-3">
            {recentLeave.length === 0 ? (
              <AttendanceEmptyCard text="No leave request has been recorded in this room yet." />
            ) : (
              recentLeave.map((request) => (
                <article className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4" key={request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-charcoal">{request.title}</p>
                      <p className="mt-1 text-xs text-graphite/58">
                        {request.user.displayName} - {startCase(request.leaveType)}
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
                  <p className="mt-3 text-sm leading-7 text-graphite/68">
                    {formatDateOnly(request.startsAt)} - {formatDateOnly(request.endsAt)} • {formatMinutes(request.minutesRequested)}
                  </p>
                  {request.reason ? <p className="mt-2 text-sm leading-7 text-graphite/64">{request.reason}</p> : null}
                </article>
              ))
            )}
          </div>
        </AttendanceCard>
      </div>
    </section>
  );
}
