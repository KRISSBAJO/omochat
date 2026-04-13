"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { Mic, MicOff, Phone, Video, VideoOff, X } from "lucide-react";
import type { CallRecord, PublicUser } from "../../lib/api-client";
import { formatCallElapsed, formatMessageTime, initialsForName } from "./shared";
import type { CallToast } from "./shared";

export function CallToastStack({
  items,
  onAccept,
  onDismiss,
  onEnd,
  onOpenConversation
}: {
  items: CallToast[];
  onAccept: () => void;
  onDismiss: (toastId: string) => void;
  onEnd: (callId: string) => void;
  onOpenConversation: (conversationId: string, openCallSheet?: boolean) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[130] flex w-full max-w-sm flex-col gap-3">
      {items.map((item) => (
        <div
          className="pointer-events-auto rounded-[28px] border border-charcoal/10 bg-white/95 p-4 shadow-[0_24px_80px_rgba(24,18,15,0.16)] backdrop-blur"
          key={item.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/52">
                {item.kind === "INCOMING" ? "Incoming call" : item.kind === "MISSED" ? "Missed call" : "Call update"}
              </p>
              <h4 className="mt-2 text-base font-semibold text-charcoal">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-graphite/72">{item.body}</p>
            </div>
            <button
              className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-[#faf7f2] text-charcoal transition hover:border-charcoal/20"
              onClick={() => onDismiss(item.id)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.kind === "INCOMING" ? (
              <>
                <button
                  className="rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-cloud transition hover:bg-black"
                  onClick={onAccept}
                  type="button"
                >
                  Answer
                </button>
                <button
                  className="rounded-full border border-charcoal/12 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/22"
                  onClick={() => onEnd(item.call.id)}
                  type="button"
                >
                  Decline
                </button>
              </>
            ) : null}
            <button
              className="rounded-full border border-charcoal/12 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/22"
              onClick={() => {
                onOpenConversation(item.call.conversationId, item.kind !== "MISSED");
                onDismiss(item.id);
              }}
              type="button"
            >
              Open chat
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveCallOverlay({
  activeCall,
  callNotice,
  callConnectionState,
  isCameraOff,
  isMuted,
  isScreenSharing,
  localVideoRef,
  onClose,
  onEnd,
  onToggleScreenShare,
  onToggleCamera,
  onToggleMute,
  remoteAudioRef,
  remoteStream,
  remoteVideoRef,
  viewer
}: {
  activeCall: CallRecord;
  callNotice: string;
  callConnectionState: string;
  isCameraOff: boolean;
  isMuted: boolean;
  isScreenSharing: boolean;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onEnd: () => void;
  onToggleScreenShare: () => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
  remoteStream: MediaStream | null;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  viewer: PublicUser;
}) {
  const remoteParticipant =
    activeCall.participants.find((participant) => participant.userId !== viewer.id)?.user ?? activeCall.startedBy;
  const isVideoCall = activeCall.type === "VIDEO";
  const remoteVideoTracks = remoteStream?.getVideoTracks().filter((track) => track.readyState === "live") ?? [];
  const remoteAudioTracks = remoteStream?.getAudioTracks().filter((track) => track.readyState === "live") ?? [];
  const hasRemoteVideo = remoteVideoTracks.length > 0;
  const hasRemoteAudio = remoteAudioTracks.length > 0;
  const hasAnswered = activeCall.status === "ANSWERED";
  const showLocalShareMain = isVideoCall && isScreenSharing;
  const [elapsed, setElapsed] = useState(() => formatCallElapsed(activeCall.startedAt));

  useEffect(() => {
    setElapsed(formatCallElapsed(activeCall.startedAt));
    const handle = window.setInterval(() => {
      setElapsed(formatCallElapsed(activeCall.startedAt));
    }, 1000);

    return () => window.clearInterval(handle);
  }, [activeCall.startedAt]);

  let remoteMediaLabel = "Negotiating";
  let statusCopy = "Waiting for the other side.";

  if (isVideoCall) {
    if (hasRemoteVideo) {
      remoteMediaLabel = "Video live";
      statusCopy = "Remote video is live.";
    } else if (hasRemoteAudio) {
      remoteMediaLabel = "Audio only";
      statusCopy = "Remote audio is live. Still waiting for video.";
    } else if (hasAnswered) {
      remoteMediaLabel = "Waiting on media";
      statusCopy = "Answered, but remote video is not ready yet.";
    }
  } else if (hasRemoteAudio) {
    remoteMediaLabel = "Audio live";
    statusCopy = "Audio stream is live.";
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <div className="pointer-events-auto absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-auto relative flex w-full max-w-[1100px] flex-col overflow-hidden rounded-[36px] border border-white/12 bg-[#11100d] text-cloud shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cloud/55">
              {isVideoCall ? "Video call" : "Voice call"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-cloud">{remoteParticipant?.displayName ?? "Live room call"}</h3>
            <p className="mt-2 text-sm text-cloud/68">{formatMessageTime(activeCall.startedAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-cloud/78">{activeCall.status}</span>
            <button
              className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/8 text-cloud/80 transition hover:bg-white/14"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={`grid gap-4 p-5 ${isVideoCall ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "lg:grid-cols-[minmax(0,1fr)_320px]"}`}>
          <div className="relative overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(217,184,112,0.28),rgba(17,16,13,0.9)_56%)] p-4">
            {isVideoCall ? (
              <>
                <div className="relative min-h-[360px] overflow-hidden rounded-[24px] bg-black/30">
                  {showLocalShareMain ? (
                    <>
                      <video autoPlay className="h-full min-h-[360px] w-full object-cover" muted playsInline ref={localVideoRef} />
                      <div className="absolute left-4 top-4 rounded-full bg-black/45 px-4 py-2 text-xs font-semibold text-cloud">
                        Sharing your screen
                      </div>
                    </>
                  ) : hasRemoteVideo ? (
                    <video autoPlay className="h-full min-h-[360px] w-full object-cover" playsInline ref={remoteVideoRef} />
                  ) : (
                    <div className="grid min-h-[360px] place-items-center">
                      <div className="text-center">
                        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/10 text-3xl font-bold text-cloud">
                          {initialsForName(remoteParticipant?.displayName ?? "Call")}
                        </div>
                        <p className="mt-5 text-lg font-semibold text-cloud">
                          {hasAnswered ? "Waiting for video" : "Calling"}
                        </p>
                        <p className="mt-2 max-w-md text-sm text-cloud/68">{statusCopy}</p>
                      </div>
                    </div>
                  )}
                  <audio autoPlay className="hidden" ref={remoteAudioRef} />
                </div>
                {!showLocalShareMain ? (
                  <div className="absolute bottom-8 right-8 w-[180px] overflow-hidden rounded-[24px] border border-white/10 bg-black/35 shadow-[0_20px_40px_rgba(0,0,0,0.24)]">
                    {isCameraOff ? (
                      <div className="grid h-[120px] place-items-center text-center">
                        <div>
                          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/10">
                            <VideoOff className="h-5 w-5 text-cloud" />
                          </div>
                          <p className="mt-3 text-xs font-semibold text-cloud/76">Camera off</p>
                        </div>
                      </div>
                    ) : (
                      <video autoPlay className="h-[120px] w-full object-cover" muted playsInline ref={localVideoRef} />
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="grid min-h-[360px] place-items-center">
                <div className="text-center">
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/10 text-4xl font-bold text-cloud">
                    {initialsForName(remoteParticipant?.displayName ?? "Call")}
                  </div>
                  <p className="mt-6 text-2xl font-semibold text-cloud">{remoteParticipant?.displayName ?? "Voice call"}</p>
                  <p className="mt-3 text-sm text-cloud/68">{hasRemoteAudio ? "Audio stream connected." : "Connecting voice stream and keeping the room warm."}</p>
                  <audio autoPlay className="hidden" ref={remoteAudioRef} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-[30px] border border-white/8 bg-white/6 p-5">
            <div className="grid gap-2 text-xs text-cloud/70">
              <div className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/6 px-3 py-3">
                <span>State</span>
                <span className="font-semibold text-cloud">{callConnectionState}</span>
              </div>
              <div className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/6 px-3 py-3">
                <span>Remote</span>
                <span className="font-semibold text-cloud">{remoteMediaLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/6 px-3 py-3">
                <span>Timer</span>
                <span className="font-semibold text-cloud">{elapsed}</span>
              </div>
              {isVideoCall ? (
                <div className="flex items-center justify-between rounded-[20px] border border-white/8 bg-white/6 px-3 py-3">
                  <span>You</span>
                  <span className="font-semibold text-cloud">{isScreenSharing ? "Sharing screen" : "On camera"}</span>
                </div>
              ) : null}
            </div>

            {callNotice ? (
              <div className="rounded-[20px] border border-[#d4b27f]/30 bg-[#fff4d7]/10 px-4 py-3 text-sm leading-6 text-[#f3deba]">
                {callNotice}
              </div>
            ) : null}

            <div className={`grid gap-3 ${isVideoCall ? "grid-cols-3" : "grid-cols-2"}`}>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-sm font-semibold text-cloud transition hover:bg-white/12"
                onClick={onToggleMute}
                type="button"
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? "Unmute" : "Mute"}
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-sm font-semibold text-cloud transition hover:bg-white/12 disabled:opacity-45"
                disabled={!isVideoCall || isScreenSharing}
                onClick={onToggleCamera}
                type="button"
              >
                {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                {isCameraOff ? "Camera off" : "Camera on"}
              </button>
              {isVideoCall ? (
                <button
                  className="inline-flex items-center justify-center rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-sm font-semibold text-cloud transition hover:bg-white/12"
                  onClick={onToggleScreenShare}
                  type="button"
                >
                  {isScreenSharing ? "Stop share" : "Share"}
                </button>
              ) : null}
            </div>

            <div className="mt-auto grid gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white px-4 py-4 text-sm font-semibold text-charcoal transition hover:bg-[#f6f1e7]"
                onClick={onClose}
                type="button"
              >
                Hide panel
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#e96b5a] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#df5643]"
                onClick={onEnd}
                type="button"
              >
                <Phone className="h-4 w-4" />
                End call
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
