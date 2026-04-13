"use client";

import type { LucideIcon } from "lucide-react";
import { reactionMeta } from "./shared";

export function EmptyFeature({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-charcoal/10 bg-white/72 p-5 shadow-[0_16px_40px_rgba(23,22,19,0.05)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">{label}</p>
      <p className="mt-3 text-sm leading-6 text-graphite/76">{text}</p>
    </div>
  );
}

export function PresenceStatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
        online ? "bg-green-500" : "bg-graphite/30"
      }`}
    />
  );
}

export function DetailStatCard({
  description,
  icon: Icon,
  label,
  value
}: {
  description: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-charcoal/8 bg-white/80 p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-sweet text-charcoal">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">{label}</p>
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-charcoal">{value}</p>
      <p className="mt-2 text-xs leading-5 text-graphite/65">{description}</p>
    </div>
  );
}

export function ReactionSummaryChip({
  inverted,
  mine,
  onClick,
  reaction
}: {
  inverted: boolean;
  mine: boolean;
  onClick: () => void;
  reaction: { emoji: string; count: number; mine: boolean };
}) {
  const meta = reactionMeta(reaction.emoji);
  const Icon = meta.icon;

  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition ${
        mine
          ? "bg-honey text-charcoal"
          : inverted
            ? "bg-white/10 text-cloud"
            : "bg-sweet text-graphite"
      }`}
      onClick={onClick}
      title={meta.label}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{reaction.count}</span>
    </button>
  );
}

export function ReactionToggleButton({
  inverted,
  onClick,
  option
}: {
  inverted: boolean;
  onClick: () => void;
  option: { emoji: string; label: string; icon: LucideIcon };
}) {
  const Icon = option.icon;

  return (
    <button
      aria-label={option.label}
      className={`grid h-8 w-8 place-items-center rounded-full border transition ${
        inverted
          ? "border-white/12 bg-white/8 text-cloud/80 hover:bg-white/14"
          : "border-charcoal/8 bg-white text-graphite/72 hover:border-charcoal/20 hover:text-charcoal"
      }`}
      onClick={onClick}
      title={option.label}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function SideCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-charcoal/8 bg-white/78 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-charcoal">{value}</p>
    </div>
  );
}
