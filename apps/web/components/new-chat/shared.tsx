"use client";

import {
  Eye,
  FileArchive,
  FileText,
  Flame,
  Heart,
  Laugh,
  Paperclip,
  PartyPopper
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CallRecord, ChatMessage, Conversation, PublicUser } from "../../lib/api-client";

export type AuthMode = "login" | "register" | "forgot" | "reset";
export type CallToastKind = "INCOMING" | "MISSED" | "INFO";

export type CallToast = {
  id: string;
  kind: CallToastKind;
  title: string;
  body: string;
  call: CallRecord;
};

export type StatusDraftMedia = {
  provider: "LOCAL" | "S3" | "CLOUDINARY";
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationMs?: number;
  checksum?: string;
  fileName: string;
};

export const detailImage =
  "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80";

export const reactionCatalog: { emoji: string; label: string; icon: LucideIcon }[] = [
  { emoji: "\u{1F525}", label: "Fire", icon: Flame },
  { emoji: "\u2764\uFE0F", label: "Love", icon: Heart },
  { emoji: "\u{1F44F}", label: "Celebrate", icon: PartyPopper },
  { emoji: "\u{1F602}", label: "Laugh", icon: Laugh },
  { emoji: "\u{1F440}", label: "Watching", icon: Eye }
];

export function avatarBadge(label: string, imageUrl: string | null, sizeClass: string) {
  if (imageUrl) {
    return <img alt={label} className={`${sizeClass} rounded-2xl object-cover shadow-[0_8px_24px_rgba(23,22,19,0.08)]`} src={imageUrl} />;
  }

  return (
    <span
      className={`${sizeClass} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lilac via-blush to-honey font-bold text-charcoal shadow-[0_8px_24px_rgba(23,22,19,0.08)]`}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function initialsForName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function directPartner(conversation: Conversation, currentUser: PublicUser) {
  return conversation.participants.find((participant) => participant.user.id !== currentUser.id)?.user ?? null;
}

export function conversationLabel(conversation: Conversation, currentUser: PublicUser) {
  if (conversation.title) {
    return conversation.title;
  }

  const other = directPartner(conversation, currentUser);
  return other?.displayName ?? conversation.type;
}

export function formatConversationType(type: string) {
  if (type === "DIRECT") {
    return "Direct room";
  }
  if (type === "GROUP") {
    return "Group room";
  }
  if (type === "CHANNEL") {
    return "Channel room";
  }

  return type.toLowerCase();
}

export function conversationPreview(conversation: Conversation, currentUser: PublicUser) {
  const latestMessage = conversation.messages[0]?.body?.trim();
  if (latestMessage) {
    return latestMessage;
  }

  const other = directPartner(conversation, currentUser);
  if (other) {
    return `Open a direct thread with ${other.displayName}.`;
  }

  return `${conversation.participants.length} participants in ${formatConversationType(conversation.type).toLowerCase()}.`;
}

export function formatSeenAt(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  if (isSameDay) {
    return `today at ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date)}`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatUserTag(user: Pick<PublicUser, "userCode" | "username">) {
  return user.userCode ? `@${user.userCode}` : `@${user.username}`;
}

export function describeMessageForForward(message: ChatMessage | null) {
  if (!message) {
    return "";
  }

  if (message.deletedAt) {
    return "Message removed";
  }

  if (message.body?.trim()) {
    return message.body.trim();
  }

  if (message.media.length > 0) {
    const firstAsset = message.media[0];
    const label = firstAsset.mimeType.startsWith("image/")
      ? "Photo"
      : firstAsset.mimeType.startsWith("video/")
        ? "Video"
        : firstAsset.mimeType.startsWith("audio/")
          ? "Audio"
          : "Document";

    return message.media.length > 1 ? `${label} bundle (${message.media.length} attachments)` : label;
  }

  return "Forwarded message";
}

export function summarizeReactions(message: ChatMessage, currentUserId: string) {
  const grouped = new Map<string, { emoji: string; count: number; mine: boolean }>();

  for (const reaction of message.reactions) {
    const existing = grouped.get(reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.mine = existing.mine || reaction.user.id === currentUserId;
      continue;
    }

    grouped.set(reaction.emoji, {
      emoji: reaction.emoji,
      count: 1,
      mine: reaction.user.id === currentUserId
    });
  }

  return [...grouped.values()];
}

export function reactionMeta(emoji: string) {
  return reactionCatalog.find((reaction) => reaction.emoji === emoji) ?? reactionCatalog[0];
}

export function seenByLine(message: ChatMessage, currentUserId: string) {
  const readers = message.receipts.filter((receipt) => receipt.user.id !== currentUserId && receipt.status === "READ");
  if (readers.length === 0) {
    return "";
  }

  if (readers.length === 1) {
    return `Seen by ${readers[0].user.displayName}`;
  }

  return `Seen by ${readers.length} people`;
}

export function humanizeConnectionState(state: RTCPeerConnectionState) {
  switch (state) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting...";
    case "disconnected":
      return "Connection lost";
    case "failed":
      return "Connection failed";
    case "closed":
      return "Call closed";
    case "new":
    default:
      return "Preparing call";
  }
}

export function describeMediaError(error: unknown, type: "VOICE" | "VIDEO") {
  if (
    typeof error === "object" &&
    error &&
    "name" in error &&
    typeof (error as { name?: unknown }).name === "string"
  ) {
    const name = (error as { name: string }).name;
    if (name === "NotAllowedError") {
      return `${type === "VIDEO" ? "Camera and microphone" : "Microphone"} access was denied. Check your browser permissions and try again.`;
    }

    if (name === "NotFoundError") {
      return `${type === "VIDEO" ? "A camera or microphone" : "A microphone"} is not available on this device right now.`;
    }

    if (name === "NotReadableError") {
      return `${type === "VIDEO" ? "Your camera or microphone" : "Your microphone"} is busy in another app or browser tab. This is common when two accounts on the same computer try to use one camera. Close the other capture source, or test the second side on another device.`;
    }
  }

  return `We could not start the ${type === "VIDEO" ? "video" : "voice"} call media on this device.`;
}

export function formatCallElapsed(startedAt: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function mergeCallRecord(items: CallRecord[], call: CallRecord) {
  const existingIndex = items.findIndex((item) => item.id === call.id);
  if (existingIndex === -1) {
    return [call, ...items].sort(
      (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
    );
  }

  const next = [...items];
  next[existingIndex] = call;
  return next;
}

export function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

export function attachmentFileName(asset: ChatMessage["media"][number]) {
  return asset.storageKey.split("/").pop() ?? "Attachment";
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  if (sizeBytes < 1024 * 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function attachmentIconForMime(mimeType: string, fileName: string): LucideIcon {
  if (mimeType.includes("zip") || fileName.match(/\.(zip|rar|7z|tar|gz)$/i)) {
    return FileArchive;
  }

  if (mimeType.includes("pdf") || mimeType.includes("text") || mimeType.includes("word") || mimeType.includes("sheet")) {
    return FileText;
  }

  return Paperclip;
}

export function attachmentKindLabel(mimeType: string, fileName: string) {
  if (mimeType.includes("pdf")) {
    return "PDF";
  }

  if (mimeType.includes("word")) {
    return "Document";
  }

  if (mimeType.includes("sheet") || fileName.match(/\.(csv|xls|xlsx)$/i)) {
    return "Spreadsheet";
  }

  if (mimeType.includes("zip") || fileName.match(/\.(zip|rar|7z|tar|gz)$/i)) {
    return "Archive";
  }

  if (mimeType.includes("text")) {
    return "Text file";
  }

  return "Attachment";
}
