"use client";

import { BadgeCheck, Clock3, Sparkles } from "lucide-react";
import type {
  ConversationToolPack,
  ConversationToolRequest,
  ConversationToolsWorkspace,
} from "../../lib/api-client";
import { getToolPackMeta } from "./tools-registry";

type RoomToolsAccessOverviewProps = {
  workspace: ConversationToolsWorkspace;
};

export function RoomToolsAccessOverview({
  workspace,
}: RoomToolsAccessOverviewProps) {
  const latestRequestByPack = new Map<
    ConversationToolPack,
    ConversationToolRequest
  >();

  for (const request of workspace.requests) {
    if (!latestRequestByPack.has(request.pack)) {
      latestRequestByPack.set(request.pack, request);
    }
  }

  const pendingRequests = workspace.requests.filter(
    (request) => request.status === "PENDING",
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
      <div className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
              Approved access
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-charcoal">
              Packs active in this room
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-graphite/68">
              Once a pack is approved, it becomes part of the room workspace and
              stays visible here as a live capability.
            </p>
          </div>
          <span className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-2 text-xs font-semibold text-charcoal">
            {workspace.activePacks.length} live
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspace.packCatalog.map((catalogItem) => {
            const meta = getToolPackMeta(workspace, catalogItem.pack);
            const Icon = meta.icon;
            const activation = workspace.activePacks.find(
              (item) => item.pack === catalogItem.pack,
            );
            const latestRequest = latestRequestByPack.get(catalogItem.pack);
            const isActive = Boolean(activation);
            const tone = isActive
              ? "border-[#cfe3d2] bg-[#eef7ea]"
              : latestRequest?.status === "PENDING"
                ? "border-[#e4c77b] bg-[#fff7de]"
                : "border-charcoal/10 bg-[#faf7f2]";

            return (
              <div
                className={`rounded-[24px] border p-4 ${tone}`}
                key={catalogItem.pack}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-charcoal shadow-[0_8px_18px_rgba(24,18,15,0.06)]">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-graphite/72">
                    {isActive
                      ? "Live"
                      : latestRequest?.status === "PENDING"
                        ? "Pending"
                        : "Locked"}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-charcoal">
                  {meta.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-graphite/68">
                  {meta.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[30px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">
              Request center
            </p>
            <h3 className="mt-2 text-xl font-semibold text-charcoal">
              Approval state
            </h3>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#faf7f2] text-charcoal">
            {pendingRequests.length > 0 ? (
              <Clock3 className="h-4.5 w-4.5" />
            ) : (
              <BadgeCheck className="h-4.5 w-4.5" />
            )}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {workspace.requests.length === 0 ? (
            <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-5 text-sm leading-7 text-graphite/64">
              No pack requests yet. When a room requests access, the latest
              approval state shows up here.
            </div>
          ) : (
            workspace.requests.slice(0, 4).map((request) => {
              const meta = getToolPackMeta(workspace, request.pack);
              const Icon = meta.icon;
              const tone =
                request.status === "APPROVED"
                  ? "border-[#cfe3d2] bg-[#eef7ea]"
                  : request.status === "DECLINED"
                    ? "border-[#e5c2b9] bg-[#fff2ee]"
                    : "border-[#e4c77b] bg-[#fff7de]";

              return (
                <div
                  className={`rounded-[22px] border px-4 py-4 ${tone}`}
                  key={request.id}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-white text-charcoal">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-charcoal">
                          {meta.title}
                        </p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-graphite/72">
                          {request.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-graphite/68">
                        {request.reviewNote ||
                          request.note ||
                          "No note was added to this request."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite/64">
          <div className="flex items-center gap-2 text-charcoal">
            <Sparkles className="h-4 w-4" />
            Approved packs unlock live room tools. Pending packs stay private
            until a site admin reviews them.
          </div>
        </div>
      </div>
    </section>
  );
}
