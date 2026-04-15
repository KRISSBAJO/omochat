"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Download, FileSpreadsheet } from "lucide-react";
import {
  exportConversationAttendance,
  type Conversation,
  type ConversationAttendanceExportSummary,
} from "../../lib/api-client";
import {
  AttendanceCard,
  AttendanceDateField,
  AttendanceEmptyCard,
  AttendanceMetricTile,
  AttendanceSelectField,
  AttendanceSummaryCard,
  formatDateOnly,
  formatMinutes,
} from "./tools-attendance-shared";

type AttendanceExportPanelProps = {
  accessToken: string;
  conversation: Conversation;
  onNotice: (message: string) => void;
};

export function AttendanceExportPanel({
  accessToken,
  conversation,
  onNotice,
}: AttendanceExportPanelProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [userId, setUserId] = useState("");
  const [summary, setSummary] = useState<ConversationAttendanceExportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const memberOptions = useMemo(
    () => [
      { label: "All room members", value: "" },
      ...conversation.participants.map((participant) => ({
        label: `${participant.user.displayName} (@${
          participant.user.userCode || participant.user.username
        })`,
        value: participant.userId,
      })),
    ],
    [conversation.participants],
  );

  async function loadSummary() {
    setIsLoading(true);
    try {
      const nextSummary = await exportConversationAttendance(conversation.id, accessToken, {
        from: fromDate || undefined,
        to: toDate || undefined,
        userId: userId || undefined,
      });
      setSummary(nextSummary);
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : "Attendance export could not be loaded right now.",
      );
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  function downloadCsv() {
    if (!summary?.csv) {
      onNotice("Load an export first before downloading CSV.");
      return;
    }

    const blob = new Blob([summary.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${conversation.title || "attendance"}-attendance-export.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotice("Attendance CSV downloaded.");
  }

  async function copyCsv() {
    if (!summary?.csv) {
      onNotice("Load an export first before copying CSV.");
      return;
    }

    try {
      await navigator.clipboard.writeText(summary.csv);
      onNotice("Attendance CSV copied.");
    } catch {
      onNotice("Clipboard access was blocked. Download the CSV instead.");
    }
  }

  return (
    <AttendanceCard
      eyebrow="Exports"
      title="Payroll-ready attendance summary"
      body="Filter the attendance window, review totals, and export CSV for payroll, HR, or volunteer service records."
    >
      <div className="grid gap-3 lg:grid-cols-4">
        <AttendanceDateField label="From" onChange={setFromDate} value={fromDate} />
        <AttendanceDateField label="To" onChange={setToDate} value={toDate} />
        <AttendanceSelectField
          label="Member"
          onChange={setUserId}
          options={memberOptions}
          value={userId}
        />
        <div className="flex items-end">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
            disabled={isLoading}
            onClick={() => {
              void loadSummary();
            }}
            type="button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isLoading ? "Loading..." : "Refresh export"}
          </button>
        </div>
      </div>

      {!summary ? (
        <div className="mt-5">
          <AttendanceEmptyCard text={isLoading ? "Loading export summary..." : "No export summary is ready yet."} />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AttendanceMetricTile label="Members" value={summary.totals.memberCount} />
            <AttendanceMetricTile label="Records" value={summary.totals.recordCount} />
            <AttendanceMetricTile
              label="Worked hours"
              value={Math.round(summary.totals.totalWorkedMinutes / 60)}
            />
            <AttendanceMetricTile
              label="Leave approved"
              value={summary.totals.approvedLeaveCount}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden rounded-[24px] border border-charcoal/10 bg-[#faf7f2]">
              <div className="grid grid-cols-[minmax(220px,2fr)_110px_110px_110px_110px_120px] gap-3 border-b border-charcoal/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-graphite/55">
                <span>Member</span>
                <span>Worked</span>
                <span>Break</span>
                <span>OT</span>
                <span>Late</span>
                <span>Exceptions</span>
              </div>
              <div className="divide-y divide-charcoal/10">
                {summary.rows.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-graphite/64">
                    No attendance rows match the chosen filters.
                  </div>
                ) : (
                  summary.rows.map((row) => (
                    <div
                      className="grid grid-cols-[minmax(220px,2fr)_110px_110px_110px_110px_120px] gap-3 px-4 py-3 text-sm text-charcoal"
                      key={row.userId}
                    >
                      <div>
                        <p className="font-semibold">{row.member}</p>
                        <p className="mt-1 text-xs text-graphite/58">{row.code}</p>
                      </div>
                      <span>{formatMinutes(row.workedMinutes)}</span>
                      <span>{formatMinutes(row.breakMinutes)}</span>
                      <span>{formatMinutes(row.overtimeMinutes)}</span>
                      <span>{row.lateCount}</span>
                      <span>{row.exceptionCount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-5">
              <AttendanceSummaryCard
                label="Range"
                title={`${formatDateOnly(summary.range.from)} - ${formatDateOnly(summary.range.to)}`}
                body="This export window is what payroll, HR, or volunteer service reporting will use."
              />
              <AttendanceSummaryCard
                label="Overtime"
                title={formatMinutes(summary.totals.totalOvertimeMinutes)}
                body="Total overtime minutes in the current export window."
              />
              <div className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
                  CSV actions
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black"
                    onClick={downloadCsv}
                    type="button"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal"
                    onClick={() => {
                      void copyCsv();
                    }}
                    type="button"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AttendanceCard>
  );
}
