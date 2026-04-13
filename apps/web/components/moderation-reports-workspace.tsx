"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { getModerationReports, getModerators, ModerationReport, ModeratorSummary, refreshSession, updateModerationReport } from "../lib/api-client";
import { ChatLoadingScreen } from "./chat-loading-screen";

type Filter = "ALL" | "OPEN" | "REVIEWED" | "DISMISSED";

export function ModerationReportsWorkspace() {
  const [booting, setBooting] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [moderators, setModerators] = useState<ModeratorSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        assignedModeratorUserId: string;
        moderatorNote: string;
        resolutionNote: string;
      }
    >
  >({});

  useEffect(() => {
    refreshSession()
      .then((session) => {
        setAccessToken(session.accessToken);
        setIsSiteAdmin(session.user.access.isSiteAdmin);
      })
      .catch(() => {
        setNotice("Sign in first to open moderation.");
        setAccessToken(null);
        setIsSiteAdmin(false);
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    Promise.all([
      getModerationReports(accessToken, filter === "ALL" ? undefined : { status: filter }),
      getModerators(accessToken)
    ])
      .then(([nextReports, nextModerators]) => {
        setReports(nextReports);
        setModerators(nextModerators);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Could not load reports."));
  }, [accessToken, filter]);

  function getDraft(report: ModerationReport) {
    return (
      drafts[report.id] ?? {
        assignedModeratorUserId: report.assignedModerator?.id ?? "",
        moderatorNote: report.moderatorNote ?? "",
        resolutionNote: report.resolutionNote ?? ""
      }
    );
  }

  function updateDraft(
    reportId: string,
    patch: Partial<{
      assignedModeratorUserId: string;
      moderatorNote: string;
      resolutionNote: string;
    }>
  ) {
    setDrafts((current) => {
      const existing = current[reportId] ?? {
        assignedModeratorUserId: "",
        moderatorNote: "",
        resolutionNote: ""
      };

      return {
        ...current,
        [reportId]: {
          ...existing,
          ...patch
        }
      };
    });
  }

  async function handleReview(
    reportId: string,
    input: {
      status?: "OPEN" | "REVIEWED" | "DISMISSED";
      assignedModeratorUserId?: string;
      moderatorNote?: string;
      resolutionNote?: string;
    }
  ) {
    if (!accessToken) {
      return;
    }

    setBusyId(reportId);
    setNotice("");

    try {
      const updated = await updateModerationReport(reportId, input, accessToken);
      setReports((current) => current.map((report) => (report.id === updated.id ? updated : report)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update this report.");
    } finally {
      setBusyId(null);
    }
  }

  if (booting) {
    return <ChatLoadingScreen label="Opening moderation desk..." />;
  }

  const openCount = reports.filter((report) => report.status === "OPEN").length;
  const reviewedCount = reports.filter((report) => report.status === "REVIEWED").length;
  const dismissedCount = reports.filter((report) => report.status === "DISMISSED").length;
  const assignedCount = reports.filter((report) => Boolean(report.assignedModerator)).length;

  return (
    <main className="min-h-screen bg-[#f8f5ef] px-4 py-6 text-charcoal sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-charcoal/10 bg-white px-6 py-6 shadow-[0_20px_60px_rgba(24,18,15,0.06)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">Admin moderation</p>
            <h1 className="mt-2 text-3xl font-semibold">Report review desk</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-graphite/68">
              Review trust flags, assign owners quickly, and close clean cases without leaving the messaging platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isSiteAdmin ? (
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:border-charcoal/20"
                href="/admin"
              >
                Site admin dashboard
              </Link>
            ) : null}
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm font-semibold text-charcoal transition hover:border-charcoal/20"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to chats
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-[26px] border border-charcoal/10 bg-white px-5 py-5 shadow-[0_16px_40px_rgba(24,18,15,0.05)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Open queue</p>
            <p className="mt-3 text-3xl font-semibold text-charcoal">{openCount}</p>
            <p className="mt-2 text-sm leading-6 text-graphite/64">Reports that still need human review.</p>
          </div>
          <div className="rounded-[26px] border border-charcoal/10 bg-white px-5 py-5 shadow-[0_16px_40px_rgba(24,18,15,0.05)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Reviewed</p>
            <p className="mt-3 text-3xl font-semibold text-charcoal">{reviewedCount}</p>
            <p className="mt-2 text-sm leading-6 text-graphite/64">Cases already closed with an action note.</p>
          </div>
          <div className="rounded-[26px] border border-charcoal/10 bg-white px-5 py-5 shadow-[0_16px_40px_rgba(24,18,15,0.05)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Dismissed</p>
            <p className="mt-3 text-3xl font-semibold text-charcoal">{dismissedCount}</p>
            <p className="mt-2 text-sm leading-6 text-graphite/64">Noise and non-actionable reports cleared out.</p>
          </div>
          <div className="rounded-[26px] border border-charcoal/10 bg-white px-5 py-5 shadow-[0_16px_40px_rgba(24,18,15,0.05)]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Assigned</p>
            <p className="mt-3 text-3xl font-semibold text-charcoal">{assignedCount}</p>
            <p className="mt-2 text-sm leading-6 text-graphite/64">
              {moderators.length} moderators available. {Math.max(reports.length - assignedCount, 0)} still unassigned.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["ALL", "OPEN", "REVIEWED", "DISMISSED"] as const).map((value) => (
            <button
              key={value}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filter === value ? "border-charcoal/16 bg-charcoal text-cloud" : "border-charcoal/10 bg-white text-charcoal"
              }`}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value === "ALL" ? "All reports" : value.charAt(0) + value.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {notice ? (
          <p className="mt-4 rounded-[24px] border border-[#e2c890] bg-[#fff6e6] px-4 py-4 text-sm text-graphite">{notice}</p>
        ) : null}

        <div className="mt-6 grid gap-4">
          {reports.length === 0 ? (
            <div className="rounded-[28px] border border-charcoal/10 bg-white px-6 py-8 text-sm leading-7 text-graphite/68 shadow-[0_16px_40px_rgba(24,18,15,0.05)]">
              No reports are waiting in this lane right now.
            </div>
          ) : (
            reports.map((report) => (
              <article
                className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_40px_rgba(24,18,15,0.05)]"
                key={report.id}
              >
                {(() => {
                  const draft = getDraft(report);

                  return (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#efe6d7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal">
                        {report.status}
                      </span>
                      <span className="text-xs text-graphite/58">
                        {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(report.createdAt))}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-charcoal">{report.reason}</h2>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Reporter: <span className="font-semibold text-charcoal">{report.reporter.displayName}</span> about{" "}
                      <span className="font-semibold text-charcoal">{report.target.displayName}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-graphite/62">
                      {report.assignedModerator ? (
                        <span className="rounded-full bg-[#faf7f2] px-3 py-1">
                          Assigned to {report.assignedModerator.displayName}
                        </span>
                      ) : null}
                      {report.reviewedBy ? (
                        <span className="rounded-full bg-[#faf7f2] px-3 py-1">
                          Reviewed by {report.reviewedBy.displayName}
                        </span>
                      ) : null}
                    </div>
                    {report.details ? <p className="mt-3 text-sm leading-7 text-graphite/72">{report.details}</p> : null}
                    {report.message ? (
                      <div className="mt-4 rounded-[22px] bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite/72">
                        Message snapshot: {report.message.deletedAt ? "Message was removed." : report.message.body || "No text body."}
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-3">
                      <label className="block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
                        Assignee
                        <select
                          className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm font-medium text-charcoal outline-none ring-honey/20 transition focus:ring-4"
                          onChange={(event) => updateDraft(report.id, { assignedModeratorUserId: event.target.value })}
                          value={draft.assignedModeratorUserId}
                        >
                          <option value="">Unassigned</option>
                          {moderators.map((moderator) => (
                            <option key={moderator.id} value={moderator.id}>
                              {moderator.displayName} ({moderator.username})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
                        Internal note
                        <textarea
                          className="mt-2 min-h-[110px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-6 text-charcoal outline-none ring-honey/20 transition focus:ring-4"
                          onChange={(event) => updateDraft(report.id, { moderatorNote: event.target.value })}
                          placeholder="Team-only context and follow-up steps..."
                          value={draft.moderatorNote}
                        />
                      </label>

                      <label className="block text-xs font-bold uppercase tracking-[0.18em] text-graphite/55">
                        Reporter-facing resolution
                        <textarea
                          className="mt-2 min-h-[110px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-6 text-charcoal outline-none ring-honey/20 transition focus:ring-4"
                          onChange={(event) => updateDraft(report.id, { resolutionNote: event.target.value })}
                          placeholder="Optional note we can send back when the report is reviewed..."
                          value={draft.resolutionNote}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:border-charcoal/20 disabled:opacity-50"
                      disabled={busyId === report.id}
                      onClick={() => {
                        void handleReview(report.id, {
                          assignedModeratorUserId: draft.assignedModeratorUserId || undefined,
                          moderatorNote: draft.moderatorNote,
                          resolutionNote: draft.resolutionNote
                        });
                      }}
                      type="button"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                      disabled={busyId === report.id}
                      onClick={() => {
                        void handleReview(report.id, {
                          status: "REVIEWED",
                          assignedModeratorUserId: draft.assignedModeratorUserId || undefined,
                          moderatorNote: draft.moderatorNote,
                          resolutionNote: draft.resolutionNote
                        });
                      }}
                      type="button"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Review
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:border-charcoal/20 disabled:opacity-50"
                      disabled={busyId === report.id}
                      onClick={() => {
                        void handleReview(report.id, {
                          status: "DISMISSED",
                          assignedModeratorUserId: draft.assignedModeratorUserId || undefined,
                          moderatorNote: draft.moderatorNote,
                          resolutionNote: draft.resolutionNote
                        });
                      }}
                      type="button"
                    >
                      <ShieldX className="h-4 w-4" />
                      Dismiss
                    </button>
                  </div>
                </div>
                  );
                })()}
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
