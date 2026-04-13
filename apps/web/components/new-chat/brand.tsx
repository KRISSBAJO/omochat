"use client";

import { Sparkles } from "lucide-react";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
  theme?: "light" | "dark";
};

type BrandFooterProps = {
  className?: string;
  compact?: boolean;
};

export function BrandLogo({ className = "", compact = false, showLabel = true, theme = "dark" }: BrandLogoProps) {
  const titleClass = theme === "light" ? "text-white" : "text-charcoal";
  const bodyClass = theme === "light" ? "text-white/72" : "text-graphite/62";

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <span
        className={`grid shrink-0 place-items-center rounded-[22px] border border-white/70 bg-white/92 shadow-[0_12px_32px_rgba(23,22,19,0.1)] ${
          compact ? "h-11 w-11" : "h-14 w-14"
        }`}
      >
        <img
          alt="Omochat"
          className={`object-contain ${compact ? "h-8 w-8" : "h-11 w-11"}`}
          loading="eager"
          src="/images/omochat-logo.png"
        />
      </span>
      {showLabel ? (
        <span className="min-w-0">
          <span className={`block truncate font-display ${compact ? "text-[1.05rem]" : "text-[1.35rem]"} font-bold ${titleClass}`}>
            Omochat
          </span>
          <span className={`block truncate text-xs font-semibold uppercase tracking-[0.24em] ${bodyClass}`}>Keep the room warm</span>
        </span>
      ) : null}
    </div>
  );
}

export function BrandFooter({ className = "", compact = false }: BrandFooterProps) {
  return (
    <footer className={`border-t border-charcoal/10 ${compact ? "px-4 py-4" : "px-0 py-0"} ${className}`.trim()}>
      <div className={`rounded-[28px] border border-charcoal/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(246,237,206,0.78)_48%,rgba(217,206,244,0.64))] ${compact ? "px-4 py-4" : "px-5 py-5"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-graphite/52">Omochat Afterglow</p>
            <p className={`mt-2 max-w-xl font-semibold text-charcoal ${compact ? "text-sm leading-6" : "text-[15px] leading-7"}`}>
              For the 2:14 a.m. idea, the first-light handoff, and the reply that steadies the whole day.
            </p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-charcoal/10 bg-white/85 text-charcoal shadow-[0_12px_30px_rgba(23,22,19,0.08)]">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["@codes stay close", "soft nights, sharp replies", "vanish when the moment passes"].map((label) => (
            <span
              className="rounded-full border border-charcoal/8 bg-white/78 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-graphite/70"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
