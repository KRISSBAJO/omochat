"use client";

import { ArrowRight, Check, Search, X } from "lucide-react";

export type ForwardConversationOption = {
  id: string;
  title: string;
  preview: string;
  meta: string;
  avatarLabel: string;
  avatarUrl?: string | null;
};

type ForwardMessageModalProps = {
  isOpen: boolean;
  isBusy: boolean;
  messagePreview: string;
  options: ForwardConversationOption[];
  searchQuery: string;
  selectedConversationIds: string[];
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onToggleConversation: (conversationId: string) => void;
  onSubmit: () => void;
};

export function ForwardMessageModal({
  isOpen,
  isBusy,
  messagePreview,
  options,
  searchQuery,
  selectedConversationIds,
  onClose,
  onSearchChange,
  onToggleConversation,
  onSubmit
}: ForwardMessageModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[70] bg-charcoal/34 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 z-[80] flex items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-[30px] border border-charcoal/10 bg-white shadow-[0_28px_80px_rgba(24,18,15,0.18)]">
          <div className="flex items-center justify-between gap-3 border-b border-charcoal/10 px-5 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Forward</p>
              <h3 className="mt-2 text-xl font-semibold text-charcoal">Forward message to an existing chat</h3>
            </div>
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-[#faf7f2] text-charcoal transition hover:border-charcoal/20"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-charcoal/10 px-5 py-4">
            <div className="rounded-[22px] bg-[#faf7f2] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">What you are forwarding</p>
              <p className="mt-2 text-sm leading-6 text-charcoal">{messagePreview}</p>
              <p className="mt-3 text-xs leading-6 text-graphite/62">
                You can only forward into chats you already have. This will not start a new conversation with a stranger.
              </p>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-full border border-charcoal/10 bg-white px-4 py-3">
              <Search className="h-4 w-4 text-graphite/55" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-graphite/48"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search existing chats by name, @code, type, or last preview"
                value={searchQuery}
              />
            </label>
          </div>

          <div className="max-h-[420px] overflow-y-auto px-3 py-3">
            {options.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-charcoal/12 bg-[#faf7f2] px-4 py-5 text-sm leading-7 text-graphite/66">
                No matching chats yet. Open or create a conversation first, then forwarding will appear here.
              </div>
            ) : (
              <div className="space-y-2">
                {options.map((option) => {
                  const selected = selectedConversationIds.includes(option.id);
                  return (
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-[24px] border px-3 py-3 transition ${
                        selected ? "border-charcoal/15 bg-[#efe6d7]" : "border-charcoal/10 bg-white hover:bg-[#faf7f2]"
                      }`}
                      key={option.id}
                    >
                      <input
                        checked={selected}
                        className="mt-1 h-4 w-4 rounded border-charcoal/25 text-charcoal focus:ring-honey/35"
                        onChange={() => onToggleConversation(option.id)}
                        type="checkbox"
                      />
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#efe6d7] text-sm font-semibold text-charcoal">
                        {option.avatarUrl ? (
                          <img alt={option.title} className="h-full w-full object-cover" src={option.avatarUrl} />
                        ) : (
                          option.avatarLabel
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold text-charcoal">{option.title}</span>
                          {selected ? (
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-charcoal text-cloud">
                              <Check className="h-4 w-4" />
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-xs font-medium text-graphite/58">{option.meta}</span>
                        <span className="mt-1 block truncate text-sm text-graphite/72">{option.preview}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-charcoal/10 px-5 py-4">
            <p className="text-sm text-graphite/66">
              {selectedConversationIds.length === 0
                ? "Pick at least one existing chat."
                : `${selectedConversationIds.length} ${selectedConversationIds.length === 1 ? "chat" : "chats"} selected`}
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
              disabled={isBusy || selectedConversationIds.length === 0}
              onClick={onSubmit}
              type="button"
            >
              <ArrowRight className="h-4 w-4" />
              {isBusy ? "Forwarding..." : "Forward now"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
