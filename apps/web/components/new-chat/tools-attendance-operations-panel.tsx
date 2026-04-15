"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, MapPinned, QrCode, TimerReset, UserPlus } from "lucide-react";
import {
  createConversationAttendanceAssignment,
  createConversationAttendanceClockEvent,
  createConversationAttendanceShift,
  createConversationAttendanceTemplate,
  updateConversationAttendanceAssignment,
  updateConversationAttendanceShift,
  updateConversationAttendanceTemplate,
  type Conversation,
  type ConversationAttendanceClockEventType,
  type ConversationAttendanceClockMethod,
  type ConversationAttendanceRecord,
  type ConversationAttendanceShiftStatus,
  type ConversationToolsWorkspace,
} from "../../lib/api-client";
import {
  AttendanceCard,
  AttendanceEmptyCard,
  AttendanceMutedNotice,
  AttendanceNumberField,
  AttendanceSelectField,
  AttendanceStatePill,
  AttendanceTextField,
  AttendanceTimeField,
  AttendanceToggleChip,
  assignmentTone,
  combineDateAndTime,
  formatAssignmentStatus,
  formatClockEventType,
  formatDateTime,
  formatDaysOfWeek,
  formatFlag,
  formatRecordStatus,
  formatShiftStatus,
  parseNullableNumber,
  recordTone,
  shiftStateTone,
  weekdayOptions,
} from "./tools-attendance-shared";

type AttendanceActionRunner = (task: () => Promise<void>, success: string) => Promise<boolean>;

type AttendanceOperationsPanelProps = {
  accessToken: string;
  conversation: Conversation;
  workspace: ConversationToolsWorkspace;
  canManageRoom: boolean;
  isBusy: boolean;
  onAction: AttendanceActionRunner;
  onNotice: (message: string) => void;
};

const shiftStatuses: ConversationAttendanceShiftStatus[] = ["DRAFT", "PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const clockEventOptions: Array<{ value: ConversationAttendanceClockEventType; label: string }> = [
  { value: "CLOCK_IN", label: "Clock in" },
  { value: "BREAK_START", label: "Break start" },
  { value: "BREAK_END", label: "Break end" },
  { value: "CLOCK_OUT", label: "Clock out" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const clockMethodOptions: Array<{ value: ConversationAttendanceClockMethod; label: string }> = [
  { value: "WEB", label: "Web" },
  { value: "MOBILE", label: "Mobile" },
  { value: "MANUAL", label: "Manual" },
  { value: "QR", label: "QR" },
  { value: "PHOTO", label: "Photo" },
  { value: "NFC", label: "NFC" },
  { value: "KIOSK", label: "Kiosk" },
];

export function AttendanceOperationsPanel({
  accessToken,
  conversation,
  workspace,
  canManageRoom,
  isBusy,
  onAction,
  onNotice,
}: AttendanceOperationsPanelProps) {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(workspace.attendanceShifts[0]?.id ?? null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateLocationName, setTemplateLocationName] = useState("");
  const [templateLocationAddress, setTemplateLocationAddress] = useState("");
  const [templateStartsAtTime, setTemplateStartsAtTime] = useState("09:00");
  const [templateEndsAtTime, setTemplateEndsAtTime] = useState("17:00");
  const [templateBreakMinutes, setTemplateBreakMinutes] = useState("30");
  const [templateGraceMinutes, setTemplateGraceMinutes] = useState("10");
  const [templateDaysOfWeek, setTemplateDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [templateRequiresLocation, setTemplateRequiresLocation] = useState(false);
  const [templateRequiresPhoto, setTemplateRequiresPhoto] = useState(false);
  const [templateRequiresQr, setTemplateRequiresQr] = useState(false);
  const [templateRequiresNfc, setTemplateRequiresNfc] = useState(false);

  const [shiftTitle, setShiftTitle] = useState("");
  const [shiftTemplateId, setShiftTemplateId] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [shiftStartDate, setShiftStartDate] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("09:00");
  const [shiftEndDate, setShiftEndDate] = useState("");
  const [shiftEndTime, setShiftEndTime] = useState("17:00");
  const [shiftApprovalRequired, setShiftApprovalRequired] = useState(true);
  const [shiftStatus, setShiftStatus] = useState<ConversationAttendanceShiftStatus>("PUBLISHED");
  const [shiftStationCode, setShiftStationCode] = useState("");

  const [assignmentUserId, setAssignmentUserId] = useState("");
  const [clockEventType, setClockEventType] = useState<ConversationAttendanceClockEventType>("CLOCK_IN");
  const [clockMethod, setClockMethod] = useState<ConversationAttendanceClockMethod>("WEB");
  const [clockNote, setClockNote] = useState("");
  const [clockProofUrl, setClockProofUrl] = useState("");
  const [clockQrValue, setClockQrValue] = useState("");
  const [clockStationCode, setClockStationCode] = useState("");
  const [clockDeviceLabel, setClockDeviceLabel] = useState("");
  const [clockLatitude, setClockLatitude] = useState("");
  const [clockLongitude, setClockLongitude] = useState("");
  const [clockAccuracyMeters, setClockAccuracyMeters] = useState("");

  const attendanceTemplates = workspace.attendanceTemplates;
  const attendanceShifts = useMemo(
    () => [...workspace.attendanceShifts].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()),
    [workspace.attendanceShifts],
  );
  const selectedShift = attendanceShifts.find((shift) => shift.id === selectedShiftId) ?? attendanceShifts[0] ?? null;
  const activeShiftRecords = useMemo(
    () => workspace.attendanceRecords.filter((record) => record.status === "ON_CLOCK" || record.status === "ON_BREAK"),
    [workspace.attendanceRecords],
  );

  useEffect(() => {
    if (!selectedShiftId || !attendanceShifts.some((shift) => shift.id === selectedShiftId)) {
      setSelectedShiftId(attendanceShifts[0]?.id ?? null);
    }
  }, [attendanceShifts, selectedShiftId]);

  useEffect(() => {
    setClockStationCode(selectedShift?.stationCode ?? workspace.attendancePolicy?.stationCode ?? "");
  }, [selectedShift?.stationCode, workspace.attendancePolicy?.stationCode]);

  async function handleCreateTemplate() {
    if (!templateTitle.trim()) {
      onNotice("Give the shift template a clear title.");
      return;
    }

    const created = await onAction(
      () =>
        createConversationAttendanceTemplate(
          conversation.id,
          {
            title: templateTitle.trim(),
            description: templateDescription.trim() || undefined,
            locationName: templateLocationName.trim() || undefined,
            locationAddress: templateLocationAddress.trim() || undefined,
            startsAtTime: templateStartsAtTime,
            endsAtTime: templateEndsAtTime,
            breakMinutes: Number(templateBreakMinutes) || 0,
            gracePeriodMinutes: Number(templateGraceMinutes) || 10,
            daysOfWeek: templateDaysOfWeek,
            requiresLocation: templateRequiresLocation,
            requiresPhoto: templateRequiresPhoto,
            requiresQr: templateRequiresQr,
            requiresNfc: templateRequiresNfc,
          },
          accessToken,
        ).then(() => undefined),
      "Shift template saved.",
    );

    if (created) {
      setTemplateTitle("");
      setTemplateDescription("");
      setTemplateLocationName("");
      setTemplateLocationAddress("");
      setTemplateStartsAtTime("09:00");
      setTemplateEndsAtTime("17:00");
      setTemplateBreakMinutes("30");
      setTemplateGraceMinutes("10");
      setTemplateDaysOfWeek([1, 2, 3, 4, 5]);
      setTemplateRequiresLocation(false);
      setTemplateRequiresPhoto(false);
      setTemplateRequiresQr(false);
      setTemplateRequiresNfc(false);
    }
  }

  async function handleCreateShift() {
    const startsAt = combineDateAndTime(shiftStartDate, shiftStartTime);
    const endsAt = combineDateAndTime(shiftEndDate || shiftStartDate, shiftEndTime);
    if (!shiftTitle.trim() && !shiftTemplateId) {
      onNotice("Choose a template or give the shift a title.");
      return;
    }
    if (!startsAt || !endsAt) {
      onNotice("Choose a valid shift date and time window.");
      return;
    }

    const created = await onAction(
      async () => {
        const shift = await createConversationAttendanceShift(
          conversation.id,
          {
            title: shiftTitle.trim() || attendanceTemplates.find((item) => item.id === shiftTemplateId)?.title || "Shift",
            templateId: shiftTemplateId || undefined,
            notes: shiftNotes.trim() || undefined,
            startsAt,
            endsAt,
            approvalRequired: shiftApprovalRequired,
            status: shiftStatus,
            stationCode: shiftStationCode.trim() || undefined,
          },
          accessToken,
        );
        setSelectedShiftId(shift.id);
      },
      "Shift scheduled.",
    );

    if (created) {
      setShiftTitle("");
      setShiftTemplateId("");
      setShiftNotes("");
      setShiftStartDate("");
      setShiftEndDate("");
      setShiftStartTime("09:00");
      setShiftEndTime("17:00");
      setShiftApprovalRequired(true);
      setShiftStatus("PUBLISHED");
      setShiftStationCode("");
    }
  }

  async function handleAssignToShift() {
    if (!selectedShift || !assignmentUserId) {
      onNotice("Choose a shift and member first.");
      return;
    }

    const created = await onAction(
      () =>
        createConversationAttendanceAssignment(conversation.id, selectedShift.id, { userId: assignmentUserId }, accessToken).then(() => undefined),
      "Member added to the roster.",
    );

    if (created) {
      setAssignmentUserId("");
    }
  }

  async function handleClockEvent() {
    if (!selectedShift) {
      onNotice("Choose a shift before clocking time.");
      return;
    }

    const created = await onAction(
      () =>
        createConversationAttendanceClockEvent(
          conversation.id,
          selectedShift.id,
          {
            eventType: clockEventType,
            method: clockMethod,
            note: clockNote.trim() || undefined,
            proofUrl: clockProofUrl.trim() || undefined,
            qrValue: clockQrValue.trim() || undefined,
            stationCode: clockStationCode.trim() || undefined,
            deviceLabel: clockDeviceLabel.trim() || undefined,
            latitude: parseNullableNumber(clockLatitude),
            longitude: parseNullableNumber(clockLongitude),
            accuracyMeters: parseNullableNumber(clockAccuracyMeters),
          },
          accessToken,
        ).then(() => undefined),
      `${formatClockEventType(clockEventType)} recorded.`,
    );

    if (created) {
      setClockNote("");
      setClockProofUrl("");
      setClockQrValue("");
      setClockDeviceLabel("");
      setClockLatitude("");
      setClockLongitude("");
      setClockAccuracyMeters("");
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
      <div className="space-y-5">
        <AttendanceCard eyebrow="Shift templates" title="Template library and roster planning" body="Create repeatable shift patterns, then schedule real shifts and assign members without rebuilding the attendance rules each time.">
          {canManageRoom ? (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                <AttendanceTextField label="Template title" onChange={setTemplateTitle} placeholder="Sunday service team" value={templateTitle} />
                <AttendanceTextField label="Location" onChange={setTemplateLocationName} placeholder="Main auditorium" value={templateLocationName} />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <AttendanceTimeField label="Starts" onChange={setTemplateStartsAtTime} value={templateStartsAtTime} />
                <AttendanceTimeField label="Ends" onChange={setTemplateEndsAtTime} value={templateEndsAtTime} />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <AttendanceNumberField label="Break minutes" onChange={setTemplateBreakMinutes} value={templateBreakMinutes} />
                <AttendanceNumberField label="Grace minutes" onChange={setTemplateGraceMinutes} value={templateGraceMinutes} />
              </div>
              <textarea
                className="mt-3 min-h-[110px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
                onChange={(event) => setTemplateDescription(event.target.value)}
                placeholder="Optional notes for this template."
                value={templateDescription}
              />
              <input
                className="mt-3 w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
                onChange={(event) => setTemplateLocationAddress(event.target.value)}
                placeholder="Location address"
                value={templateLocationAddress}
              />
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">Schedule days</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {weekdayOptions.map((day) => {
                    const active = templateDaysOfWeek.includes(day.value);
                    return (
                      <button
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          active ? "border-[#9bd0a5] bg-[#e4f4e6] text-[#215a35]" : "border-charcoal/10 bg-white text-charcoal"
                        }`}
                        key={day.value}
                        onClick={() =>
                          setTemplateDaysOfWeek((current) =>
                            current.includes(day.value)
                              ? current.filter((value) => value !== day.value)
                              : [...current, day.value].sort((left, right) => left - right),
                          )
                        }
                        type="button"
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <AttendanceToggleChip active={templateRequiresLocation} label="Require location" onClick={() => setTemplateRequiresLocation((current) => !current)} />
                <AttendanceToggleChip active={templateRequiresPhoto} label="Require photo" onClick={() => setTemplateRequiresPhoto((current) => !current)} />
                <AttendanceToggleChip active={templateRequiresQr} label="Require QR" onClick={() => setTemplateRequiresQr((current) => !current)} />
                <AttendanceToggleChip active={templateRequiresNfc} label="Require NFC" onClick={() => setTemplateRequiresNfc((current) => !current)} />
              </div>
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                disabled={isBusy}
                onClick={() => {
                  void handleCreateTemplate();
                }}
                type="button"
              >
                <CalendarClock className="h-4 w-4" />
                Save template
              </button>
            </>
          ) : (
            <AttendanceMutedNotice text="Templates are managed by room leads. You can still view scheduled shifts and clock activity below." />
          )}

          <div className="mt-5 grid gap-3">
            {attendanceTemplates.length === 0 ? (
              <AttendanceEmptyCard text="No attendance template exists yet. The first one becomes the repeatable schedule baseline for this room." />
            ) : (
              attendanceTemplates.map((template) => (
                <article className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4" key={template.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-charcoal">{template.title}</p>
                      <p className="mt-1 text-xs text-graphite/58">
                        {template.startsAtTime} - {template.endsAtTime} | {formatDaysOfWeek(template.daysOfWeek)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AttendanceStatePill tone={template.isActive ? "positive" : "neutral"}>
                        {template.isActive ? "Active" : "Paused"}
                      </AttendanceStatePill>
                      {canManageRoom ? (
                        <button
                          className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal"
                          onClick={() => {
                            void onAction(
                              () =>
                                updateConversationAttendanceTemplate(conversation.id, template.id, { isActive: !template.isActive }, accessToken).then(() => undefined),
                              template.isActive ? "Template paused." : "Template reactivated.",
                            );
                          }}
                          type="button"
                        >
                          {template.isActive ? "Pause" : "Resume"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-graphite/66">
                    {template.locationName ? <span className="rounded-full bg-white px-2.5 py-1">{template.locationName}</span> : null}
                    <span className="rounded-full bg-white px-2.5 py-1">{template.breakMinutes} break mins</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{template.gracePeriodMinutes} grace mins</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </AttendanceCard>

        <AttendanceCard eyebrow="Shift planner" title="Live shifts and schedule" body="Schedule a real shift, assign the roster, then let the room clock against the active plan with kiosk-ready proofs.">
          <div className="grid gap-3 lg:grid-cols-2">
            <AttendanceTextField label="Shift title" onChange={setShiftTitle} placeholder="Midweek follow-up coverage" value={shiftTitle} />
            <AttendanceSelectField
              label="Template"
              onChange={setShiftTemplateId}
              options={[{ label: "No template", value: "" }, ...attendanceTemplates.map((template) => ({ label: template.title, value: template.id }))]}
              value={shiftTemplateId}
            />
          </div>
          <textarea
            className="mt-3 min-h-[100px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
            onChange={(event) => setShiftNotes(event.target.value)}
            placeholder="Shift notes for the team."
            value={shiftNotes}
          />
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <AttendanceTextField label="Start date" onChange={setShiftStartDate} placeholder="YYYY-MM-DD" value={shiftStartDate} />
            <AttendanceTimeField label="Start time" onChange={setShiftStartTime} value={shiftStartTime} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <AttendanceTextField label="End date" onChange={setShiftEndDate} placeholder="YYYY-MM-DD" value={shiftEndDate} />
            <AttendanceTimeField label="End time" onChange={setShiftEndTime} value={shiftEndTime} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <AttendanceSelectField
              label="Status"
              onChange={(value) => setShiftStatus(value as ConversationAttendanceShiftStatus)}
              options={shiftStatuses.map((status) => ({ value: status, label: formatShiftStatus(status) }))}
              value={shiftStatus}
            />
            <AttendanceTextField label="Station code" onChange={setShiftStationCode} placeholder={workspace.attendancePolicy?.stationCode || "Optional"} value={shiftStationCode} />
            <div className="flex items-end">
              <AttendanceToggleChip active={shiftApprovalRequired} label="Supervisor approval required" onClick={() => setShiftApprovalRequired((current) => !current)} />
            </div>
          </div>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
            disabled={isBusy || !canManageRoom}
            onClick={() => {
              void handleCreateShift();
            }}
            type="button"
          >
            <CalendarClock className="h-4 w-4" />
            Schedule shift
          </button>

          <div className="mt-5 grid gap-3">
            {attendanceShifts.length === 0 ? (
              <AttendanceEmptyCard text="No shift has been scheduled yet. Once you add one, rostering and clock events will live here." />
            ) : (
              attendanceShifts.map((shift) => (
                <article
                  className={`rounded-[22px] border p-4 transition ${shift.id === selectedShift?.id ? "border-charcoal/16 bg-white shadow-[0_10px_24px_rgba(24,18,15,0.06)]" : "border-charcoal/10 bg-[#faf7f2]"}`}
                  key={shift.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-charcoal">{shift.title}</p>
                      <p className="mt-1 text-xs text-graphite/58">{formatDateTime(shift.startsAt)} - {formatDateTime(shift.endsAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AttendanceStatePill tone={shiftStateTone(shift.status)}>{formatShiftStatus(shift.status)}</AttendanceStatePill>
                      {canManageRoom ? (
                        <select
                          className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold outline-none"
                          onChange={(event) => {
                            void onAction(
                              () =>
                                updateConversationAttendanceShift(
                                  conversation.id,
                                  shift.id,
                                  { status: event.target.value as ConversationAttendanceShiftStatus },
                                  accessToken,
                                ).then(() => undefined),
                              "Shift status updated.",
                            );
                          }}
                          value={shift.status}
                        >
                          {shiftStatuses.map((status) => (
                            <option key={status} value={status}>
                              {formatShiftStatus(status)}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <button
                        className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal"
                        onClick={() => setSelectedShiftId(shift.id)}
                        type="button"
                      >
                        {shift.id === selectedShift?.id ? "Selected" : "Open"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-graphite/66">
                    <span className="rounded-full bg-white px-2.5 py-1">{shift.assignmentCount} assigned</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{shift.recordCount} records</span>
                    {shift.stationCode ? <span className="rounded-full bg-white px-2.5 py-1">Station {shift.stationCode}</span> : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </AttendanceCard>
      </div>

      <div className="space-y-5">
        <AttendanceCard eyebrow="Roster" title={selectedShift ? `${selectedShift.title} roster` : "Select a shift"} body="Assign members into the shift, confirm their participation, and keep attendance tied to real room membership.">
          {!selectedShift ? (
            <AttendanceEmptyCard text="Choose a shift first. The roster, confirmations, and live exceptions all stay attached to that selected shift." />
          ) : (
            <>
              {canManageRoom ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
                  <AttendanceSelectField
                    label="Add room member"
                    onChange={setAssignmentUserId}
                    options={[
                      { label: "Choose room participant", value: "" },
                      ...conversation.participants.map((participant) => ({
                        label: `${participant.user.displayName} (@${participant.user.userCode || participant.user.username})`,
                        value: participant.userId,
                      })),
                    ]}
                    value={assignmentUserId}
                  />
                  <div className="flex items-end">
                    <button
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                      disabled={isBusy || !assignmentUserId}
                      onClick={() => {
                        void handleAssignToShift();
                      }}
                      type="button"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add to shift
                    </button>
                  </div>
                </div>
              ) : (
                <AttendanceMutedNotice text="Room leads own the roster. Everyone else can still view the shift and clock from the station flow." />
              )}

              <div className="mt-5 grid gap-3">
                {selectedShift.assignments.length === 0 ? (
                  <AttendanceEmptyCard text="No one is rostered yet. Add room members here and their confirmations plus attendance records will appear in this lane." />
                ) : (
                  selectedShift.assignments.map((assignment) => (
                    <article className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4" key={assignment.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-charcoal">{assignment.user.displayName}</p>
                          <p className="mt-1 text-xs text-graphite/58">
                            @{assignment.user.userCode || assignment.user.username}
                          </p>
                        </div>
                        <AttendanceStatePill tone={assignmentTone(assignment.status)}>
                          {formatAssignmentStatus(assignment.status)}
                        </AttendanceStatePill>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-graphite/66">
                        <span className="rounded-full bg-white px-2.5 py-1">
                          Added by {assignment.assignedBy?.displayName || "system"}
                        </span>
                        {assignment.record ? (
                          <span className="rounded-full bg-white px-2.5 py-1">
                            {formatRecordStatus(assignment.record.status)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-white px-2.5 py-1">No clock record yet</span>
                        )}
                      </div>
                      {canManageRoom ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(["ASSIGNED", "CONFIRMED", "DECLINED", "CALLED_OFF"] as const).map((status) => (
                            <button
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                assignment.status === status
                                  ? "border-[#9bd0a5] bg-[#e4f4e6] text-[#215a35]"
                                  : "border-charcoal/10 bg-white text-charcoal"
                              }`}
                              key={status}
                              onClick={() => {
                                void onAction(
                                  () =>
                                    updateConversationAttendanceAssignment(
                                      conversation.id,
                                      selectedShift.id,
                                      assignment.id,
                                      status,
                                      accessToken,
                                    ).then(() => undefined),
                                  "Roster status updated.",
                                );
                              }}
                              type="button"
                            >
                              {formatAssignmentStatus(status)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </>
          )}
        </AttendanceCard>

        <AttendanceCard eyebrow="Clock station" title={selectedShift ? selectedShift.title : "Select a shift"} body="Run kiosk, QR, device, and manual clock events from the same room station without leaving the attendance lane.">
          {!selectedShift ? (
            <AttendanceEmptyCard text="Choose a shift first. Everyone assigned to that shift can clock from here, and supervisors can track the latest punches below." />
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                <AttendanceSelectField
                  label="Event"
                  onChange={(value) => setClockEventType(value as ConversationAttendanceClockEventType)}
                  options={clockEventOptions}
                  value={clockEventType}
                />
                <AttendanceSelectField
                  label="Method"
                  onChange={(value) => setClockMethod(value as ConversationAttendanceClockMethod)}
                  options={clockMethodOptions}
                  value={clockMethod}
                />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <AttendanceTextField
                  label="Station code"
                  onChange={setClockStationCode}
                  placeholder={selectedShift.stationCode || workspace.attendancePolicy?.stationCode || "Optional"}
                  value={clockStationCode}
                />
                <AttendanceTextField
                  label="Device label"
                  onChange={setClockDeviceLabel}
                  placeholder="Lobby iPad 1"
                  value={clockDeviceLabel}
                />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <AttendanceTextField icon={MapPinned} label="Latitude" onChange={setClockLatitude} placeholder="Optional" value={clockLatitude} />
                <AttendanceTextField icon={MapPinned} label="Longitude" onChange={setClockLongitude} placeholder="Optional" value={clockLongitude} />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <AttendanceTextField icon={QrCode} label="QR / token" onChange={setClockQrValue} placeholder="Optional" value={clockQrValue} />
                <AttendanceTextField label="Proof URL" onChange={setClockProofUrl} placeholder="Optional media URL" value={clockProofUrl} />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                <AttendanceNumberField label="Accuracy (m)" onChange={setClockAccuracyMeters} value={clockAccuracyMeters} />
                <textarea
                  className="min-h-[96px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-7 outline-none"
                  onChange={(event) => setClockNote(event.target.value)}
                  placeholder="Optional note for the clock event."
                  value={clockNote}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-graphite/66">
                {selectedShift.approvalRequired ? (
                  <span className="rounded-full bg-[#fff4dd] px-2.5 py-1 text-[#7a5b1d]">Supervisor approval required</span>
                ) : null}
                {selectedShift.stationCode ? (
                  <span className="rounded-full bg-white px-2.5 py-1">Shift station {selectedShift.stationCode}</span>
                ) : null}
                {selectedShift.requiresLocation ? (
                  <span className="rounded-full bg-white px-2.5 py-1">Location proof</span>
                ) : null}
                {selectedShift.requiresPhoto ? (
                  <span className="rounded-full bg-white px-2.5 py-1">Photo proof</span>
                ) : null}
                {selectedShift.requiresQr ? (
                  <span className="rounded-full bg-white px-2.5 py-1">QR scan</span>
                ) : null}
                {selectedShift.requiresNfc ? (
                  <span className="rounded-full bg-white px-2.5 py-1">NFC tap</span>
                ) : null}
              </div>
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                disabled={isBusy}
                onClick={() => {
                  void handleClockEvent();
                }}
                type="button"
              >
                <TimerReset className="h-4 w-4" />
                Submit {formatClockEventType(clockEventType)}
              </button>

              <div className="mt-5 space-y-3">
                {selectedShift.records.length === 0 ? (
                  <AttendanceEmptyCard text="No one has clocked this shift yet. The first punch, break, or adjustment will appear here." />
                ) : (
                  selectedShift.records.map((record) => <ClockRecordCard key={record.id} record={record} />)
                )}
              </div>
            </>
          )}
        </AttendanceCard>

        <AttendanceCard eyebrow="Live lane" title={activeShiftRecords.length > 0 ? "Clock is active" : "Quiet shift window"} body="This is the live attendance pulse across the room, useful for supervisors monitoring service or workplace coverage in real time.">
          {activeShiftRecords.length === 0 ? (
            <AttendanceEmptyCard text="Nobody is actively clocked in right now. Once a live shift starts, active records show up here with current station context." />
          ) : (
            <div className="space-y-3">
              {activeShiftRecords.map((record) => (
                <ClockRecordCard compact key={record.id} record={record} />
              ))}
            </div>
          )}
        </AttendanceCard>
      </div>
    </section>
  );
}

function ClockRecordCard({ record, compact = false }: { record: ConversationAttendanceRecord; compact?: boolean }) {
  const latestEvent = record.clockEvents[record.clockEvents.length - 1];

  return (
    <article className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-charcoal">{record.user.displayName}</p>
          <p className="mt-1 text-xs text-graphite/58">
            {latestEvent ? `${formatClockEventType(latestEvent.eventType)} at ${formatDateTime(latestEvent.occurredAt)}` : "Awaiting activity"}
          </p>
        </div>
        <AttendanceStatePill tone={recordTone(record)}>{formatRecordStatus(record.status)}</AttendanceStatePill>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-graphite/66">
        <span className="rounded-full bg-white px-2.5 py-1">{record.workedMinutes} worked mins</span>
        {record.flags.map((flag) => (
          <span className="rounded-full bg-white px-2.5 py-1" key={flag}>
            {formatFlag(flag)}
          </span>
        ))}
        {latestEvent?.stationCode ? <span className="rounded-full bg-white px-2.5 py-1">Station {latestEvent.stationCode}</span> : null}
        {latestEvent?.deviceLabel ? <span className="rounded-full bg-white px-2.5 py-1">{latestEvent.deviceLabel}</span> : null}
      </div>
      {!compact && latestEvent?.note ? <p className="mt-3 text-sm leading-7 text-graphite/68">{latestEvent.note}</p> : null}
    </article>
  );
}
