"use client";

import type { ReactNode } from "react";
import {
  type ConversationAttendanceAssignmentStatus,
  type ConversationAttendanceClockEventType,
  type ConversationAttendanceRecord,
  type ConversationAttendanceRecordStatus,
  type ConversationAttendanceShiftStatus,
} from "../../lib/api-client";

export function AttendanceCard({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">{eyebrow}</p>
      <h4 className="mt-2 text-2xl font-semibold text-charcoal">{title}</h4>
      <p className="mt-2 text-sm leading-7 text-graphite/68">{body}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AttendanceSummaryCard({
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
      <h4 className="mt-2 text-xl font-semibold text-charcoal">{title}</h4>
      <p className="mt-3 text-sm leading-7 text-graphite/68">{body}</p>
    </section>
  );
}

export function AttendanceMetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] bg-[#faf7f2] px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  );
}

export function AttendanceTextField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</span>
      <div className="flex items-center gap-2 rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3">
        {Icon ? <Icon className="h-4 w-4 text-graphite/50" /> : null}
        <input
          className="w-full bg-transparent text-sm outline-none"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </div>
    </label>
  );
}

export function AttendanceNumberField({
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
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</span>
      <input
        className="w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

export function AttendanceTimeField({
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
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</span>
      <input
        className="w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
        onChange={(event) => onChange(event.target.value)}
        type="time"
        value={value}
      />
    </label>
  );
}

export function AttendanceDateField({
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
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</span>
      <input
        className="w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

export function AttendanceSelectField({
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
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">{label}</span>
      <select
        className="w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none"
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

export function AttendanceToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
        active ? "border-[#9bd0a5] bg-[#e4f4e6] text-[#215a35]" : "border-charcoal/10 bg-white text-charcoal"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function AttendanceStatePill({
  tone,
  children,
}: {
  tone: "positive" | "warning" | "critical" | "neutral";
  children: ReactNode;
}) {
  const classes =
    tone === "positive"
      ? "bg-[#e4f4e6] text-[#215a35]"
      : tone === "warning"
        ? "bg-[#fff4dd] text-[#7a5b1d]"
        : tone === "critical"
          ? "bg-[#fff0ec] text-[#8d4e40]"
          : "bg-white text-graphite/78";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

export function AttendanceMutedNotice({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite/64">
      {text}
    </div>
  );
}

export function AttendanceEmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-charcoal/12 bg-[#faf7f2] px-4 py-5 text-sm leading-7 text-graphite/64">
      {text}
    </div>
  );
}

export const weekdayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

export function combineDateAndTime(date: string, time: string) {
  if (!date || !time) {
    return null;
  }

  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toISOString();
}

export function parseNullableNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatDaysOfWeek(days: number[]) {
  if (days.length === 0) {
    return "No repeat days";
  }
  return weekdayOptions.filter((day) => days.includes(day.value)).map((day) => day.label).join(", ");
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatWhen(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatShiftStatus(status: ConversationAttendanceShiftStatus) {
  return status === "IN_PROGRESS" ? "In progress" : startCase(status);
}

export function formatAssignmentStatus(status: ConversationAttendanceAssignmentStatus) {
  return status === "CALLED_OFF" ? "Called off" : startCase(status);
}

export function formatRecordStatus(status: ConversationAttendanceRecordStatus) {
  if (status === "ON_CLOCK") return "On clock";
  if (status === "ON_BREAK") return "On break";
  if (status === "PENDING_APPROVAL") return "Pending approval";
  return startCase(status);
}

export function formatFlag(flag: string) {
  return startCase(flag);
}

export function formatClockEventType(value: ConversationAttendanceClockEventType) {
  if (value === "CLOCK_IN") return "Clock in";
  if (value === "BREAK_START") return "Break start";
  if (value === "BREAK_END") return "Break end";
  if (value === "CLOCK_OUT") return "Clock out";
  return "Adjustment";
}

export function shiftStateTone(status: ConversationAttendanceShiftStatus) {
  if (status === "PUBLISHED" || status === "COMPLETED") return "positive" as const;
  if (status === "IN_PROGRESS") return "warning" as const;
  if (status === "CANCELLED") return "critical" as const;
  return "neutral" as const;
}

export function assignmentTone(status: ConversationAttendanceAssignmentStatus) {
  if (status === "CONFIRMED") return "positive" as const;
  if (status === "DECLINED" || status === "CALLED_OFF") return "critical" as const;
  return "warning" as const;
}

export function recordTone(record: ConversationAttendanceRecord) {
  if (record.status === "APPROVED") return "positive" as const;
  if (record.flags.length > 0 || record.status === "REJECTED") return "critical" as const;
  if (record.status === "PENDING_APPROVAL" || record.status === "ON_BREAK") return "warning" as const;
  return "neutral" as const;
}

export function startCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
