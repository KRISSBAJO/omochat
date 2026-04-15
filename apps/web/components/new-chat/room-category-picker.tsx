"use client";

import type { ConversationCategory } from "../../lib/api-client";
import { conversationCategoryOptions, formatConversationCategory } from "./tools-registry";

type RoomCategoryPickerProps = {
  value: ConversationCategory;
  onChange: (value: ConversationCategory) => void;
};

export function RoomCategoryPicker({ value, onChange }: RoomCategoryPickerProps) {
  return (
    <div className="mt-4 rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-graphite/55">Room category</p>
          <p className="mt-2 text-sm leading-6 text-graphite/68">
            This guides board defaults, pack recommendations, and room workflow later.
          </p>
        </div>
        <span className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal">
          {formatConversationCategory(value)}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {conversationCategoryOptions.map((option) => (
          <button
            className={`rounded-[20px] border px-3 py-3 text-left transition ${
              value === option.value
                ? "border-charcoal/16 bg-white text-charcoal shadow-[0_10px_24px_rgba(24,18,15,0.05)]"
                : "border-charcoal/10 bg-[#f5efe3] text-graphite/76 hover:bg-white"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <p className="text-sm font-semibold">{option.label}</p>
            <p className="mt-1 text-xs leading-6">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
