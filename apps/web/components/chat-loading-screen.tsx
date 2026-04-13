"use client";

import { LoaderCircle, MessageSquareText, Shield, Sparkles } from "lucide-react";

export function ChatLoadingScreen({ label = "Opening Omochat..." }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(217,184,112,0.28),rgba(248,245,239,0)_28%),linear-gradient(180deg,#f6efe2_0%,#efe3d2_100%)] px-6 py-10">
      <div className="relative w-full max-w-[620px] overflow-hidden rounded-[32px] border border-charcoal/10 bg-white/88 p-8 shadow-[0_28px_80px_rgba(24,18,15,0.08)] backdrop-blur">
        <div
          aria-hidden="true"
          className="absolute inset-x-[-20%] top-0 h-32 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.78),transparent)] blur-2xl"
        />

        <div className="inline-flex items-center gap-2 rounded-full bg-[#f2e4be] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal">
          <Sparkles className="h-3.5 w-3.5" />
          Live workspace
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-charcoal text-cloud">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.02] text-charcoal">{label}</h1>
            <p className="mt-2 text-sm leading-7 text-graphite/72">
              Syncing conversations, requests, calls, moderation lanes, and identity controls so everything opens in one clean pass.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          {[
            { label: "Rooms and unread state", icon: MessageSquareText, width: "72%" },
            { label: "Privacy, phone, and request lanes", icon: Shield, width: "58%" },
            { label: "Calls, media, and live activity", icon: LoaderCircle, width: "84%" }
          ].map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                className="rounded-[22px] border border-charcoal/8 bg-[#fbf8f2] px-4 py-4 shadow-[0_10px_24px_rgba(24,18,15,0.03)]"
                key={item.label}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-charcoal shadow-[0_8px_20px_rgba(24,18,15,0.06)]">
                    <Icon className={`h-4 w-4 ${index === 2 ? "animate-spin" : ""}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#efe6d7]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#171613,#d9b870)]"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
