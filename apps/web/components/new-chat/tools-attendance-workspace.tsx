"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { CalendarRange, Clock3, ShieldCheck, TimerReset } from "lucide-react";
import type { Conversation, ConversationToolsWorkspace } from "../../lib/api-client";
import {
  AttendanceMetricTile,
  AttendanceSummaryCard,
} from "./tools-attendance-shared";
import { AttendanceApprovalsPanel } from "./tools-attendance-approvals-panel";
import { AttendanceExportPanel } from "./tools-attendance-export-panel";
import { AttendanceHistoryPanel } from "./tools-attendance-history-panel";
import { AttendanceOperationsPanel } from "./tools-attendance-operations-panel";
import { AttendancePolicyPanel } from "./tools-attendance-policy-panel";

type AttendanceWorkspaceProps = {
  accessToken: string;
  conversation: Conversation;
  workspace: ConversationToolsWorkspace;
  canManageRoom: boolean;
  onNotice: (message: string) => void;
  onRefresh: () => Promise<void>;
};

export function AttendanceWorkspace({
  accessToken,
  conversation,
  workspace,
  canManageRoom,
  onNotice,
  onRefresh,
}: AttendanceWorkspaceProps) {
  const [isBusy, setIsBusy] = useState(false);

  async function runAction(task: () => Promise<void>, success: string) {
    setIsBusy(true);
    try {
      await task();
      await onRefresh();
      onNotice(success);
      return true;
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : "That attendance action did not finish.",
      );
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
              Time & attendance
            </p>
            <h3 className="mt-2 text-[2rem] font-semibold text-charcoal">
              Enterprise attendance for this room
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-graphite/68">
              Run shift templates, schedule rotas, collect clock evidence, approve
              exceptions, manage leave, and export payroll-ready summaries from one
              room workspace.
            </p>
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-3">
            <AttendanceMetricTile
              label="Templates"
              value={workspace.dashboard.attendanceTemplateCount}
            />
            <AttendanceMetricTile
              label="Scheduled"
              value={workspace.dashboard.scheduledShiftCount}
            />
            <AttendanceMetricTile
              label="On clock"
              value={workspace.dashboard.onClockCount}
            />
            <AttendanceMetricTile
              label="Approvals"
              value={workspace.dashboard.pendingAttendanceApprovals}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <AttendanceSummaryCard
          label="Next shift"
          title={workspace.dashboard.nextShift?.title || "Nothing scheduled"}
          body={
            workspace.dashboard.nextShift
              ? `${new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(workspace.dashboard.nextShift.startsAt))} • ${
                  workspace.dashboard.nextShift.assignmentCount
                } assigned`
              : "No shift is scheduled for this room yet."
          }
        />
        <AttendanceSummaryCard
          label="Exceptions"
          title={
            workspace.dashboard.attendanceExceptionCount > 0
              ? `${workspace.dashboard.attendanceExceptionCount} flagged`
              : "Queue clear"
          }
          body={
            workspace.dashboard.attendanceExceptionCount > 0
              ? "Late arrivals, missed clock-outs, and overtime exceptions need supervisor review."
              : "No attendance exception is waiting right now."
          }
        />
        <AttendanceSummaryCard
          label="Leave window"
          title={
            workspace.dashboard.pendingLeaveApprovals > 0
              ? `${workspace.dashboard.pendingLeaveApprovals} pending`
              : `${workspace.dashboard.approvedLeaveCount} approved`
          }
          body="Track ministry, personal, sick, and unpaid leave without splitting policy from approvals."
        />
        <AttendanceSummaryCard
          label="Station flow"
          title={workspace.attendancePolicy?.stationLabel || "Device-ready"}
          body={
            workspace.attendancePolicy?.stationCode
              ? `Primary kiosk code ${workspace.attendancePolicy.stationCode} is active for this room.`
              : "QR, NFC, photo, and location hooks are available for kiosk or device check-in."
          }
        />
      </section>

      <AttendanceOperationsPanel
        accessToken={accessToken}
        canManageRoom={canManageRoom}
        conversation={conversation}
        isBusy={isBusy}
        onAction={runAction}
        onNotice={onNotice}
        workspace={workspace}
      />

      <AttendancePolicyPanel
        accessToken={accessToken}
        canManageRoom={canManageRoom}
        conversation={conversation}
        isBusy={isBusy}
        onAction={runAction}
        onNotice={onNotice}
        workspace={workspace}
      />

      <AttendanceApprovalsPanel
        accessToken={accessToken}
        canManageRoom={canManageRoom}
        conversation={conversation}
        isBusy={isBusy}
        onAction={runAction}
        workspace={workspace}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <AttendanceHistoryPanel
          accessToken={accessToken}
          canManageRoom={canManageRoom}
          conversation={conversation}
          onNotice={onNotice}
        />
        <AttendanceExportPanel
          accessToken={accessToken}
          conversation={conversation}
          onNotice={onNotice}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <MiniOperationsCard
          body="Shift templates and schedules now feed the same rules engine that supervisors review later."
          icon={CalendarRange}
          label="Rosters"
          title={`${workspace.attendanceShifts.length} shift${
            workspace.attendanceShifts.length === 1 ? "" : "s"
          } live`}
        />
        <MiniOperationsCard
          body="Kiosk and device check-in stay tied to the selected shift, station code, and proof requirements."
          icon={TimerReset}
          label="Clock events"
          title={`${workspace.attendanceRecords.length} record${
            workspace.attendanceRecords.length === 1 ? "" : "s"
          } captured`}
        />
        <MiniOperationsCard
          body="Attendance exceptions and leave approvals both land in one supervisor console instead of separate tools."
          icon={ShieldCheck}
          label="Approvals"
          title={`${workspace.dashboard.pendingAttendanceApprovals + workspace.dashboard.pendingLeaveApprovals} waiting`}
        />
        <MiniOperationsCard
          body="History and export panels are built for audits, volunteer service logs, and payroll-style summaries."
          icon={Clock3}
          label="Member history"
          title={`${conversation.participants.length} people tracked`}
        />
      </section>
    </section>
  );
}

function MiniOperationsCard({
  icon: Icon,
  label,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#efe6d7] text-charcoal">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-graphite/55">
            {label}
          </p>
          <h4 className="mt-2 text-lg font-semibold text-charcoal">{title}</h4>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-graphite/68">{body}</p>
    </section>
  );
}
