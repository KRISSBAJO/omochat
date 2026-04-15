"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Archive,
  ArrowRight,
  Bell,
  BellRing,
  Camera,
  Check,
  ChevronDown,
  CircleUserRound,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileArchive,
  FileText,
  Flame,
  Hash,
  Heart,
  Image as ImageIcon,
  Laugh,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  Menu,
  Mic,
  MicOff,
  MessageSquareText,
  MoreVertical,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PencilLine,
  PartyPopper,
  Pin,
  Phone,
  Plus,
  Radio,
  Reply,
  Search,
  SendHorizontal,
  Settings,
  ShieldAlert,
  ShieldBan,
  SmilePlus,
  Sparkles,
  UserRound,
  Users,
  VideoOff,
  Trash2,
  X,
  Video,
  LocateFixed
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { City, Country, State } from "country-state-city";
import {
  acceptMessageRequest,
  acceptCall,
  AuthSession,
  blockUser,
  BlockedUser,
  CallRecord,
  ChatMessage,
  commentOnStatus,
  Conversation,
  createStatus,
  createConversation,
  deleteMessage,
  deleteStatus,
  declineMessageRequest,
  DirectMessageRequest,
  forgotPassword,
  getCallHistory,
  getBlockedUsers,
  getConversations,
  getModerators,
  getMessages,
  getMessageRequests,
  getModerationReports,
  getNotifications,
  getRtcConfig,
  getStatus,
  getStatusFeed,
  login,
  markAllNotificationsRead,
  markNotificationRead,
  ModeratorSummary,
  moderateStatus,
  NotificationItem,
  markConversationRead,
  markStatusViewed,
  logout,
  ModerationReport,
  PublicUser,
  prepareAttachmentUpload,
  reportUser,
  refreshSession,
  subscribeToSessionRefresh,
  register,
  registerPushSubscription,
  resetPassword,
  RtcConfig,
  SearchUser,
  searchUsers,
  sendMessage as sendChatMessage,
  sendAttachmentMessage,
  startDirectAccess,
  startCall,
  startPhoneVerification,
  StatusDetail,
  StatusFeed,
  toggleReaction,
  toggleStatusReaction,
  unblockUser,
  unregisterPushSubscription,
  endCall,
  updateMessage,
  updateModerationReport,
  uploadFileToSignedUrl,
  updateMe,
  verifyPhoneNumber,
  updateConversationState
} from "../lib/api-client";
import { ChatLoadingScreen } from "./chat-loading-screen";
import { collectFileMetadata, reverseGeocodeCurrentPosition, uploadFileToCloudinary } from "../lib/media-helpers";
import { ForwardConversationOption, ForwardMessageModal } from "./chat/forward-message-modal";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type AuthMode = "login" | "register" | "forgot" | "reset";
type ComposerMode = "DIRECT" | "GROUP" | "CHANNEL";
type ChatFilter = "ALL" | "UNREAD" | "DIRECT" | "GROUP" | "CHANNEL";
type SidebarMode = "CHATS" | "STATUS" | "REQUESTS" | "VAULT";
type ActivityView = "REQUESTS" | "NOTIFICATIONS";
type VaultView = "LOCKED" | "ARCHIVED";
type SettingsView = "profile" | "reachability" | "phone" | "alerts" | "blocked" | "moderation";
type StatusComposerMode = "TEXT" | "PHOTO" | "VIDEO";
type CallToastKind = "INCOMING" | "MISSED" | "INFO";
type CallToast = {
  id: string;
  kind: CallToastKind;
  title: string;
  body: string;
  call: CallRecord;
};

type StatusDraftMedia = {
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

const reactionChoices: { emoji: string; label: string; icon: LucideIcon }[] = [
  { emoji: "🔥", label: "Fire", icon: Flame },
  { emoji: "❤️", label: "Love", icon: Heart },
  { emoji: "👏", label: "Celebrate", icon: PartyPopper },
  { emoji: "😂", label: "Laugh", icon: Laugh },
  { emoji: "👀", label: "Watching", icon: Eye }
];


const detailImage =
  "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80";

const reactionCatalog: { emoji: string; label: string; icon: LucideIcon }[] = [
  { emoji: "\u{1F525}", label: "Fire", icon: Flame },
  { emoji: "\u2764\uFE0F", label: "Love", icon: Heart },
  { emoji: "\u{1F44F}", label: "Celebrate", icon: PartyPopper },
  { emoji: "\u{1F602}", label: "Laugh", icon: Laugh },
  { emoji: "\u{1F440}", label: "Watching", icon: Eye }
];

const giphyApiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";
const giphy = giphyApiKey ? new GiphyFetch(giphyApiKey) : null;
const webPushPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";
const defaultRtcConfig: RtcConfig = {
  credentialExpiresAt: null,
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
};

export function ChatShell() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [notice, setNotice] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, SearchUser | PublicUser>>({});
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [composerMode, setComposerMode] = useState<ComposerMode>("DIRECT");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("ALL");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerParticipants, setComposerParticipants] = useState<SearchUser[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [openReactionPickerId, setOpenReactionPickerId] = useState<string | null>(null);
  const [isInboxPanelOpen, setIsInboxPanelOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nextMessagesCursor, setNextMessagesCursor] = useState<string | null>(null);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [lockedConversations, setLockedConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [messageRequests, setMessageRequests] = useState<{
    incoming: DirectMessageRequest[];
    outgoing: DirectMessageRequest[];
  }>({
    incoming: [],
    outgoing: []
  });
  const [notifications, setNotifications] = useState<{
    items: NotificationItem[];
    unreadCount: number;
  }>({
    items: [],
    unreadCount: 0
  });
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("CHATS");
  const [activityView, setActivityView] = useState<ActivityView>("REQUESTS");
  const [vaultView, setVaultView] = useState<VaultView>("LOCKED");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    displayName: "",
    statusMessage: "",
    bio: "",
    addressLine1: "",
    city: "",
    stateRegion: "",
    countryCode: "",
    avatarUrl: "",
    latitude: null as number | null,
    longitude: null as number | null
  });
  const [statusFeed, setStatusFeed] = useState<StatusFeed | null>(null);
  const [activeStatusThreadId, setActiveStatusThreadId] = useState<string | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [activeStatusDetail, setActiveStatusDetail] = useState<StatusDetail | null>(null);
  const [isStatusComposerOpen, setIsStatusComposerOpen] = useState(false);
  const [statusComposerMode, setStatusComposerMode] = useState<StatusComposerMode>("TEXT");
  const [statusDraftText, setStatusDraftText] = useState("");
  const [statusDraftCaption, setStatusDraftCaption] = useState("");
  const [statusDraftBackgroundColor, setStatusDraftBackgroundColor] = useState("#8d3270");
  const [statusDraftTextColor, setStatusDraftTextColor] = useState("#fff6f7");
  const [statusDraftTtlHours, setStatusDraftTtlHours] = useState("24");
  const [statusDraftMedia, setStatusDraftMedia] = useState<StatusDraftMedia | null>(null);
  const [statusNotice, setStatusNotice] = useState("");
  const [statusReplyDraft, setStatusReplyDraft] = useState("");
  const [isStatusBusy, setIsStatusBusy] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [isPhoneBusy, setIsPhoneBusy] = useState(false);
  const [isProfileBusy, setIsProfileBusy] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isLocatingProfile, setIsLocatingProfile] = useState(false);
  const [requestRecipient, setRequestRecipient] = useState<SearchUser | null>(null);
  const [requestDraft, setRequestDraft] = useState("");
  const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [isSafetyBusy, setIsSafetyBusy] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [isGifLoading, setIsGifLoading] = useState(false);
  const [isUploadBusy, setIsUploadBusy] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [forwardQuery, setForwardQuery] = useState("");
  const [forwardConversationIds, setForwardConversationIds] = useState<string[]>([]);
  const [isForwardBusy, setIsForwardBusy] = useState(false);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [isCallSheetOpen, setIsCallSheetOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ call: CallRecord; fromUserId?: string | null } | null>(null);
  const [callNotice, setCallNotice] = useState("");
  const [callToasts, setCallToasts] = useState<CallToast[]>([]);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [moderationStatusFilter, setModerationStatusFilter] = useState<"ALL" | "OPEN" | "REVIEWED" | "DISMISSED">("OPEN");
  const [moderationReports, setModerationReports] = useState<ModerationReport[]>([]);
  const [moderators, setModerators] = useState<ModeratorSummary[]>([]);
  const [isModerationBusy, setIsModerationBusy] = useState(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" || !("Notification" in window) ? "unsupported" : window.Notification.permission
  );
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callConnectionState, setCallConnectionState] = useState("Idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [rtcConfig, setRtcConfig] = useState<RtcConfig>(defaultRtcConfig);
  const activeConversationIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const statusMediaInputRef = useRef<HTMLInputElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIncomingOfferRef = useRef<{
    callId: string;
    conversationId: string;
    fromUserId: string;
    sdp: RTCSessionDescriptionInit;
  } | null>(null);
  const browserNotificationIdsRef = useRef<Set<string>>(new Set());
  const browserNotificationsPrimedRef = useRef(false);
  const pushSubscriptionEndpointRef = useRef<string | null>(null);
  const routeIntentAppliedRef = useRef(false);
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
  const status = useMemo(() => `Live on ${socketUrl}`, [socketUrl]);
  const currentUser = session?.user ?? null;
  const currentIdentity = formatUserTag(currentUser ?? { userCode: null, username: "you" });
  const activeTypingUsers = Object.values(typingUsers).filter((user) => user.id !== session?.user.id);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const statusThreads = useMemo(() => {
    if (!statusFeed) {
      return [];
    }

    return statusFeed.mine ? [statusFeed.mine, ...statusFeed.contacts] : statusFeed.contacts;
  }, [statusFeed]);
  const filteredStatusThreads = useMemo(() => {
    if (!normalizedSearch) {
      return statusThreads;
    }

    return statusThreads.filter((thread) => {
      const haystack = [
        thread.owner.displayName,
        thread.owner.username,
        thread.owner.userCode ?? "",
        ...thread.items.map((item) => item.text ?? ""),
        ...thread.items.map((item) => item.caption ?? "")
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, statusThreads]);
  const activeStatusThread =
    filteredStatusThreads.find((thread) => thread.owner.id === activeStatusThreadId) ??
    statusThreads.find((thread) => thread.owner.id === activeStatusThreadId) ??
    filteredStatusThreads[0] ??
    statusThreads[0] ??
    null;
  const activeStatusSummary =
    activeStatusThread?.items[Math.min(activeStatusIndex, Math.max(activeStatusThread.items.length - 1, 0))] ?? null;
  const sortConversations = (items: Conversation[]) =>
    [...items].sort((left, right) => {
      const leftTime = new Date(left.lastMessageAt ?? left.messages[0]?.createdAt ?? 0).getTime();
      const rightTime = new Date(right.lastMessageAt ?? right.messages[0]?.createdAt ?? 0).getTime();
      return rightTime - leftTime;
    });
  const orderedConversations = useMemo(() => sortConversations(conversations), [conversations]);
  const orderedLockedConversations = useMemo(() => sortConversations(lockedConversations), [lockedConversations]);
  const orderedArchivedConversations = useMemo(() => sortConversations(archivedConversations), [archivedConversations]);
  const allKnownConversations = useMemo(
    () => [...orderedConversations, ...orderedLockedConversations, ...orderedArchivedConversations],
    [orderedArchivedConversations, orderedConversations, orderedLockedConversations]
  );
  const activeConversation = allKnownConversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const activeRelationship = activeConversation?.relationshipState ?? {
    blockedByMe: false,
    blockedMe: false
  };
  const isActiveConversationBlocked = activeRelationship.blockedByMe || activeRelationship.blockedMe;
  const activeMembers = activeConversation?.participants.map((participant) => participant.user) ?? [];
  const activeRoomLabel = activeConversation && currentUser ? conversationLabel(activeConversation, currentUser) : null;
  const activeRoomType = activeConversation ? formatConversationType(activeConversation.type) : null;
  const activeRoomPreview =
    activeConversation && currentUser
      ? conversationPreview(activeConversation, currentUser)
      : "Pick a room from the left or search for someone new to begin.";
  const matchesConversationSearch = (conversation: Conversation, viewer: PublicUser) => {
    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      conversationLabel(conversation, viewer),
      conversationPreview(conversation, viewer),
      formatConversationType(conversation.type),
      ...conversation.participants.map((participant) => participant.user.displayName),
      ...conversation.participants.map((participant) => participant.user.username),
      ...conversation.participants.map((participant) => participant.user.userCode ?? "")
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  };
  const filteredConversations = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return orderedConversations.filter((conversation) => {
      if (chatFilter === "UNREAD" && conversation.unreadCount === 0) {
        return false;
      }

      if (chatFilter !== "ALL" && chatFilter !== "UNREAD" && conversation.type !== chatFilter) {
        return false;
      }

      return matchesConversationSearch(conversation, currentUser);
    });
  }, [chatFilter, currentUser, orderedConversations, normalizedSearch]);
  const filteredLockedConversations = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return orderedLockedConversations.filter((conversation) => matchesConversationSearch(conversation, currentUser));
  }, [currentUser, orderedLockedConversations, normalizedSearch]);
  const filteredArchivedConversations = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return orderedArchivedConversations.filter((conversation) => matchesConversationSearch(conversation, currentUser));
  }, [currentUser, orderedArchivedConversations, normalizedSearch]);
  const normalizedForwardQuery = forwardQuery.trim().toLowerCase();
  const forwardOptions = useMemo<ForwardConversationOption[]>(() => {
    if (!currentUser) {
      return [];
    }

    return allKnownConversations
      .filter((conversation) => {
        if (!normalizedForwardQuery) {
          return true;
        }

        const haystack = [
          conversationLabel(conversation, currentUser),
          conversationPreview(conversation, currentUser),
          formatConversationType(conversation.type),
          ...conversation.participants.map((participant) => participant.user.displayName),
          ...conversation.participants.map((participant) => participant.user.username),
          ...conversation.participants.map((participant) => participant.user.userCode ?? "")
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedForwardQuery);
      })
      .map((conversation) => {
        const other = directPartner(conversation, currentUser);
        return {
          id: conversation.id,
          title: conversationLabel(conversation, currentUser),
          preview: conversationPreview(conversation, currentUser),
          meta: other ? formatUserTag(other) : formatConversationType(conversation.type),
          avatarLabel: initialsForName(conversationLabel(conversation, currentUser)),
          avatarUrl: other?.avatarUrl ?? null
        };
      });
  }, [allKnownConversations, currentUser, normalizedForwardQuery]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("resetToken");
    if (token) {
      setBooting(false);
      return;
    }

    refreshSession()
      .then((nextSession) => setSession(nextSession))
      .catch(() => undefined)
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => subscribeToSessionRefresh((nextSession) => setSession(nextSession)), []);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    setPresence((current) => ({
      ...current,
      [session.user.id]: true
    }));
  }, [session?.user.id]);

  useEffect(() => {
    setPhoneDraft(currentUser?.phoneNumber ?? "");
  }, [currentUser?.phoneNumber]);

  useEffect(() => {
    setProfileDraft({
      displayName: currentUser?.displayName ?? "",
      statusMessage: currentUser?.statusMessage ?? "",
      bio: currentUser?.bio ?? "",
      addressLine1: currentUser?.addressLine1 ?? "",
      city: currentUser?.city ?? "",
      stateRegion: currentUser?.stateRegion ?? "",
      countryCode: currentUser?.countryCode ?? "",
      avatarUrl: currentUser?.avatarUrl ?? "",
      latitude: currentUser?.latitude ?? null,
      longitude: currentUser?.longitude ?? null
    });
  }, [
    currentUser?.addressLine1,
    currentUser?.avatarUrl,
    currentUser?.bio,
    currentUser?.city,
    currentUser?.countryCode,
    currentUser?.displayName,
    currentUser?.latitude,
    currentUser?.longitude,
    currentUser?.stateRegion,
    currentUser?.statusMessage
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserNotificationPermission("unsupported");
      return;
    }

    setBrowserNotificationPermission(window.Notification.permission);
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      setRtcConfig(defaultRtcConfig);
      return;
    }

    getRtcConfig(session.accessToken)
      .then((nextConfig) => setRtcConfig(nextConfig.iceServers.length ? nextConfig : defaultRtcConfig))
      .catch(() => setRtcConfig(defaultRtcConfig));
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || browserNotificationPermission !== "granted") {
      return;
    }

    void syncBrowserPushSubscription(session.accessToken).catch(() => undefined);
  }, [browserNotificationPermission, session?.accessToken]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    setTypingUsers({});
    setOpenReactionPickerId(null);
    setNextMessagesCursor(null);
    setIsConversationMenuOpen(false);
    setIsReportOpen(false);
    setReplyTarget(null);
    setEditingMessageId(null);
    setIsEmojiPickerOpen(false);
    setIsGifPickerOpen(false);
  }, [activeConversationId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      cleanupCallMedia();
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsSidebarOpen(false);
      setIsComposerOpen(false);
      setOpenReactionPickerId(null);
      setIsSettingsOpen(false);
      setRequestRecipient(null);
      setIsConversationMenuOpen(false);
      setIsReportOpen(false);
      setIsCallSheetOpen(false);
      setIsModerationOpen(false);
      setIsEmojiPickerOpen(false);
      setIsGifPickerOpen(false);
      setIsStatusComposerOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const socket = io(socketUrl, {
      auth: {
        token: session.accessToken
      },
      withCredentials: true,
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_user");
      conversations.forEach((conversation) => socket.emit("join_conversation", conversation.id));
    });

    socket.on("conversation_updated", () => {
      void refreshConversations(activeConversationIdRef.current ?? undefined).catch(() => undefined);
    });

    socket.on("status_updated", () => {
      void refreshStatusFeed(activeStatusThreadId ?? undefined, activeStatusSummary?.id ?? undefined).catch(() => undefined);
    });

    socket.on("inbox_refresh", () => {
      void Promise.all([
        refreshConversations(activeConversationIdRef.current ?? undefined),
        refreshNotifications()
      ]).catch(() => undefined);
    });

    socket.on("receive_message", (message: ChatMessage) => {
      if (message.conversationId === activeConversationIdRef.current) {
        appendMessage(message);
      }

      if (message.sender?.id && message.sender.id !== session.user.id && message.conversationId !== activeConversationIdRef.current) {
        showBrowserNotification(`New message from ${message.sender.displayName}`, {
          body: message.body?.trim() || "Open the conversation to view the latest message."
        });
      }

      void refreshConversations(activeConversationIdRef.current ?? message.conversationId).catch(() => undefined);
    });

    socket.on("typing", (payload: { conversationId: string; userId: string; typing: boolean; displayName?: string; username?: string; userCode?: string | null }) => {
      if (payload.conversationId !== activeConversationIdRef.current) {
        return;
      }

      setTypingUsers((current) => {
        const next = { ...current };
        if (!payload.typing) {
          delete next[payload.userId];
          return next;
        }

        next[payload.userId] = {
          id: payload.userId,
          email: "",
          username: payload.username ?? payload.userId,
          userCode: payload.userCode ?? null,
          displayName: payload.displayName ?? "Someone",
          avatarUrl: null,
          statusMessage: null,
          bio: null,
          addressLine1: null,
          city: null,
          stateRegion: null,
          countryCode: null,
          latitude: null,
          longitude: null,
          phoneNumber: null,
          phoneVerifiedAt: null,
          dmPolicy: "OPEN",
          status: "ACTIVE",
          access: {
            isModerator: false,
            isPlatformAdmin: false,
            isSiteAdmin: false,
            roles: []
          }
        };
        return next;
      });
    });

    socket.on("presence_update", (payload: { userId: string; online: boolean }) => {
      setPresence((current) => ({
        ...current,
        [payload.userId]: payload.online
      }));
    });

    socket.on("read_receipt", (message: ChatMessage) => {
      mergeMessage(message);
    });

    socket.on("message_reaction", (message: ChatMessage) => {
      mergeMessage(message);
    });

    socket.on("message_updated", (message: ChatMessage) => {
      mergeMessage(message);
      void refreshConversations(activeConversationIdRef.current ?? message.conversationId).catch(() => undefined);
    });

    socket.on("call_state", (payload: { event: string; call: CallRecord }) => {
      setCallHistory((current) => mergeCallRecord(current, payload.call));
      setActiveCall((current) => {
        if (!current) {
          return payload.call.status === "RINGING" || payload.call.status === "ANSWERED" ? payload.call : null;
        }

        if (current.id === payload.call.id) {
          return payload.call.status === "MISSED" || payload.call.status === "ENDED" || payload.call.status === "FAILED"
            ? null
            : payload.call;
        }

        return current;
      });

      if (payload.event === "started" && payload.call.startedBy?.id !== session.user.id) {
        const callerName = payload.call.startedBy?.displayName ?? "Someone";
        setIncomingCall({
          call: payload.call,
          fromUserId: payload.call.startedBy?.id ?? null
        });
        pushCallToast({
          body: `${callerName} is waiting for you to answer this ${payload.call.type === "VIDEO" ? "video" : "voice"} call.`,
          call: payload.call,
          id: `incoming-${payload.call.id}`,
          kind: "INCOMING",
          title: `${callerName} is calling`
        });
        showBrowserNotification(`${callerName} is calling`, {
          body: `${payload.call.type === "VIDEO" ? "Video" : "Voice"} call waiting for your answer.`
        });
      }

      if (payload.event === "accepted" && payload.call.startedBy?.id === session.user.id) {
        pushCallToast({
          body: `${payload.call.participants.find((participant) => participant.userId !== session.user.id)?.user.displayName ?? "The other side"} answered your call.`,
          call: payload.call,
          id: `accepted-${payload.call.id}`,
          kind: "INFO",
          title: "Call connected"
        }, 5000);
      }

      if (payload.event === "ended") {
        dismissCallToast(`incoming-${payload.call.id}`);
        setIncomingCall((current) => (current?.call.id === payload.call.id ? null : current));

        const myParticipant = payload.call.participants.find((participant) => participant.userId === session.user.id);
        const iMissedThisCall =
          payload.call.status === "MISSED" &&
          payload.call.startedBy?.id !== session.user.id &&
          !myParticipant?.joinedAt;

        if (iMissedThisCall) {
          pushCallToast({
            body: `${payload.call.startedBy?.displayName ?? "Someone"} tried to reach you.`,
            call: payload.call,
            id: `missed-${payload.call.id}`,
            kind: "MISSED",
            title: `Missed ${payload.call.type === "VIDEO" ? "video" : "voice"} call`
          });
        }
      }
    });

    socket.on("call_offer", (payload: { callId: string; conversationId: string; fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      pendingIncomingOfferRef.current = payload;
      setCallNotice("Incoming live call offer received.");
      showBrowserNotification("Incoming live call", {
        body: "Open the chat to answer the call."
      });
    });

    socket.on(
      "call_answer",
      async (payload: { callId: string; conversationId: string; fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
        if (!peerConnectionRef.current || !activeCall || activeCall.id !== payload.callId) {
          return;
        }

        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        setCallConnectionState("Connected");
      }
    );

    socket.on(
      "call_ice_candidate",
      async (payload: { callId: string; conversationId: string; fromUserId: string; candidate: RTCIceCandidateInit }) => {
        if (!peerConnectionRef.current || !activeCall || activeCall.id !== payload.callId) {
          return;
        }

        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          // Ignore racey ICE candidates that arrive before the peer connection is ready.
        }
      }
    );

    socket.on("call_hangup", (payload: { callId: string }) => {
      setIncomingCall((current) => (current?.call.id === payload.callId ? null : current));
      setActiveCall((current) => (current?.id === payload.callId ? null : current));
      setCallNotice("Call ended.");
      cleanupCallMedia();
    });

    return () => {
      socket.off("receive_message");
      socket.off("conversation_updated");
      socket.off("status_updated");
      socket.off("inbox_refresh");
      socket.off("typing");
      socket.off("presence_update");
      socket.off("read_receipt");
      socket.off("message_reaction");
      socket.off("message_updated");
      socket.off("call_state");
      socket.off("call_offer");
      socket.off("call_answer");
      socket.off("call_ice_candidate");
      socket.off("call_hangup");
      socket.off("connect");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeStatusSummary?.id, activeStatusThreadId, conversations, session?.accessToken, session?.user.id, socketUrl]);

  useEffect(() => {
    if (!activeConversationId || !socketRef.current) {
      return;
    }

    socketRef.current.emit("join_conversation", activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    refreshConversations().catch(() => {
      setConversations([]);
      setLockedConversations([]);
      setArchivedConversations([]);
    });
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      setStatusFeed(null);
      setActiveStatusThreadId(null);
      setActiveStatusIndex(0);
      setActiveStatusDetail(null);
      return;
    }

    refreshStatusFeed().catch(() => {
      setStatusFeed(null);
      setActiveStatusThreadId(null);
      setActiveStatusIndex(0);
      setActiveStatusDetail(null);
    });
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      setMessageRequests({
        incoming: [],
        outgoing: []
      });
      return;
    }

    getMessageRequests(session.accessToken)
      .then(setMessageRequests)
      .catch(() =>
        setMessageRequests({
          incoming: [],
          outgoing: []
        })
      );
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      browserNotificationIdsRef.current = new Set();
      browserNotificationsPrimedRef.current = false;
      setNotifications({
        items: [],
        unreadCount: 0
      });
      return;
    }

    getNotifications(session.accessToken)
      .then(setNotifications)
      .catch(() =>
        setNotifications({
          items: [],
          unreadCount: 0
        })
      );
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const interval = window.setInterval(() => {
      void Promise.all([refreshNotifications(), refreshMessageRequests(), refreshStatusFeed()]).catch(() => undefined);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      setBlockedUsers([]);
      return;
    }

    getBlockedUsers(session.accessToken)
      .then(setBlockedUsers)
      .catch(() => setBlockedUsers([]));
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !activeConversationId) {
      setMessages([]);
      setNextMessagesCursor(null);
      return;
    }

    getMessages(activeConversationId, session.accessToken)
      .then((page) => {
        setMessages(page.items);
        setNextMessagesCursor(page.nextCursor);
      })
      .catch(() => {
        setMessages([]);
        setNextMessagesCursor(null);
      });
  }, [activeConversationId, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !activeStatusSummary) {
      setActiveStatusDetail(null);
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      try {
        const detail =
          activeStatusSummary.owner.id === session.user.id
            ? await getStatus(activeStatusSummary.id, session.accessToken)
            : await markStatusViewed(activeStatusSummary.id, session.accessToken);

        if (cancelled) {
          return;
        }

        setActiveStatusDetail(detail);
        setStatusReplyDraft("");
        await refreshStatusFeed(activeStatusThread?.owner.id ?? undefined, activeStatusSummary.id);
      } catch {
        if (!cancelled) {
          setActiveStatusDetail(null);
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [activeStatusSummary?.id, activeStatusThread?.owner.id, session?.accessToken, session?.user.id]);

  useEffect(() => {
    if (sidebarMode !== "STATUS" || !activeStatusSummary || !activeStatusThread || activeStatusThread.items.length <= 1) {
      return;
    }

    const durationMs =
      activeStatusSummary.media?.mimeType.startsWith("video/") && activeStatusSummary.media.durationMs
        ? Math.min(Math.max(activeStatusSummary.media.durationMs, 4000), 20000)
        : 7000;

    const timer = window.setTimeout(() => {
      setActiveStatusIndex((current) =>
        current < activeStatusThread.items.length - 1 ? current + 1 : current
      );
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [activeStatusSummary, activeStatusThread, sidebarMode]);

  useEffect(() => {
    if (!session?.accessToken || !activeConversationId) {
      setCallHistory([]);
      setActiveCall((current) =>
        current && (current.status === "RINGING" || current.status === "ANSWERED") ? current : null
      );
      return;
    }

    getCallHistory(activeConversationId, session.accessToken)
      .then((items) => {
        setCallHistory(items);
        setActiveCall((current) => {
          const nextActive = items.find((item) => item.status === "RINGING" || item.status === "ANSWERED");
          if (nextActive) {
            return nextActive;
          }

          return current && (current.status === "RINGING" || current.status === "ANSWERED") ? current : null;
        });
      })
      .catch(() => {
        setCallHistory([]);
        setActiveCall((current) =>
          current && (current.status === "RINGING" || current.status === "ANSWERED") ? current : null
        );
      });
  }, [activeConversationId, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || routeIntentAppliedRef.current || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("conversationId");
    const sidebar = params.get("sidebar");
    const callAction = params.get("callAction");

    if (!conversationId && !sidebar && !callAction) {
      routeIntentAppliedRef.current = true;
      return;
    }

    if (sidebar === "requests") {
      setSidebarMode("REQUESTS");
      setActivityView("REQUESTS");
    }

    if (conversationId) {
      setActiveConversationId(conversationId);
      setSidebarMode("CHATS");
      setIsSidebarOpen(false);
    }

    if (callAction === "incoming" || callAction === "missed") {
      setIsCallSheetOpen(true);
    }

    routeIntentAppliedRef.current = true;
    window.history.replaceState({}, "", window.location.pathname);
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !isModerationOpen) {
      return;
    }

    setIsModerationBusy(true);
    Promise.all([
      getModerationReports(session.accessToken, moderationStatusFilter === "ALL" ? undefined : { status: moderationStatusFilter }),
      getModerators(session.accessToken)
    ])
      .then(([nextReports, nextModerators]) => {
        setModerationReports(nextReports);
        setModerators(nextModerators);
      })
      .catch((error) => setSettingsNotice(error instanceof Error ? error.message : "Could not load moderation reports."))
      .finally(() => setIsModerationBusy(false));
  }, [isModerationOpen, moderationStatusFilter, session?.accessToken]);

  useEffect(() => {
    if (browserNotificationPermission !== "granted") {
      return;
    }

    if (!browserNotificationsPrimedRef.current) {
      notifications.items.forEach((notification) => browserNotificationIdsRef.current.add(notification.id));
      browserNotificationsPrimedRef.current = true;
      return;
    }

    for (const notification of notifications.items) {
      if (browserNotificationIdsRef.current.has(notification.id)) {
        continue;
      }

      browserNotificationIdsRef.current.add(notification.id);
      if (notification.readAt) {
        continue;
      }

      showBrowserNotification(notification.title, {
        body: notification.body
      });
    }
  }, [browserNotificationPermission, notifications.items]);

  useEffect(() => {
    if (!isGifPickerOpen || !giphy) {
      setGifResults([]);
      setIsGifLoading(false);
      return;
    }

    const handle = window.setTimeout(() => {
      setIsGifLoading(true);
      const query = gifQuery.trim();
      const request = query.length >= 2 ? giphy.search(query, { limit: 12 }) : giphy.trending({ limit: 12 });

      request
        .then((result) => setGifResults(result.data ?? []))
        .catch(() => setGifResults([]))
        .finally(() => setIsGifLoading(false));
    }, 220);

    return () => window.clearTimeout(handle);
  }, [gifQuery, isGifPickerOpen]);

  useEffect(() => {
    if (!session?.accessToken || sidebarMode !== "CHATS" || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      searchUsers(searchQuery, session.accessToken)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 220);

    return () => window.clearTimeout(handle);
  }, [searchQuery, session?.accessToken, sidebarMode]);

  useEffect(() => {
    if (!session?.accessToken || !activeConversationId || messages.length === 0) {
      return;
    }

    const latestIncoming = [...messages].reverse().find((message) => message.sender?.id && message.sender.id !== session.user.id);
    if (!latestIncoming) {
      return;
    }

    const alreadyRead = latestIncoming.receipts.some((receipt) => receipt.user.id === session.user.id && receipt.status === "READ");
    if (alreadyRead) {
      return;
    }

    void markConversationRead(activeConversationId, session.accessToken, latestIncoming.id)
      .then((result) => {
        if ("id" in result) {
          mergeMessage(result);
        }
        void refreshConversations(activeConversationId).catch(() => undefined);
      })
      .catch(() => undefined);
  }, [activeConversationId, messages, session?.accessToken, session?.user.id]);

  async function refreshConversations(selectConversationId?: string) {
    if (!session?.accessToken) {
      return;
    }

    const [nextConversations, nextLockedCandidates, nextArchivedCandidates] = await Promise.all([
      getConversations(session.accessToken),
      getConversations(session.accessToken, { includeLocked: true }),
      getConversations(session.accessToken, { includeArchived: true })
    ]);

    const nextLocked = nextLockedCandidates.filter(
      (conversation) => Boolean(conversation.participantState.lockedAt) && !conversation.participantState.archivedAt
    );
    const nextArchived = nextArchivedCandidates.filter((conversation) => Boolean(conversation.participantState.archivedAt));
    const allVisible = [...nextConversations, ...nextLocked, ...nextArchived];

    setConversations(nextConversations);
    setLockedConversations(nextLocked);
    setArchivedConversations(nextArchived);
    setActiveConversationId((current) => {
      if (selectConversationId) {
        return selectConversationId;
      }

      if (current && allVisible.some((conversation) => conversation.id === current)) {
        return current;
      }

      return nextConversations[0]?.id ?? nextLocked[0]?.id ?? nextArchived[0]?.id ?? null;
    });
    allVisible.forEach((conversation) => socketRef.current?.emit("join_conversation", conversation.id));
  }

  async function refreshMessageRequests() {
    if (!session?.accessToken) {
      return;
    }

    const nextRequests = await getMessageRequests(session.accessToken);
    setMessageRequests(nextRequests);
  }

  async function refreshNotifications() {
    if (!session?.accessToken) {
      return;
    }

    const nextNotifications = await getNotifications(session.accessToken);
    setNotifications(nextNotifications);
  }

  async function refreshStatusFeed(selectOwnerId?: string | null, selectStatusId?: string | null) {
    if (!session?.accessToken) {
      setStatusFeed(null);
      setActiveStatusThreadId(null);
      setActiveStatusIndex(0);
      setActiveStatusDetail(null);
      return;
    }

    const nextFeed = await getStatusFeed(session.accessToken);
    const nextThreads = nextFeed.mine ? [nextFeed.mine, ...nextFeed.contacts] : nextFeed.contacts;

    setStatusFeed(nextFeed);

    if (!nextThreads.length) {
      setActiveStatusThreadId(null);
      setActiveStatusIndex(0);
      setActiveStatusDetail(null);
      return;
    }

    const preferredOwnerId = selectOwnerId ?? activeStatusThreadId ?? nextThreads[0].owner.id;
    const nextThread = nextThreads.find((thread) => thread.owner.id === preferredOwnerId) ?? nextThreads[0];
    const preferredIndex = selectStatusId ? nextThread.items.findIndex((item) => item.id === selectStatusId) : -1;

    setActiveStatusThreadId(nextThread.owner.id);
    setActiveStatusIndex((current) => {
      if (preferredIndex >= 0) {
        return preferredIndex;
      }

      return Math.min(current, Math.max(nextThread.items.length - 1, 0));
    });
  }

  async function refreshBlockedUsers() {
    if (!session?.accessToken) {
      return;
    }

    const nextBlockedUsers = await getBlockedUsers(session.accessToken);
    setBlockedUsers(nextBlockedUsers);
  }

  function dismissCallToast(toastId: string) {
    setCallToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  function pushCallToast(toast: CallToast, ttlMs = toast.kind === "MISSED" ? 10000 : 14000) {
    setCallToasts((current) => {
      const next = current.filter((item) => item.id !== toast.id);
      return [toast, ...next].slice(0, 4);
    });

    if (ttlMs > 0) {
      window.setTimeout(() => {
        dismissCallToast(toast.id);
      }, ttlMs);
    }
  }

  function openConversationFromSignal(conversationId: string, options?: { openCallSheet?: boolean }) {
    setSidebarMode("CHATS");
    setActivityView("NOTIFICATIONS");
    setIsSidebarOpen(false);
    setActiveConversationId(conversationId);

    if (options?.openCallSheet) {
      setIsCallSheetOpen(true);
    }
  }

  async function resolveRtcConfigForCall() {
    if (!session?.accessToken) {
      return rtcConfig;
    }

    try {
      const nextConfig = await getRtcConfig(session.accessToken);
      const resolved = nextConfig.iceServers.length ? nextConfig : defaultRtcConfig;
      setRtcConfig(resolved);
      return resolved;
    } catch {
      return rtcConfig.iceServers.length ? rtcConfig : defaultRtcConfig;
    }
  }

  function showBrowserNotification(title: string, input: { body: string }) {
    if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") {
      return;
    }

    window.setTimeout(() => {
      new window.Notification(title, {
        body: input.body,
        icon: "/favicon.ico"
      });
    }, 0);
  }

  async function syncBrowserPushSubscription(accessToken: string) {
    if (
      typeof window === "undefined" ||
      !webPushPublicKey ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      window.Notification.permission !== "granted"
    ) {
      return;
    }

    const registration = await navigator.serviceWorker.register("/push-sw.js");
    await registration.update();

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(webPushPublicKey),
        userVisibleOnly: true
      });
    }

    const serialized = subscription.toJSON();
    if (!serialized.endpoint || !serialized.keys?.auth || !serialized.keys?.p256dh) {
      return;
    }

    await registerPushSubscription(
      {
        endpoint: serialized.endpoint,
        keys: {
          auth: serialized.keys.auth,
          p256dh: serialized.keys.p256dh
        },
        userAgent: navigator.userAgent
      },
      accessToken
    );

    pushSubscriptionEndpointRef.current = serialized.endpoint;
  }

  async function removeBrowserPushSubscription(accessToken?: string) {
    if (!accessToken || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const endpoint = pushSubscriptionEndpointRef.current ?? subscription?.endpoint ?? null;

    if (endpoint) {
      await unregisterPushSubscription(endpoint, accessToken).catch(() => undefined);
      pushSubscriptionEndpointRef.current = null;
    }

    await subscription?.unsubscribe().catch(() => undefined);
  }

  async function handleEnableBrowserNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSettingsNotice("Browser notifications are not supported on this device.");
      setBrowserNotificationPermission("unsupported");
      return;
    }

    const result = await window.Notification.requestPermission();
    setBrowserNotificationPermission(result);
    setSettingsNotice(
      result === "granted"
        ? "Browser alerts are enabled for new requests, messages, and calls."
        : "Browser alerts are still off. You can enable them later from the browser prompt."
    );

    if (result === "granted" && session?.accessToken) {
      await syncBrowserPushSubscription(session.accessToken).catch(() => undefined);
    }
  }

  function cleanupCallMedia() {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    pendingIncomingOfferRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsLiveCallOpen(false);
    setCallConnectionState("Idle");
    setIsMuted(false);
    setIsCameraOff(false);
  }

  async function ensureLocalMedia(type: "VOICE" | "VIDEO") {
    if (localStreamRef.current) {
      const hasVideoTrack = localStreamRef.current.getVideoTracks().some((track) => track.readyState === "live");
      if (type === "VOICE" || hasVideoTrack) {
        return localStreamRef.current;
      }

      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "VIDEO"
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsMuted(false);
      setIsCameraOff(type !== "VIDEO");
      return stream;
    } catch (error) {
      const message = describeMediaError(error, type);
      setCallNotice(message);
      throw new Error(message);
    }
  }

  function createPeerConnection(targetUserId: string, conversationId: string, callId: string, config: RtcConfig) {
    const peerConnection = new RTCPeerConnection({
      iceServers: config.iceServers
    });

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remote.getTracks().some((existing) => existing.id === track.id)) {
          remote.addTrack(track);
        }
      });
      setRemoteStream(new MediaStream(remote.getTracks()));
      setCallConnectionState("Connected");
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) {
        return;
      }

      socketRef.current.emit("call_ice_candidate", {
        callId,
        conversationId,
        toUserId: targetUserId,
        candidate: event.candidate.toJSON()
      });
    };

    peerConnection.onconnectionstatechange = () => {
      const nextState = peerConnection.connectionState;
      setCallConnectionState(humanizeConnectionState(nextState));
      if (nextState === "failed" || nextState === "closed" || nextState === "disconnected") {
        setRemoteStream((current) => (current ? new MediaStream(current.getTracks().filter((track) => track.readyState === "live")) : null));
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      const nextState = peerConnection.iceConnectionState;
      if (nextState === "checking") {
        setCallConnectionState("Checking network route");
      }

      if (nextState === "failed") {
        setCallNotice("We could not stabilize the call route. Check the TURN settings and try again.");
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }

  async function startLiveWebRtcCall(call: CallRecord, type: "VOICE" | "VIDEO") {
    const conversationId = call.conversationId;
    const targetUserId = activePartner?.id;
    if (!targetUserId || !socketRef.current) {
      setCallConnectionState("Waiting for signaling");
      setIsLiveCallOpen(true);
      return;
    }

    const config = await resolveRtcConfigForCall();
    const stream = await ensureLocalMedia(type);
    const peerConnection = createPeerConnection(targetUserId, conversationId, call.id, config);
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socketRef.current.emit("call_offer", {
      callId: call.id,
      conversationId,
      toUserId: targetUserId,
      sdp: offer
    });

    setIsLiveCallOpen(true);
    setCallConnectionState("Calling…");
  }

  async function answerIncomingWebRtcCall(call: CallRecord) {
    const pendingOffer = pendingIncomingOfferRef.current;
    const targetUserId = pendingOffer?.fromUserId ?? call.startedBy?.id ?? null;
    if (!pendingOffer || !targetUserId || !socketRef.current) {
      setIsLiveCallOpen(true);
      setCallConnectionState("Connected");
      return;
    }

    const config = await resolveRtcConfigForCall();
    const stream = await ensureLocalMedia(call.type);
    const peerConnection = createPeerConnection(targetUserId, call.conversationId, call.id, config);
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socketRef.current.emit("call_answer", {
      callId: call.id,
      conversationId: call.conversationId,
      toUserId: targetUserId,
      sdp: answer
    });

    pendingIncomingOfferRef.current = null;
    setIsLiveCallOpen(true);
    setCallConnectionState("Connecting…");
  }

  function emitTyping(nextTyping: boolean) {
    if (!socketRef.current || !activeConversationId || !session) {
      return;
    }

    socketRef.current.emit("typing", {
      conversationId: activeConversationId,
      typing: nextTyping
    });
  }

  async function loadOlderMessages() {
    if (!session?.accessToken || !activeConversationId || !nextMessagesCursor || isLoadingOlderMessages) {
      return;
    }

    setIsLoadingOlderMessages(true);

    try {
      const page = await getMessages(activeConversationId, session.accessToken, {
        cursor: nextMessagesCursor
      });
      setMessages((current) => [...page.items, ...current]);
      setNextMessagesCursor(page.nextCursor);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }

  async function handleConversationStateUpdate(
    conversationId: string,
    input: {
      archived?: boolean;
      locked?: boolean;
      pinned?: boolean;
      mutedUntil?: string | null;
    }
  ) {
    if (!session?.accessToken) {
      return;
    }

    const updated = await updateConversationState(conversationId, input, session.accessToken);
    if (input.locked === true) {
      setSidebarMode("VAULT");
      setVaultView("LOCKED");
    }

    if (input.archived === true) {
      setSidebarMode("VAULT");
      setVaultView("ARCHIVED");
    }

    const shouldKeepSelected = !updated.participantState.archivedAt && !updated.participantState.lockedAt;
    await refreshConversations(shouldKeepSelected || input.locked || input.archived ? conversationId : undefined);
  }

  function appendMessage(message: ChatMessage) {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }

      return [...current, message];
    });
  }

  function mergeMessage(message: ChatMessage) {
    setMessages((current) => current.map((item) => (item.id === message.id ? message : item)));
  }

  function mergeCall(call: CallRecord) {
    setCallHistory((current) => mergeCallRecord(current, call));
    setActiveCall((current) => {
      if (!current) {
        return call.status === "RINGING" || call.status === "ANSWERED" ? call : null;
      }

      if (current.id === call.id) {
        return call.status === "MISSED" || call.status === "ENDED" || call.status === "FAILED" ? null : call;
      }

      return current;
    });
  }

  async function uploadConversationAttachment(
    file: File,
    source: "PHOTO" | "VIDEO" | "DOCUMENT" | "CAMERA"
  ) {
    if (!session?.accessToken || !activeConversationId) {
      throw new Error("Choose a conversation before uploading attachments.");
    }

    const metadata = await collectFileMetadata(file);
    const shouldUseCloudinary =
      source === "PHOTO" ||
      source === "VIDEO" ||
      source === "CAMERA" ||
      file.type.startsWith("image/") ||
      file.type.startsWith("video/");

    if (shouldUseCloudinary) {
      const uploaded = await uploadFileToCloudinary(file);
      return {
        ...uploaded,
        width: uploaded.width ?? ("width" in metadata ? metadata.width : undefined),
        height: uploaded.height ?? ("height" in metadata ? metadata.height : undefined),
        durationMs: uploaded.durationMs ?? ("durationMs" in metadata ? metadata.durationMs : undefined)
      } as const;
    }

    const prepared = await prepareAttachmentUpload(
      activeConversationId,
      {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        width: "width" in metadata ? metadata.width : undefined,
        height: "height" in metadata ? metadata.height : undefined,
        durationMs: "durationMs" in metadata ? metadata.durationMs : undefined
      },
      session.accessToken
    );

    await uploadFileToSignedUrl(prepared.uploadUrl, file);

    return {
      provider: prepared.provider,
      storageKey: prepared.storageKey,
      url: prepared.fileUrl,
      mimeType: prepared.mimeType,
      sizeBytes: prepared.sizeBytes,
      width: prepared.width ?? undefined,
      height: prepared.height ?? undefined,
      durationMs: prepared.durationMs ?? undefined
    } as const;
  }

  async function handlePickAttachments(files: FileList | null, source: "PHOTO" | "VIDEO" | "DOCUMENT" | "CAMERA" = "DOCUMENT") {
    if (!files || !files.length || !session?.accessToken || !activeConversationId) {
      return;
    }

    setIsUploadBusy(true);
    setNotice("");

    try {
      const attachments = await Promise.all(
        Array.from(files)
          .slice(0, 6)
          .map((file) => uploadConversationAttachment(file, source))
      );

      const message = await sendAttachmentMessage(
        activeConversationId,
        {
          body: draft.trim() || undefined,
          parentId: replyTarget?.id,
          attachments
        },
        session.accessToken
      );

      appendMessage(message);
      setDraft("");
      setReplyTarget(null);
      setEditingMessageId(null);
      setIsGifPickerOpen(false);
      await refreshConversations(activeConversationId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send those attachments.");
    } finally {
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
      if (documentInputRef.current) {
        documentInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      setIsUploadBusy(false);
    }
  }

  async function handleSendGif(gif: any) {
    if (!session?.accessToken || !activeConversationId) {
      return;
    }

    const original = gif?.images?.original;
    const still = gif?.images?.fixed_width_still;
    if (!original?.url) {
      return;
    }

    try {
      const message = await sendAttachmentMessage(
        activeConversationId,
        {
          body: draft.trim() || undefined,
          parentId: replyTarget?.id,
          attachments: [
            {
              provider: "LOCAL",
              storageKey: `giphy:${gif.id}`,
              url: original.url,
              mimeType: "image/gif",
              sizeBytes: Number(original.size ?? 1),
              width: Number(still?.width ?? original.width ?? 0) || undefined,
              height: Number(still?.height ?? original.height ?? 0) || undefined
            }
          ]
        },
        session.accessToken
      );

      appendMessage(message);
      setDraft("");
      setReplyTarget(null);
      setEditingMessageId(null);
      setIsGifPickerOpen(false);
      await refreshConversations(activeConversationId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send that GIF.");
    }
  }

  function startReply(message: ChatMessage) {
    setReplyTarget(message);
    setEditingMessageId(null);
  }

  function startEditing(message: ChatMessage) {
    setEditingMessageId(message.id);
    setReplyTarget(null);
    setDraft(message.body ?? "");
  }

  async function handleDeleteMessage(messageId: string) {
    if (!session?.accessToken || !activeConversationId) {
      return;
    }

    try {
      const message = await deleteMessage(activeConversationId, messageId, session.accessToken);
      mergeMessage(message);
      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setDraft("");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete that message.");
    }
  }

  async function handleStartCall(type: "VOICE" | "VIDEO") {
    if (!session?.accessToken || !activeConversationId) {
      return;
    }

    try {
      const call = await startCall(activeConversationId, type, session.accessToken);
      mergeCall(call);
      setIsLiveCallOpen(true);
      setCallNotice(`${type === "VOICE" ? "Voice" : "Video"} call started.`);
      dismissCallToast(`missed-${call.id}`);
      socketRef.current?.emit("join_conversation", activeConversationId);
      await startLiveWebRtcCall(call, type);
    } catch (error) {
      setCallNotice(error instanceof Error ? error.message : "Could not start that call.");
      setIsCallSheetOpen(true);
    }
  }

  async function handleAcceptIncomingCall() {
    if (!session?.accessToken || !incomingCall) {
      return;
    }

    try {
      openConversationFromSignal(incomingCall.call.conversationId, { openCallSheet: true });
      const call = await acceptCall(incomingCall.call.id, session.accessToken);
      mergeCall(call);
      dismissCallToast(`incoming-${call.id}`);
      setIncomingCall(null);
      await answerIncomingWebRtcCall(call);
      setCallNotice("Call accepted.");
    } catch (error) {
      setCallNotice(error instanceof Error ? error.message : "Could not accept that call.");
    }
  }

  async function handleEndCall(callId?: string) {
    if (!session?.accessToken) {
      return;
    }

    const targetCall = (callId && callHistory.find((item) => item.id === callId))
      ?? activeCall
      ?? incomingCall?.call
      ?? null;
    if (!targetCall) {
      return;
    }

    try {
      const call = await endCall(targetCall.id, session.accessToken);
      mergeCall(call);
      dismissCallToast(`incoming-${call.id}`);
      setActiveCall((current) => (current?.id === targetCall.id ? null : current));
      setIncomingCall((current) => (current?.call.id === targetCall.id ? null : current));
      setCallNotice("Call ended.");
      cleanupCallMedia();
      if (targetCall.conversationId) {
        socketRef.current?.emit("call_hangup", {
          callId: targetCall.id,
          conversationId: targetCall.conversationId
        });
      }
    } catch (error) {
      setCallNotice(error instanceof Error ? error.message : "Could not end that call.");
    }
  }

  function toggleMuteState() {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const nextMuted = !isMuted;
    audioTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }

  function toggleCameraState() {
    const videoTracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (videoTracks.length === 0) {
      return;
    }

    const nextOff = !isCameraOff;
    videoTracks.forEach((track) => {
      track.enabled = !nextOff;
    });
    setIsCameraOff(nextOff);
  }

  async function handleReviewModerationReport(
    reportId: string,
    input: {
      status?: "OPEN" | "REVIEWED" | "DISMISSED";
      assignedModeratorUserId?: string;
      moderatorNote?: string;
      resolutionNote?: string;
    }
  ) {
    if (!session?.accessToken) {
      return;
    }

    try {
      const updated = await updateModerationReport(reportId, input, session.accessToken);
      setModerationReports((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not update that report.");
    }
  }

  function addComposerParticipant(user: SearchUser) {
    setComposerParticipants((current) => {
      if (current.some((participant) => participant.id === user.id)) {
        return current;
      }

      return [...current, user];
    });
  }

  function removeComposerParticipant(userId: string) {
    setComposerParticipants((current) => current.filter((participant) => participant.id !== userId));
  }

  async function startDirectChat(user: SearchUser) {
    if (!session?.accessToken) {
      return;
    }

    if (user.dmPolicy === "REQUESTS_ONLY") {
      setRequestRecipient(user);
      setRequestDraft("");
      setNotice("");
      return;
    }

    try {
      setNotice("");
      const result = await startDirectAccess(
        {
          recipientUserId: user.id
        },
        session.accessToken
      );
      setSearchQuery("");
      setSearchResults([]);
      setIsSidebarOpen(false);
      setIsComposerOpen(false);

      if (result.kind === "conversation") {
        await refreshConversations(result.conversation.id);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not start that direct chat.");
    }
  }

  async function handleSubmitMessageRequest() {
    if (!session?.accessToken || !requestRecipient) {
      return;
    }

    try {
      const result = await startDirectAccess(
        {
          recipientUserId: requestRecipient.id,
          initialMessage: requestDraft.trim()
        },
        session.accessToken
      );

      if (result.kind === "conversation") {
        setRequestRecipient(null);
        setRequestDraft("");
        setNotice("");
        setSearchQuery("");
        setSearchResults([]);
        await refreshConversations(result.conversation.id);
        return;
      }

      setNotice(`Request sent. We notified ${requestRecipient.displayName} and will deliver your intro when they accept.`);
      setRequestRecipient(null);
      setRequestDraft("");
      setSearchQuery("");
      setSearchResults([]);
      await Promise.all([refreshMessageRequests(), refreshNotifications()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send that request.");
    }
  }

  async function handleAcceptMessageRequest(requestId: string) {
    if (!session?.accessToken) {
      return;
    }

    try {
      const accepted = await acceptMessageRequest(requestId, session.accessToken);
      await Promise.all([refreshMessageRequests(), refreshConversations(accepted.conversation.id), refreshNotifications()]);
      setNotice(`Request accepted. ${accepted.request.requester.displayName} is now in your chats.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not accept that request.");
    }
  }

  async function handleDeclineMessageRequest(requestId: string) {
    if (!session?.accessToken) {
      return;
    }

    try {
      await declineMessageRequest(requestId, session.accessToken);
      await Promise.all([refreshMessageRequests(), refreshNotifications()]);
      setNotice("Request declined.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not decline that request.");
    }
  }

  async function handleMarkNotificationRead(notificationId: string) {
    if (!session?.accessToken) {
      return;
    }

    await markNotificationRead(notificationId, session.accessToken);
    await refreshNotifications();
  }

  async function handleMarkAllNotifications() {
    if (!session?.accessToken) {
      return;
    }

    await markAllNotificationsRead(session.accessToken);
    await refreshNotifications();
  }

  async function handleBlockActiveUser() {
    if (!session?.accessToken || !activePartner) {
      return;
    }

    setIsSafetyBusy(true);

    try {
      await blockUser(activePartner.id, session.accessToken);
      if (activeConversation) {
        await handleConversationStateUpdate(activeConversation.id, {
          archived: true
        });
      }
      await Promise.all([refreshBlockedUsers(), refreshMessageRequests(), refreshNotifications(), refreshConversations()]);
      setIsConversationMenuOpen(false);
      setNotice(`${activePartner.displayName} was blocked and moved out of your main chat lane.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not block that user.");
    } finally {
      setIsSafetyBusy(false);
    }
  }

  async function handleUnblockUser(targetUserId: string, displayName: string) {
    if (!session?.accessToken) {
      return;
    }

    setIsSafetyBusy(true);

    try {
      await unblockUser(targetUserId, session.accessToken);
      await refreshBlockedUsers();
      setNotice(`${displayName} is back in your reachable list.`);
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not unblock that user.");
    } finally {
      setIsSafetyBusy(false);
    }
  }

  async function handleSubmitReport() {
    if (!session?.accessToken || !activePartner || !activeConversation) {
      return;
    }

    setIsSafetyBusy(true);

    try {
      await reportUser(
        {
          targetUserId: activePartner.id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
          conversationId: activeConversation.id
        },
        session.accessToken
      );
      await refreshNotifications();
      setIsReportOpen(false);
      setIsConversationMenuOpen(false);
      setReportDetails("");
      setNotice(`Your report about ${activePartner.displayName} was saved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not submit that report.");
    } finally {
      setIsSafetyBusy(false);
    }
  }

  async function handlePrivacyChange(nextPolicy: PublicUser["dmPolicy"]) {
    if (!session?.accessToken || !session.user) {
      return;
    }

    const updatedUser = await updateMe(
      {
        dmPolicy: nextPolicy
      },
      session.accessToken
    );

    setSession((current) =>
      current
        ? {
            ...current,
            user: updatedUser
          }
        : current
    );
    setSettingsNotice(
      nextPolicy === "REQUESTS_ONLY"
        ? "Privacy is on. New people will send requests instead of landing directly in your inbox."
        : "Privacy is open. People you search for can start direct conversations right away."
    );
  }

  async function handleSaveProfile() {
    if (!session?.accessToken || !session.user) {
      return;
    }

    setIsProfileBusy(true);
    setSettingsNotice("");

    try {
      const updatedUser = await updateMe(
        {
          displayName: profileDraft.displayName,
          avatarUrl: profileDraft.avatarUrl,
          statusMessage: profileDraft.statusMessage,
          bio: profileDraft.bio,
          addressLine1: profileDraft.addressLine1,
          city: profileDraft.city,
          stateRegion: profileDraft.stateRegion,
          countryCode: profileDraft.countryCode,
          latitude: profileDraft.latitude ?? undefined,
          longitude: profileDraft.longitude ?? undefined
        },
        session.accessToken
      );

      setSession((current) =>
        current
          ? {
              ...current,
              user: updatedUser
            }
          : current
      );
      setSettingsNotice("Your profile is updated. Display identity, status line, and address details are all in sync now.");
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not save your profile right now.");
    } finally {
      setIsProfileBusy(false);
    }
  }

  async function handleUploadAvatar(files: FileList | null) {
    if (!files?.length || !session?.accessToken) {
      return;
    }

    setIsAvatarUploading(true);
    setSettingsNotice("");

    try {
      const uploaded = await uploadFileToCloudinary(files[0]);
      const updatedUser = await updateMe(
        {
          avatarUrl: uploaded.url
        },
        session.accessToken
      );
      setProfileDraft((current) => ({
        ...current,
        avatarUrl: uploaded.url
      }));
      setSession((current) =>
        current
          ? {
              ...current,
              user: updatedUser
            }
          : current
      );
      setSettingsNotice("Avatar uploaded and published.");
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not upload that avatar.");
    } finally {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      setIsAvatarUploading(false);
    }
  }

  function openStatusComposer(mode: StatusComposerMode = "TEXT") {
    setStatusComposerMode(mode);
    setStatusDraftText("");
    setStatusDraftCaption("");
    setStatusDraftBackgroundColor("#8d3270");
    setStatusDraftTextColor("#fff6f7");
    setStatusDraftMedia(null);
    setStatusDraftTtlHours(String(statusFeed?.defaultExpiresInHours ?? 24));
    setStatusNotice("");
    setIsStatusComposerOpen(true);
    setSidebarMode("STATUS");
    setIsSidebarOpen(true);
  }

  function selectStatusThread(ownerId: string, statusId?: string) {
    const thread =
      statusThreads.find((item) => item.owner.id === ownerId) ??
      filteredStatusThreads.find((item) => item.owner.id === ownerId) ??
      null;

    if (!thread) {
      return;
    }

    setSidebarMode("STATUS");
    setActiveStatusThreadId(ownerId);
    setActiveStatusIndex(
      statusId ? Math.max(thread.items.findIndex((item) => item.id === statusId), 0) : 0
    );
    setStatusNotice("");
    setIsSidebarOpen(false);
  }

  function stepStatus(direction: "previous" | "next") {
    if (!activeStatusThread) {
      return;
    }

    const currentThreadIndex = statusThreads.findIndex((thread) => thread.owner.id === activeStatusThread.owner.id);
    if (currentThreadIndex < 0) {
      return;
    }

    if (direction === "previous") {
      if (activeStatusIndex > 0) {
        setActiveStatusIndex((current) => Math.max(current - 1, 0));
        return;
      }

      const previousThread = statusThreads[currentThreadIndex - 1];
      if (previousThread) {
        setActiveStatusThreadId(previousThread.owner.id);
        setActiveStatusIndex(Math.max(previousThread.items.length - 1, 0));
      }
      return;
    }

    if (activeStatusIndex < activeStatusThread.items.length - 1) {
      setActiveStatusIndex((current) => current + 1);
      return;
    }

    const nextThread = statusThreads[currentThreadIndex + 1];
    if (nextThread) {
      setActiveStatusThreadId(nextThread.owner.id);
      setActiveStatusIndex(0);
    }
  }

  async function handlePickStatusMedia(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setIsStatusBusy(true);
    setStatusNotice("");

    try {
      const file = files[0];
      if (statusComposerMode === "PHOTO" && !file.type.startsWith("image/")) {
        throw new Error("Pick an image file for photo status.");
      }

      if (statusComposerMode === "VIDEO" && !file.type.startsWith("video/")) {
        throw new Error("Pick a video file for video status.");
      }

      const uploaded = await uploadFileToCloudinary(file);
      setStatusDraftMedia({
        ...uploaded,
        fileName: file.name
      });
      setStatusNotice("Media uploaded. Add a caption if you want, then publish the status.");
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Could not upload that status media.");
    } finally {
      if (statusMediaInputRef.current) {
        statusMediaInputRef.current.value = "";
      }
      setIsStatusBusy(false);
    }
  }

  async function handleCreateStatus() {
    if (!session?.accessToken) {
      return;
    }

    setIsStatusBusy(true);
    setStatusNotice("");

    try {
      const baseHours = Number(statusDraftTtlHours) || statusFeed?.defaultExpiresInHours || 24;
      const nextStatus = await createStatus(
        statusComposerMode === "TEXT"
          ? {
              type: "TEXT",
              text: statusDraftText,
              backgroundColor: statusDraftBackgroundColor,
              textColor: statusDraftTextColor,
              ...(currentUser?.access.isModerator ? { expiresInHours: baseHours } : {})
            }
          : {
              type: statusComposerMode === "PHOTO" ? "IMAGE" : "VIDEO",
              caption: statusDraftCaption,
              media: statusDraftMedia
                ? {
                    provider: statusDraftMedia.provider,
                    storageKey: statusDraftMedia.storageKey,
                    url: statusDraftMedia.url,
                    mimeType: statusDraftMedia.mimeType,
                    sizeBytes: statusDraftMedia.sizeBytes,
                    width: statusDraftMedia.width,
                    height: statusDraftMedia.height,
                    durationMs: statusDraftMedia.durationMs,
                    checksum: statusDraftMedia.checksum
                  }
                : undefined,
              ...(currentUser?.access.isModerator ? { expiresInHours: baseHours } : {})
            },
        session.accessToken
      );

      setIsStatusComposerOpen(false);
      setStatusDraftText("");
      setStatusDraftCaption("");
      setStatusDraftMedia(null);
      setStatusNotice("Status published.");
      setActiveStatusDetail(nextStatus);
      await refreshStatusFeed(currentUser?.id ?? undefined, nextStatus.id);
      setSidebarMode("STATUS");
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Could not publish that status.");
    } finally {
      setIsStatusBusy(false);
    }
  }

  async function handleReactToStatus(emoji: string) {
    if (!session?.accessToken || !activeStatusDetail) {
      return;
    }

    try {
      const nextStatus = await toggleStatusReaction(activeStatusDetail.id, emoji, session.accessToken);
      setActiveStatusDetail(nextStatus);
      await refreshStatusFeed(activeStatusThread?.owner.id ?? undefined, activeStatusDetail.id);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Could not react to that status.");
    }
  }

  async function handleReplyToStatus() {
    if (!session?.accessToken || !activeStatusDetail || !statusReplyDraft.trim()) {
      return;
    }

    setIsStatusBusy(true);
    setStatusNotice("");

    try {
      const nextStatus = await commentOnStatus(activeStatusDetail.id, statusReplyDraft.trim(), session.accessToken);
      setActiveStatusDetail(nextStatus);
      setStatusReplyDraft("");
      setStatusNotice("Reply sent to the status and mirrored into chat.");
      await Promise.all([
        refreshStatusFeed(activeStatusThread?.owner.id ?? undefined, activeStatusDetail.id),
        refreshConversations(activeConversationId ?? undefined),
        refreshNotifications()
      ]);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Could not send that status reply.");
    } finally {
      setIsStatusBusy(false);
    }
  }

  async function handleDeleteCurrentStatus() {
    if (!session?.accessToken || !activeStatusDetail) {
      return;
    }

    setIsStatusBusy(true);
    setStatusNotice("");

    try {
      await deleteStatus(activeStatusDetail.id, session.accessToken);
      setActiveStatusDetail(null);
      setStatusNotice("Status removed.");
      await refreshStatusFeed(currentUser?.id ?? undefined);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Could not remove that status.");
    } finally {
      setIsStatusBusy(false);
    }
  }

  async function handleModerateCurrentStatus(input: { remove?: boolean; expiresInHours?: number; removedReason?: string }) {
    if (!session?.accessToken || !activeStatusDetail) {
      return;
    }

    setIsStatusBusy(true);
    setStatusNotice("");

    try {
      const nextStatus = await moderateStatus(activeStatusDetail.id, input, session.accessToken);
      setActiveStatusDetail(nextStatus);
      setStatusNotice(
        input.remove
          ? "Status removed from the live lane."
          : input.expiresInHours
            ? `Status lifetime updated to ${input.expiresInHours} hours from now.`
            : "Status moderation updated."
      );
      await refreshStatusFeed(activeStatusThread?.owner.id ?? undefined, activeStatusDetail.id);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Could not update that status.");
    } finally {
      setIsStatusBusy(false);
    }
  }

  async function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setSettingsNotice("Current location is not available in this browser.");
      return;
    }

    setIsLocatingProfile(true);
    setSettingsNotice("");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 1000 * 60 * 5
        });
      });

      const resolved = await reverseGeocodeCurrentPosition(
        position.coords.latitude,
        position.coords.longitude
      );

      setProfileDraft((current) => ({
        ...current,
        addressLine1: resolved.addressLine1 ?? current.addressLine1,
        city: resolved.city ?? current.city,
        stateRegion: resolved.stateRegion ?? current.stateRegion,
        countryCode: resolved.countryCode ?? current.countryCode,
        latitude: resolved.latitude,
        longitude: resolved.longitude
      }));
      setSettingsNotice("Current location applied. Review the details, then save your profile.");
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not use your current location right now.");
    } finally {
      setIsLocatingProfile(false);
    }
  }

  async function handleSubmitForwardMessage() {
    if (!session?.accessToken || !forwardMessage || forwardConversationIds.length === 0) {
      return;
    }

    setIsForwardBusy(true);
    setNotice("");

    try {
      await Promise.all(
        forwardConversationIds.map(async (conversationId) => {
          if (forwardMessage.media.length > 0) {
            await sendAttachmentMessage(
              conversationId,
              {
                body: forwardMessage.body?.trim() || undefined,
                attachments: forwardMessage.media.map((asset) => ({
                  provider: asset.provider,
                  storageKey: asset.storageKey,
                  url: asset.url,
                  mimeType: asset.mimeType,
                  sizeBytes: asset.sizeBytes,
                  width: asset.width ?? undefined,
                  height: asset.height ?? undefined,
                  durationMs: asset.durationMs ?? undefined,
                  checksum: asset.checksum ?? undefined
                }))
              },
              session.accessToken
            );
            return;
          }

          if (forwardMessage.body?.trim()) {
            await sendChatMessage(conversationId, forwardMessage.body.trim(), session.accessToken);
          }
        })
      );

      setNotice(`Forwarded to ${forwardConversationIds.length} ${forwardConversationIds.length === 1 ? "chat" : "chats"}.`);
      setForwardMessage(null);
      setForwardConversationIds([]);
      setForwardQuery("");
      await refreshConversations(activeConversationId ?? undefined);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not forward that message.");
    } finally {
      setIsForwardBusy(false);
    }
  }

  async function handleStartPhoneVerification() {
    if (!session?.accessToken) {
      return;
    }

    setIsPhoneBusy(true);
    setSettingsNotice("");

    try {
      const result = await startPhoneVerification(phoneDraft, session.accessToken);
      setPhoneDraft(result.phoneNumber);
      setPhoneCodeSent(true);
      setSettingsNotice("Verification code sent. Enter the SMS code to finish linking this number.");
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not send the phone verification code.");
    } finally {
      setIsPhoneBusy(false);
    }
  }

  async function handleVerifyPhoneCode() {
    if (!session?.accessToken) {
      return;
    }

    setIsPhoneBusy(true);
    setSettingsNotice("");

    try {
      const result = await verifyPhoneNumber(phoneDraft, phoneCode, session.accessToken);
      setSession((current) =>
        current
          ? {
              ...current,
              user: result.user
            }
          : current
      );
      setPhoneCode("");
      setPhoneCodeSent(false);
      setSettingsNotice("Phone verified. You can now sign in with this number and your password.");
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not verify that code.");
    } finally {
      setIsPhoneBusy(false);
    }
  }

  async function handleCreateRoom() {
    if (!session?.accessToken) {
      return;
    }

    if (composerMode !== "DIRECT" && composerParticipants.length === 0) {
      setNotice("Pick at least one person for a group or channel.");
      return;
    }

    if ((composerMode === "GROUP" || composerMode === "CHANNEL") && composerTitle.trim().length < 2) {
      setNotice("Give the room a title first.");
      return;
    }

    try {
      const conversation = await createConversation(
        {
          type: composerMode,
          title: composerMode === "DIRECT" ? composerParticipants[0]?.displayName : composerTitle.trim(),
          participantIds: composerParticipants.map((participant) => participant.id)
        },
        session.accessToken
      );

      setNotice("");
      setComposerParticipants([]);
      setComposerTitle("");
      setSearchQuery("");
      setSearchResults([]);
      setIsSidebarOpen(false);
      setIsComposerOpen(false);
      await refreshConversations(conversation.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create that room.");
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !session?.accessToken || !activeConversationId || isActiveConversationBlocked) {
      return;
    }

    try {
      const message = editingMessageId
        ? await updateMessage(activeConversationId, editingMessageId, body, session.accessToken)
        : await sendChatMessage(activeConversationId, body, session.accessToken, {
            parentId: replyTarget?.id
          });

      if (editingMessageId) {
        mergeMessage(message);
      } else {
        appendMessage(message);
      }
      setDraft("");
      setReplyTarget(null);
      setEditingMessageId(null);
      setTypingUsers({});
      emitTyping(false);
      await refreshConversations(activeConversationId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : editingMessageId ? "Could not update that message." : "Could not send that message.");
    }
  }

  async function handleToggleReaction(messageId: string, emoji: string) {
    if (!session?.accessToken || !activeConversationId) {
      return;
    }

    try {
      const message = await toggleReaction(activeConversationId, messageId, emoji, session.accessToken);
      mergeMessage(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update that reaction.");
    }
  }

  async function handleLogout() {
    await removeBrowserPushSubscription(session?.accessToken).catch(() => undefined);
    await logout(session?.accessToken).catch(() => undefined);
    cleanupCallMedia();
    browserNotificationIdsRef.current = new Set();
    browserNotificationsPrimedRef.current = false;
    setSession(null);
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
  }

  if (booting) {
    return <ChatLoadingScreen />;
  }

  if (!session || !currentUser) {
    return <AuthPanel onSession={setSession} />;
  }

  const viewer = currentUser;
  const activePartner = activeConversation?.type === "DIRECT" ? directPartner(activeConversation, viewer) : null;
  const roomStatusLine = activeConversation
    ? activeConversation.type === "DIRECT" && activePartner
      ? presence[activePartner.id]
        ? "online now"
        : activePartner.lastSeenAt
          ? `last seen ${formatSeenAt(activePartner.lastSeenAt)}`
          : "offline"
      : `${activeMembers.length} participants in ${formatConversationType(activeConversation.type).toLowerCase()}`
    : "Search for someone new or open a recent conversation.";
  const visibleSearchResults = normalizedSearch.length >= 2
    ? searchResults.filter((user) => user.id !== viewer.id)
    : [];
  const statusState = {
    activeDetail: activeStatusDetail,
    activeIndex: activeStatusIndex,
    activeSummary: activeStatusSummary,
    activeThread: activeStatusThread,
    composerMode: statusComposerMode,
    draftBackgroundColor: statusDraftBackgroundColor,
    draftCaption: statusDraftCaption,
    draftMedia: statusDraftMedia,
    draftText: statusDraftText,
    draftTextColor: statusDraftTextColor,
    draftTtlHours: statusDraftTtlHours,
    feed: statusFeed,
    isBusy: isStatusBusy,
    isComposerOpen: isStatusComposerOpen,
    notice: statusNotice,
    replyDraft: statusReplyDraft,
    threads: filteredStatusThreads
  };
  const statusActions = {
    handleCreateStatus,
    handleDeleteCurrentStatus,
    handleModerateCurrentStatus,
    handlePickStatusMedia,
    handleReactToStatus,
    handleReplyToStatus,
    openStatusComposer,
    selectStatusThread,
    setIsStatusComposerOpen,
    setStatusComposerMode,
    setStatusDraftBackgroundColor,
    setStatusDraftCaption,
    setStatusDraftText,
    setStatusDraftTextColor,
    setStatusDraftTtlHours,
    setStatusReplyDraft,
    stepStatus
  };

  return (
    <>
      <CompactChatWorkspace
        activeConversation={activeConversation}
        activePartner={activePartner}
        activeRoomLabel={activeRoomLabel}
        activeTypingUsers={activeTypingUsers}
        attachmentInputRef={attachmentInputRef}
        avatarInputRef={avatarInputRef}
        browserNotificationPermission={browserNotificationPermission}
        chatFilter={chatFilter}
        archivedConversations={filteredArchivedConversations}
        cameraInputRef={cameraInputRef}
        composerMode={composerMode}
        composerParticipants={composerParticipants}
        composerTitle={composerTitle}
        conversations={filteredConversations}
        currentIdentity={currentIdentity}
        draft={draft}
        documentInputRef={documentInputRef}
        emitTyping={emitTyping}
        handleCreateRoom={handleCreateRoom}
        handleAcceptMessageRequest={handleAcceptMessageRequest}
        handleBlockActiveUser={handleBlockActiveUser}
        handleDeleteMessage={handleDeleteMessage}
        handleLogout={handleLogout}
        handleEnableBrowserNotifications={handleEnableBrowserNotifications}
        handleDeclineMessageRequest={handleDeclineMessageRequest}
        handleMarkAllNotifications={handleMarkAllNotifications}
        handleMarkNotificationRead={handleMarkNotificationRead}
        handlePickAttachments={handlePickAttachments}
        handlePrivacyChange={handlePrivacyChange}
        handleSaveProfile={handleSaveProfile}
        handleReviewModerationReport={handleReviewModerationReport}
        handleAcceptIncomingCall={handleAcceptIncomingCall}
        handleEndCall={handleEndCall}
        handleSendGif={handleSendGif}
        handleStartPhoneVerification={handleStartPhoneVerification}
        handleStartCall={handleStartCall}
        handleSubmitReport={handleSubmitReport}
        handleUnblockUser={handleUnblockUser}
        handleUploadAvatar={handleUploadAvatar}
        handleUseCurrentLocation={handleUseCurrentLocation}
        loadOlderMessages={loadOlderMessages}
        notifications={notifications}
        onArchiveConversation={handleConversationStateUpdate}
        handleSendMessage={handleSendMessage}
        handleSubmitMessageRequest={handleSubmitMessageRequest}
        handleToggleReaction={handleToggleReaction}
        handleVerifyPhoneCode={handleVerifyPhoneCode}
        isConversationMenuOpen={isConversationMenuOpen}
        isComposerOpen={isComposerOpen}
        isLoadingOlderMessages={isLoadingOlderMessages}
        isCallSheetOpen={isCallSheetOpen}
        isEmojiPickerOpen={isEmojiPickerOpen}
        isGifLoading={isGifLoading}
        isGifPickerOpen={isGifPickerOpen}
        isModerationBusy={isModerationBusy}
        isModerationOpen={isModerationOpen}
        isPhoneBusy={isPhoneBusy}
        isAvatarUploading={isAvatarUploading}
        isLocatingProfile={isLocatingProfile}
        isProfileBusy={isProfileBusy}
        isReportOpen={isReportOpen}
        isSafetyBusy={isSafetyBusy}
        isSidebarOpen={isSidebarOpen}
        isSettingsOpen={isSettingsOpen}
        isUploadBusy={isUploadBusy}
        activeCall={activeCall}
        blockedUsers={blockedUsers}
        callHistory={callHistory}
        callNotice={callNotice}
        editingMessageId={editingMessageId}
        gifQuery={gifQuery}
        gifResults={gifResults}
        incomingCall={incomingCall}
        lockedConversations={filteredLockedConversations}
        messageRequests={messageRequests}
        messages={messages}
        moderators={moderators}
        moderationReports={moderationReports}
        moderationStatusFilter={moderationStatusFilter}
        nextMessagesCursor={nextMessagesCursor}
        notice={notice}
        onTogglePinConversation={handleConversationStateUpdate}
        openReactionPickerId={openReactionPickerId}
        phoneCode={phoneCode}
        phoneCodeSent={phoneCodeSent}
        phoneDraft={phoneDraft}
        photoInputRef={photoInputRef}
        profileDraft={profileDraft}
        reportDetails={reportDetails}
        reportReason={reportReason}
        requestDraft={requestDraft}
        requestRecipient={requestRecipient}
        replyTarget={replyTarget}
        roomStatusLine={roomStatusLine}
        setActivityView={setActivityView}
        searchQuery={searchQuery}
        setSidebarMode={setSidebarMode}
        setActiveConversationId={setActiveConversationId}
        setChatFilter={setChatFilter}
        setComposerMode={setComposerMode}
        setComposerTitle={setComposerTitle}
        setDraft={setDraft}
        setEditingMessageId={setEditingMessageId}
        setForwardConversationIds={setForwardConversationIds}
        setForwardMessage={setForwardMessage}
        setForwardQuery={setForwardQuery}
        setGifQuery={setGifQuery}
        setIsCallSheetOpen={setIsCallSheetOpen}
        setIsComposerOpen={setIsComposerOpen}
        setIsConversationMenuOpen={setIsConversationMenuOpen}
        setIsEmojiPickerOpen={setIsEmojiPickerOpen}
        setIsGifPickerOpen={setIsGifPickerOpen}
        setIsModerationOpen={setIsModerationOpen}
        setIsReportOpen={setIsReportOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setOpenReactionPickerId={setOpenReactionPickerId}
        setPhoneCode={setPhoneCode}
        setPhoneDraft={setPhoneDraft}
        setProfileDraft={setProfileDraft}
        setReportDetails={setReportDetails}
        setReportReason={setReportReason}
        setReplyTarget={setReplyTarget}
        setRequestDraft={setRequestDraft}
        setRequestRecipient={setRequestRecipient}
        setSearchQuery={setSearchQuery}
        statusActions={statusActions}
        statusMediaInputRef={statusMediaInputRef}
        statusState={statusState}
        setModerationStatusFilter={setModerationStatusFilter}
        setVaultView={setVaultView}
        activityView={activityView}
        sidebarMode={sidebarMode}
        settingsNotice={settingsNotice}
        startDirectChat={startDirectChat}
        typingTimeoutRef={typingTimeoutRef}
        videoInputRef={videoInputRef}
        vaultView={vaultView}
        viewer={viewer}
        visibleSearchResults={visibleSearchResults}
        addComposerParticipant={addComposerParticipant}
        removeComposerParticipant={removeComposerParticipant}
      />
      <ForwardMessageModal
        isBusy={isForwardBusy}
        isOpen={Boolean(forwardMessage)}
        messagePreview={describeMessageForForward(forwardMessage)}
        onClose={() => {
          if (isForwardBusy) {
            return;
          }
          setForwardMessage(null);
          setForwardConversationIds([]);
          setForwardQuery("");
        }}
        onSearchChange={setForwardQuery}
        onSubmit={() => {
          void handleSubmitForwardMessage().catch(() => undefined);
        }}
        onToggleConversation={(conversationId) => {
          setForwardConversationIds((current) =>
            current.includes(conversationId)
              ? current.filter((item) => item !== conversationId)
              : [...current, conversationId]
          );
        }}
        options={forwardOptions}
        searchQuery={forwardQuery}
        selectedConversationIds={forwardConversationIds}
      />
      {isLiveCallOpen && activeCall ? (
        <LiveCallOverlay
          activeCall={activeCall}
          callConnectionState={callConnectionState}
          isCameraOff={isCameraOff}
          isMuted={isMuted}
          localVideoRef={localVideoRef}
          onClose={() => setIsLiveCallOpen(false)}
          onEnd={() => {
            void handleEndCall(activeCall.id).catch(() => undefined);
          }}
          onToggleCamera={toggleCameraState}
          onToggleMute={toggleMuteState}
          remoteAudioRef={remoteAudioRef}
          remoteStream={remoteStream}
          remoteVideoRef={remoteVideoRef}
          viewer={viewer}
        />
      ) : null}
      {callToasts.length > 0 ? (
        <CallToastStack
          items={callToasts}
          onAccept={() => {
            void handleAcceptIncomingCall().catch(() => undefined);
          }}
          onDismiss={dismissCallToast}
          onEnd={(callId) => {
            void handleEndCall(callId).catch(() => undefined);
          }}
          onOpenConversation={(conversationId, openCallSheet) => {
            openConversationFromSignal(conversationId, { openCallSheet });
          }}
        />
      ) : null}
    </>
  );

  /*
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(246,237,206,0.88),rgba(251,250,244,0.78)_38%,rgba(255,255,255,0.96)_74%)] px-3 py-3 text-charcoal sm:px-5 sm:py-5">
      <section className="relative mx-auto flex min-h-[calc(100vh-24px)] max-w-[1320px] overflow-hidden rounded-[32px] border border-charcoal/8 bg-white/88 shadow-[0_32px_120px_rgba(23,22,19,0.12)] backdrop-blur">
        <div
          aria-hidden="true"
          className={`absolute inset-0 z-20 bg-charcoal/18 transition ${isInboxPanelOpen || isDetailsPanelOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => {
            setIsInboxPanelOpen(false);
            setIsDetailsPanelOpen(false);
          }}
        />

        <aside
          className={`absolute inset-y-0 left-0 z-30 flex w-[320px] max-w-[92vw] flex-col border-r border-charcoal/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,245,236,0.96))] shadow-[0_28px_80px_rgba(23,22,19,0.12)] transition-transform duration-300 ${
            isInboxPanelOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <header className="border-b border-charcoal/10 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-charcoal text-cloud shadow-[0_14px_32px_rgba(23,22,19,0.16)]">
                    <MessageSquareText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/60">Omochat</p>
                    <h1 className="font-display mt-1 text-[28px] font-bold leading-none sm:text-[30px]">Inbox</h1>
                  </div>
                </div>
                <p className="mt-4 max-w-xs text-[13px] leading-6 text-graphite/68">
                  Cleaner rooms, lighter chrome, and less noise around the conversation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-11 w-11 place-items-center rounded-full border border-charcoal/12 bg-white/92 text-charcoal transition hover:border-charcoal/20 hover:bg-white"
                  onClick={() => setIsInboxPanelOpen(false)}
                  type="button"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-charcoal/12 bg-white/92 px-4 py-2 text-sm font-semibold text-charcoal transition hover:border-charcoal/20 hover:bg-white"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-[28px] border border-charcoal/10 bg-white/82 p-4 shadow-[0_12px_40px_rgba(23,22,19,0.06)]">
              <div className="flex items-center gap-3">
                {avatarBadge(viewer.displayName, viewer.avatarUrl, "h-14 w-14")}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{viewer.displayName}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-graphite/70">
                    <Mail className="h-4 w-4 shrink-0" />
                    <p className="truncate">{viewer.email}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-charcoal px-3.5 py-2 text-sm font-bold text-cloud">
                  <Sparkles className="h-4 w-4" />
                  {currentIdentity}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-sweet/82 px-3.5 py-2 text-sm font-semibold text-graphite">
                  <CircleUserRound className="h-4 w-4" />@{viewer.username}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-graphite shadow-sm">
                  <Radio className="h-4 w-4 text-green-600" />
                  online
                </span>
              </div>
            </div>
          </header>

          <div className="border-b border-charcoal/10 px-4 py-4">
            <div className="rounded-[28px] border border-charcoal/10 bg-white/86 p-4 shadow-[0_16px_40px_rgba(23,22,19,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">New room</p>
                  <h2 className="font-display mt-2 text-[1.35rem] font-bold">Start without the clutter</h2>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sweet text-charcoal">
                  <Plus className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["DIRECT", "GROUP", "CHANNEL"] as ComposerMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold transition ${
                      composerMode === mode ? "bg-charcoal text-cloud" : "bg-cloud text-graphite hover:bg-sweet/55"
                    }`}
                    onClick={() => setComposerMode(mode)}
                    type="button"
                  >
                    {mode === "DIRECT" ? <UserRound className="h-4 w-4" /> : mode === "GROUP" ? <Users className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                    {mode === "DIRECT" ? "Direct" : mode === "GROUP" ? "Group" : "Channel"}
                  </button>
                ))}
              </div>

              {composerMode !== "DIRECT" ? (
                <input
                  aria-label="Room title"
                  className="mt-4 w-full rounded-2xl border border-charcoal/10 bg-cloud px-4 py-3 text-sm outline-none ring-honey/30 transition focus:ring-4"
                  onChange={(event) => setComposerTitle(event.target.value)}
                  placeholder={composerMode === "GROUP" ? "Group name" : "Channel name"}
                  value={composerTitle}
                />
              ) : null}

              <label className="mt-4 block">
                <span className="sr-only">Search people</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite/45" />
                  <input
                    aria-label="Search people"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-2xl border border-charcoal/10 bg-cloud py-3 pl-11 pr-4 text-sm outline-none ring-honey/30 transition focus:ring-4"
                    placeholder="Search by name, @code, username"
                  />
                </span>
              </label>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-graphite/55">Search results</p>
              {searchResults.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {searchResults.map((user) => (
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl border border-charcoal/8 bg-cloud/95 px-3 py-3 text-left transition hover:border-charcoal/18 hover:bg-white"
                      key={user.id}
                      onClick={() => {
                        if (composerMode === "DIRECT") {
                          void startDirectChat(user).catch(() => setNotice("Could not create that room."));
                          return;
                        }

                        addComposerParticipant(user);
                      }}
                      type="button"
                    >
                      {avatarBadge(user.displayName, user.avatarUrl, "h-10 w-10")}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{user.displayName}</span>
                        <span className="block truncate text-sm text-graphite/68">{formatUserTag(user)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sweet px-2.5 py-1 text-xs font-bold text-graphite">
                        {composerMode === "DIRECT" ? "Open" : "Add"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-charcoal/10 bg-cloud/78 px-4 py-4 text-sm leading-6 text-graphite/72">
                  Search by display name, username, or a short code like <span className="font-bold">@23yg2</span>.
                </div>
              )}
              {composerParticipants.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {composerParticipants.map((participant) => (
                    <button
                      key={participant.id}
                      className="rounded-full bg-sweet/82 px-3 py-2 text-xs font-bold text-graphite transition hover:bg-sweet"
                      onClick={() => removeComposerParticipant(participant.id)}
                      type="button"
                    >
                      {participant.displayName} x
                    </button>
                  ))}
                </div>
              ) : null}
              {composerMode !== "DIRECT" ? (
                <button
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-charcoal px-4 py-3 text-sm font-bold text-cloud transition hover:bg-black"
                  onClick={() => {
                    void handleCreateRoom().catch(() => setNotice("Could not create that room."));
                  }}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Create {composerMode === "GROUP" ? "group" : "channel"}
                </button>
              ) : null}
              {notice ? <p className="mt-4 rounded-2xl bg-blush/80 px-3 py-3 text-sm font-semibold text-graphite">{notice}</p> : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-graphite/50" />
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/60">Recent rooms</p>
              </div>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-graphite shadow-sm">{conversations.length}</span>
            </div>
            {conversations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-charcoal/12 bg-white/74 px-4 py-5 text-sm leading-6 text-graphite/72">
                Your room list will appear here once you start a conversation.
              </div>
            ) : (
              <nav className="space-y-2">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;
                  const label = conversationLabel(conversation, viewer);
                  const other = directPartner(conversation, viewer);
                  const preview = conversationPreview(conversation, viewer);

                  return (
                    <button
                      className={`w-full rounded-[24px] border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-charcoal/80 bg-charcoal text-cloud shadow-[0_18px_40px_rgba(23,22,19,0.18)]"
                          : "border-charcoal/8 bg-white/84 hover:border-charcoal/18 hover:bg-white"
                      }`}
                      key={conversation.id}
                      onClick={() => {
                        setActiveConversationId(conversation.id);
                        setIsInboxPanelOpen(false);
                      }}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        {avatarBadge(label, other?.avatarUrl ?? null, "h-12 w-12")}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-bold">{label}</span>
                              <span className={`mt-1 block truncate text-xs font-semibold ${isActive ? "text-cloud/65" : "text-graphite/55"}`}>
                                {other ? formatUserTag(other) : formatConversationType(conversation.type)}
                              </span>
                            </span>
                            <span className={`shrink-0 text-xs font-semibold ${isActive ? "text-cloud/55" : "text-graphite/50"}`}>
                              {conversation.messages[0]?.createdAt ? formatMessageTime(conversation.messages[0].createdAt) : ""}
                            </span>
                          </span>
                          <span className={`mt-3 block truncate text-sm ${isActive ? "text-cloud/75" : "text-graphite/72"}`}>
                            {preview}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </aside>

        <section className="flex min-h-[72vh] flex-1 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(247,244,236,0.58))]">
          <header className="border-b border-charcoal/10 bg-white/65 px-5 py-5">
            <div className="mx-auto flex w-full max-w-[920px] flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sweet text-charcoal">
                    <MessageSquareText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/58">
                      {activeConversation ? "Active conversation" : "Ready to chat"}
                    </p>
                    <h2 className="font-display mt-1 truncate text-[clamp(1.75rem,3vw,2.2rem)] font-bold leading-tight">
                      {activeRoomLabel ?? `Hey, ${viewer.displayName}`}
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-[13px] leading-6 text-graphite/68">
                  {activeConversation
                    ? `${activeMembers.length} people in this room. ${
                        activeTypingUsers.length > 0
                          ? `${activeTypingUsers.map((user) => user.displayName).join(", ")} typing right now.`
                          : "Delivery stays live across everyone in the thread."
                      }`
                    : status}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/86 px-4 py-2 text-sm font-semibold text-graphite transition hover:border-charcoal/20 hover:bg-white"
                  onClick={() => setIsInboxPanelOpen((current) => !current)}
                  type="button"
                >
                  {isInboxPanelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  Rooms
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/86 px-4 py-2 text-sm font-semibold text-graphite transition hover:border-charcoal/20 hover:bg-white"
                  onClick={() => setIsDetailsPanelOpen((current) => !current)}
                  type="button"
                >
                  {isDetailsPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  Details
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-honey px-4 py-2 text-sm font-bold text-charcoal">
                  <Sparkles className="h-4 w-4" />
                  {currentIdentity}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/84 px-4 py-2 text-sm font-semibold text-graphite">
                  <Users className="h-4 w-4" />
                  {activeConversation ? `${messages.length} messages` : "Ready"}
                </span>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(246,237,206,0.22),rgba(255,255,255,0)_42%)] px-5 py-5">
            <div className="mx-auto w-full max-w-[920px]">
            {!activeConversation ? (
              <div className="grid h-full content-center gap-4">
                <div className="rounded-[30px] border border-charcoal/10 bg-white/76 p-6 shadow-[0_18px_60px_rgba(23,22,19,0.06)]">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/60">Start clean</p>
                  <h3 className="font-display mt-3 max-w-2xl text-[2rem] font-bold leading-tight sm:text-[2.35rem]">Search a person, open a room, and keep the conversation surface calm.</h3>
                  <p className="mt-4 max-w-2xl text-[14px] leading-7 text-graphite/72">
                    New accounts now get a unique tag like <span className="font-bold">@23yg2</span>, so people can find you without needing your full email.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <EmptyFeature label="Clear identity" text="Short codes, usernames, and display names now read like one system." />
                  <EmptyFeature label="Lighter thread view" text="The conversation stays visually dominant instead of being boxed in by side clutter." />
                  <EmptyFeature label="Real icon language" text="Actions, room states, and reactions now use a shared icon library." />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-center">
                  <span className="rounded-full border border-charcoal/8 bg-white/84 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-graphite/60">
                    Today
                  </span>
                </div>
                {messages.map((message) => {
                  const mine = message.sender?.id === viewer.id;
                  const seenText = seenByLine(message, viewer.id);

                  return (
                    <article className={`group flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                      <div className={`flex max-w-[92%] items-end gap-3 md:max-w-[68%] ${mine ? "flex-row-reverse" : ""}`}>
                        {avatarBadge(message.sender?.displayName ?? "Unknown", message.sender?.avatarUrl ?? null, "h-10 w-10")}
                        <div
                          className={`rounded-[28px] border px-4 py-3.5 shadow-[0_12px_30px_rgba(23,22,19,0.06)] ${
                            mine ? "border-charcoal/80 bg-charcoal text-cloud" : "border-white/70 bg-white/94 text-charcoal"
                          }`}
                        >
                          <div className={`flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] ${mine ? "text-cloud/60" : "text-graphite/55"}`}>
                            <span className="rounded-full bg-white/10 px-2.5 py-1">{mine ? "You" : message.sender?.displayName ?? "Unknown"}</span>
                            <span>{message.sender ? formatUserTag(message.sender) : ""}</span>
                          </div>
                          <p className="mt-3 break-words text-[14px] leading-[1.65rem]">{message.body ?? ""}</p>
                          {message.reactions.length > 0 ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              {summarizeReactions(message, viewer.id).map((reaction) => (
                                <ReactionSummaryChip
                                  inverted={mine}
                                  key={`${message.id}-${reaction.emoji}`}
                                  mine={reaction.mine}
                                  onClick={() => {
                                    void handleToggleReaction(message.id, reaction.emoji).catch(() => undefined);
                                  }}
                                  reaction={reaction}
                                />
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="relative">
                              <button
                                aria-label="React to message"
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                  mine
                                    ? "border-white/12 bg-white/8 text-cloud/82 hover:bg-white/14"
                                    : "border-charcoal/8 bg-white text-graphite/72 hover:border-charcoal/20 hover:text-charcoal"
                                }`}
                                onClick={() => {
                                  setOpenReactionPickerId((current) => (current === message.id ? null : message.id));
                                }}
                                type="button"
                              >
                                <SmilePlus className="h-4 w-4" />
                                React
                              </button>
                              {openReactionPickerId === message.id ? (
                                <div
                                  className={`absolute bottom-full z-10 mb-2 flex items-center gap-1 rounded-full border px-2 py-2 shadow-[0_12px_30px_rgba(23,22,19,0.1)] ${
                                    mine
                                      ? "right-0 border-charcoal/20 bg-white text-charcoal"
                                      : "left-0 border-charcoal/10 bg-white text-charcoal"
                                  }`}
                                >
                                  {reactionCatalog.map((reaction) => (
                                    <ReactionToggleButton
                                      inverted={false}
                                      key={`${message.id}-${reaction.emoji}-picker`}
                                      onClick={() => {
                                        setOpenReactionPickerId(null);
                                        void handleToggleReaction(message.id, reaction.emoji).catch(() => undefined);
                                      }}
                                      option={reaction}
                                    />
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-semibold ${mine ? "text-cloud/58" : "text-graphite/50"}`}>
                                {formatMessageTime(message.createdAt)}
                              </p>
                              {mine && seenText ? (
                                <p className={`mt-1 text-[11px] font-semibold ${mine ? "text-cloud/54" : "text-graphite/50"}`}>{seenText}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          <form className="border-t border-charcoal/10 bg-white/76 px-5 py-4" onSubmit={handleSendMessage}>
            <div className="mx-auto flex w-full max-w-[920px] items-end gap-3 rounded-[26px] border border-charcoal/10 bg-cloud/86 p-3 shadow-[0_12px_30px_rgba(23,22,19,0.05)]">
              <label className="flex-1">
                <span className="sr-only">Message</span>
                <textarea
                  aria-label="Message"
                  className="min-h-[76px] w-full resize-none rounded-[22px] border border-charcoal/8 bg-white px-4 py-4 outline-none ring-honey/30 transition focus:ring-4"
                  onBlur={() => emitTyping(false)}
                  onChange={(event) => {
                    const nextDraft = event.target.value;
                    setDraft(nextDraft);

                    if (!activeConversation) {
                      return;
                    }

                    emitTyping(nextDraft.trim().length > 0);
                    if (typingTimeoutRef.current) {
                      window.clearTimeout(typingTimeoutRef.current);
                    }
                    typingTimeoutRef.current = window.setTimeout(() => emitTyping(false), 1200);
                  }}
                  placeholder={activeConversation ? "Write something worth replying to" : "Start a room first"}
                  value={draft}
                  disabled={!activeConversation}
                />
              </label>
              <button
                className="inline-flex items-center gap-2 rounded-[20px] bg-charcoal px-5 py-4 font-bold text-cloud transition hover:bg-black disabled:opacity-50"
                type="submit"
                disabled={!activeConversation}
              >
                <SendHorizontal className="h-4 w-4" />
                Send
              </button>
            </div>
          </form>
        </section>

        <aside
          className={`absolute inset-y-0 right-0 z-30 flex w-[280px] max-w-[88vw] flex-col border-l border-charcoal/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,243,233,0.96))] shadow-[-24px_0_80px_rgba(23,22,19,0.1)] transition-transform duration-300 ${
            isDetailsPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="border-b border-charcoal/10 px-5 py-5">
            <div className="rounded-[28px] border border-charcoal/10 bg-charcoal p-5 text-cloud shadow-[0_24px_60px_rgba(23,22,19,0.18)]">
              <div className="flex items-center justify-between gap-2 text-cloud/72">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.24em]">Room snapshot</p>
                </div>
                <button
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-cloud transition hover:bg-white/16"
                  onClick={() => setIsDetailsPanelOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-display mt-3 text-[24px] font-bold leading-tight">{activeRoomLabel ?? "No room selected"}</h3>
              <p className="mt-3 text-[13px] leading-6 text-cloud/74">
                {activeConversation
                  ? "Messages, reactions, and participants stay live in one calmer workspace."
                  : "Pick a room from the left, or search for someone new to start chatting."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-cloud">
                  <Hash className="h-3.5 w-3.5" />
                  {activeRoomType ?? "Inbox"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-cloud">
                  <Users className="h-3.5 w-3.5" />
                  {activeConversation ? `${activeMembers.length} participants` : "No active room"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-charcoal/10 px-5 py-5">
            <div className="grid gap-3">
              <DetailStatCard description="Short identity people can use to find you fast." icon={Sparkles} label="Handle" value={currentIdentity} />
              <DetailStatCard description="Account username for login and profile references." icon={CircleUserRound} label="Username" value={`@${viewer.username}`} />
              <DetailStatCard description="Current websocket endpoint powering live delivery." icon={Radio} label="Server" value={status.replace("Live on ", "")} />
            </div>
          </div>

          <div className="border-b border-charcoal/10 px-5 py-5">
            <div className="rounded-[24px] border border-charcoal/10 bg-white/84 p-4">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-graphite/58" />
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">Why this room?</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-graphite/74">{activeRoomPreview}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-graphite/58" />
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite">People here</p>
            </div>
            <div className="mt-3 space-y-3">
              {activeMembers.length === 0 ? (
                <div className="rounded-[24px] border border-charcoal/8 bg-white/74 px-4 py-4 text-sm leading-6 text-graphite/72">
                  Room participants will appear here once you open a conversation.
                </div>
              ) : (
                activeMembers.map((member) => (
                  <div className="flex items-center gap-3 rounded-[24px] border border-charcoal/8 bg-white/84 px-3 py-3" key={member.id}>
                    <div className="relative">
                      {avatarBadge(member.displayName, member.avatarUrl, "h-11 w-11")}
                      <PresenceStatusDot online={Boolean(presence[member.id])} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{member.displayName}</p>
                      <p className="truncate text-sm text-graphite/70">
                        {formatUserTag(member)} {presence[member.id] ? "online" : "offline"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
  */
}

type StatusThreadRecord = NonNullable<StatusFeed["mine"]>;
type StatusSummaryRecord = StatusThreadRecord["items"][number];

type StatusLaneState = {
  activeDetail: StatusDetail | null;
  activeIndex: number;
  activeSummary: StatusSummaryRecord | null;
  activeThread: StatusThreadRecord | null;
  composerMode: StatusComposerMode;
  draftBackgroundColor: string;
  draftCaption: string;
  draftMedia: StatusDraftMedia | null;
  draftText: string;
  draftTextColor: string;
  draftTtlHours: string;
  feed: StatusFeed | null;
  isBusy: boolean;
  isComposerOpen: boolean;
  notice: string;
  replyDraft: string;
  threads: StatusThreadRecord[];
};

type StatusLaneActions = {
  handleCreateStatus: () => Promise<void>;
  handleDeleteCurrentStatus: () => Promise<void>;
  handleModerateCurrentStatus: (input: { remove?: boolean; expiresInHours?: number; removedReason?: string }) => Promise<void>;
  handlePickStatusMedia: (files: FileList | null) => Promise<void>;
  handleReactToStatus: (emoji: string) => Promise<void>;
  handleReplyToStatus: () => Promise<void>;
  openStatusComposer: (mode?: StatusComposerMode) => void;
  selectStatusThread: (ownerId: string, statusId?: string) => void;
  setIsStatusComposerOpen: (value: boolean) => void;
  setStatusComposerMode: (value: StatusComposerMode) => void;
  setStatusDraftBackgroundColor: (value: string) => void;
  setStatusDraftCaption: (value: string) => void;
  setStatusDraftText: (value: string) => void;
  setStatusDraftTextColor: (value: string) => void;
  setStatusDraftTtlHours: (value: string) => void;
  setStatusReplyDraft: (value: string) => void;
  stepStatus: (direction: "previous" | "next") => void;
};

type CompactChatWorkspaceProps = {
  activeConversation: Conversation | null;
  activePartner: Conversation["participants"][number]["user"] | null;
  activeRoomLabel: string | null;
  activeTypingUsers: Array<SearchUser | PublicUser>;
  addComposerParticipant: (user: SearchUser) => void;
  attachmentInputRef: React.RefObject<HTMLInputElement | null>;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  activityView: ActivityView;
  archivedConversations: Conversation[];
  browserNotificationPermission: NotificationPermission | "unsupported";
  blockedUsers: BlockedUser[];
  chatFilter: ChatFilter;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  composerMode: ComposerMode;
  composerParticipants: SearchUser[];
  composerTitle: string;
  conversations: Conversation[];
  currentIdentity: string;
  draft: string;
  documentInputRef: React.RefObject<HTMLInputElement | null>;
  emitTyping: (nextTyping: boolean) => void;
  handleCreateRoom: () => Promise<void>;
  handleAcceptMessageRequest: (requestId: string) => Promise<void>;
  handleAcceptIncomingCall: () => Promise<void>;
  handleBlockActiveUser: () => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleDeclineMessageRequest: (requestId: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleEnableBrowserNotifications: () => Promise<void>;
  handleMarkAllNotifications: () => Promise<void>;
  handleMarkNotificationRead: (notificationId: string) => Promise<void>;
  handlePickAttachments: (files: FileList | null, source?: "PHOTO" | "VIDEO" | "DOCUMENT" | "CAMERA") => Promise<void>;
  handlePrivacyChange: (nextPolicy: PublicUser["dmPolicy"]) => Promise<void>;
  handleSaveProfile: () => Promise<void>;
  handleReviewModerationReport: (
    reportId: string,
    input: {
      status?: "OPEN" | "REVIEWED" | "DISMISSED";
      assignedModeratorUserId?: string;
      moderatorNote?: string;
      resolutionNote?: string;
    }
  ) => Promise<void>;
  handleEndCall: (callId?: string) => Promise<void>;
  handleSendGif: (gif: any) => Promise<void>;
  handleStartPhoneVerification: () => Promise<void>;
  handleStartCall: (type: "VOICE" | "VIDEO") => Promise<void>;
  handleSubmitReport: () => Promise<void>;
  handleUnblockUser: (targetUserId: string, displayName: string) => Promise<void>;
  handleUploadAvatar: (files: FileList | null) => Promise<void>;
  handleUseCurrentLocation: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  onArchiveConversation: (conversationId: string, input: { archived?: boolean; locked?: boolean; pinned?: boolean; mutedUntil?: string | null }) => Promise<void>;
  onTogglePinConversation: (conversationId: string, input: { archived?: boolean; locked?: boolean; pinned?: boolean; mutedUntil?: string | null }) => Promise<void>;
  handleSendMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleSubmitMessageRequest: () => Promise<void>;
  handleToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  handleVerifyPhoneCode: () => Promise<void>;
  isConversationMenuOpen: boolean;
  isComposerOpen: boolean;
  isCallSheetOpen: boolean;
  isEmojiPickerOpen: boolean;
  isGifLoading: boolean;
  isGifPickerOpen: boolean;
  isLoadingOlderMessages: boolean;
  isModerationBusy: boolean;
  isModerationOpen: boolean;
  isAvatarUploading: boolean;
  isLocatingProfile: boolean;
  isPhoneBusy: boolean;
  isProfileBusy: boolean;
  isReportOpen: boolean;
  isSafetyBusy: boolean;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  isUploadBusy: boolean;
  activeCall: CallRecord | null;
  lockedConversations: Conversation[];
  callHistory: CallRecord[];
  callNotice: string;
  editingMessageId: string | null;
  gifQuery: string;
  gifResults: any[];
  incomingCall: { call: CallRecord; fromUserId?: string | null } | null;
  messageRequests: {
    incoming: DirectMessageRequest[];
    outgoing: DirectMessageRequest[];
  };
  messages: ChatMessage[];
  moderators: ModeratorSummary[];
  moderationReports: ModerationReport[];
  moderationStatusFilter: "ALL" | "OPEN" | "REVIEWED" | "DISMISSED";
  nextMessagesCursor: string | null;
  notice: string;
  notifications: {
    items: NotificationItem[];
    unreadCount: number;
  };
  openReactionPickerId: string | null;
  phoneCode: string;
  phoneCodeSent: boolean;
  phoneDraft: string;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  profileDraft: {
    displayName: string;
    statusMessage: string;
    bio: string;
    addressLine1: string;
    city: string;
    stateRegion: string;
    countryCode: string;
    avatarUrl: string;
    latitude: number | null;
    longitude: number | null;
  };
  reportDetails: string;
  reportReason: string;
  requestDraft: string;
  requestRecipient: SearchUser | null;
  replyTarget: ChatMessage | null;
  removeComposerParticipant: (userId: string) => void;
  roomStatusLine: string;
  searchQuery: string;
  setActivityView: (value: ActivityView) => void;
  setSidebarMode: (value: SidebarMode) => void;
  setActiveConversationId: (value: string) => void;
  setChatFilter: (value: ChatFilter) => void;
  setComposerMode: (value: ComposerMode) => void;
  setComposerTitle: (value: string) => void;
  setDraft: (value: string) => void;
  setEditingMessageId: (value: string | null) => void;
  setForwardConversationIds: React.Dispatch<React.SetStateAction<string[]>>;
  setForwardMessage: (value: ChatMessage | null) => void;
  setForwardQuery: (value: string) => void;
  setGifQuery: (value: string) => void;
  setIsCallSheetOpen: (value: boolean) => void;
  setIsComposerOpen: (value: boolean) => void;
  setIsConversationMenuOpen: (value: boolean) => void;
  setIsEmojiPickerOpen: (value: boolean) => void;
  setIsGifPickerOpen: (value: boolean) => void;
  setIsModerationOpen: (value: boolean) => void;
  setIsReportOpen: (value: boolean) => void;
  setIsSettingsOpen: (value: boolean) => void;
  setIsSidebarOpen: (value: boolean) => void;
  setOpenReactionPickerId: (value: string | null) => void;
  setPhoneCode: (value: string) => void;
  setPhoneDraft: (value: string) => void;
  setProfileDraft: React.Dispatch<
    React.SetStateAction<{
      displayName: string;
      statusMessage: string;
      bio: string;
      addressLine1: string;
      city: string;
      stateRegion: string;
      countryCode: string;
      avatarUrl: string;
      latitude: number | null;
      longitude: number | null;
    }>
  >;
  setReportDetails: (value: string) => void;
  setReportReason: (value: string) => void;
  setReplyTarget: (value: ChatMessage | null) => void;
  setRequestDraft: (value: string) => void;
  setRequestRecipient: (value: SearchUser | null) => void;
  setSearchQuery: (value: string) => void;
  statusActions: StatusLaneActions;
  statusMediaInputRef: React.RefObject<HTMLInputElement | null>;
  statusState: StatusLaneState;
  setModerationStatusFilter: (value: "ALL" | "OPEN" | "REVIEWED" | "DISMISSED") => void;
  setVaultView: (value: VaultView) => void;
  sidebarMode: SidebarMode;
  settingsNotice: string;
  startDirectChat: (user: SearchUser) => Promise<void>;
  typingTimeoutRef: { current: number | null };
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  vaultView: VaultView;
  viewer: PublicUser;
  visibleSearchResults: SearchUser[];
};

function CompactChatWorkspace({
  activeConversation,
  activePartner,
  activeRoomLabel,
  activeTypingUsers,
  addComposerParticipant,
  attachmentInputRef,
  avatarInputRef,
  activityView,
  archivedConversations,
  browserNotificationPermission,
  blockedUsers,
  chatFilter,
  cameraInputRef,
  composerMode,
  composerParticipants,
  composerTitle,
  conversations,
  currentIdentity,
  draft,
  documentInputRef,
  emitTyping,
  handleCreateRoom,
  handleAcceptMessageRequest,
  handleAcceptIncomingCall,
  handleBlockActiveUser,
  handleDeleteMessage,
  handleDeclineMessageRequest,
  handleEnableBrowserNotifications,
  handleLogout,
  handleMarkAllNotifications,
  handleMarkNotificationRead,
  handlePickAttachments,
  handlePrivacyChange,
  handleSaveProfile,
  handleReviewModerationReport,
  handleEndCall,
  handleSendGif,
  handleStartPhoneVerification,
  handleStartCall,
  handleSubmitReport,
  handleUnblockUser,
  handleUploadAvatar,
  handleUseCurrentLocation,
  loadOlderMessages,
  onArchiveConversation,
  onTogglePinConversation,
  handleSendMessage,
  handleSubmitMessageRequest,
  handleToggleReaction,
  handleVerifyPhoneCode,
  isConversationMenuOpen,
  isComposerOpen,
  isCallSheetOpen,
  isEmojiPickerOpen,
  isGifLoading,
  isGifPickerOpen,
  isLoadingOlderMessages,
  isModerationBusy,
  isModerationOpen,
  isAvatarUploading,
  isLocatingProfile,
  isPhoneBusy,
  isProfileBusy,
  isReportOpen,
  isSafetyBusy,
  isSidebarOpen,
  isSettingsOpen,
  isUploadBusy,
  activeCall,
  lockedConversations,
  callHistory,
  callNotice,
  editingMessageId,
  gifQuery,
  gifResults,
  incomingCall,
  messageRequests,
  messages,
  moderators,
  moderationReports,
  moderationStatusFilter,
  nextMessagesCursor,
  notice,
  notifications,
  openReactionPickerId,
  phoneCode,
  phoneCodeSent,
  phoneDraft,
  photoInputRef,
  profileDraft,
  reportDetails,
  reportReason,
  requestDraft,
  requestRecipient,
  replyTarget,
  removeComposerParticipant,
  roomStatusLine,
  searchQuery,
  setActivityView,
  setSidebarMode,
  setActiveConversationId,
  setChatFilter,
  setComposerMode,
  setComposerTitle,
  setDraft,
  setEditingMessageId,
  setForwardConversationIds,
  setForwardMessage,
  setForwardQuery,
  setGifQuery,
  setIsCallSheetOpen,
  setIsComposerOpen,
  setIsConversationMenuOpen,
  setIsEmojiPickerOpen,
  setIsGifPickerOpen,
  setIsModerationOpen,
  setIsReportOpen,
  setIsSettingsOpen,
  setIsSidebarOpen,
  setOpenReactionPickerId,
  setPhoneCode,
  setPhoneDraft,
  setProfileDraft,
  setReportDetails,
  setReportReason,
  setReplyTarget,
  setRequestDraft,
  setRequestRecipient,
  setSearchQuery,
  statusActions,
  statusMediaInputRef,
  statusState,
  setModerationStatusFilter,
  setVaultView,
  sidebarMode,
  settingsNotice,
  startDirectChat,
  typingTimeoutRef,
  videoInputRef,
  vaultView,
  viewer,
  visibleSearchResults
}: CompactChatWorkspaceProps) {
  const {
    activeDetail: activeStatusDetail,
    activeIndex: activeStatusIndex,
    activeSummary: activeStatusSummary,
    activeThread: activeStatusThread,
    composerMode: statusComposerMode,
    draftBackgroundColor: statusDraftBackgroundColor,
    draftCaption: statusDraftCaption,
    draftMedia: statusDraftMedia,
    draftText: statusDraftText,
    draftTextColor: statusDraftTextColor,
    draftTtlHours: statusDraftTtlHours,
    feed: statusFeed,
    isBusy: isStatusBusy,
    isComposerOpen: isStatusComposerOpen,
    notice: statusNotice,
    replyDraft: statusReplyDraft,
    threads: statusThreads
  } = statusState;
  const {
    handleCreateStatus,
    handleDeleteCurrentStatus,
    handleModerateCurrentStatus,
    handlePickStatusMedia,
    handleReactToStatus,
    handleReplyToStatus,
    openStatusComposer,
    selectStatusThread,
    setIsStatusComposerOpen,
    setStatusComposerMode,
    setStatusDraftBackgroundColor,
    setStatusDraftCaption,
    setStatusDraftText,
    setStatusDraftTextColor,
    setStatusDraftTtlHours,
    setStatusReplyDraft,
    stepStatus
  } = statusActions;
  const unreadChatsCount = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);
  const statusCount =
    (statusFeed?.mine?.items.length ?? 0) +
    (statusFeed?.contacts.reduce((sum, thread) => sum + thread.items.length, 0) ?? 0);
  const pendingRequestCount = messageRequests.incoming.length;
  const notificationUnreadCount = notifications.unreadCount;
  const activityCount = pendingRequestCount + notificationUnreadCount;
  const vaultCount = lockedConversations.length + archivedConversations.length;
  const sidebarTitle =
    sidebarMode === "REQUESTS" ? "Activity" : sidebarMode === "VAULT" ? "Vault" : sidebarMode === "STATUS" ? "Status" : "Chats";
  const sidebarSubtitle =
    sidebarMode === "REQUESTS"
      ? "Requests and notifications stay in one review lane."
      : sidebarMode === "STATUS"
        ? "Photos, videos, and quick text moments that roll off on their own."
      : sidebarMode === "VAULT"
        ? "Locked and archived chats stay out of the main inbox."
        : "Search, start a room, and keep the thread list light.";
  const sidebarConversations =
    sidebarMode === "VAULT"
      ? vaultView === "LOCKED"
        ? lockedConversations
        : archivedConversations
      : conversations;
  const vaultLabel = vaultView === "LOCKED" ? "locked" : "archived";
  const [moderationDrafts, setModerationDrafts] = useState<
    Record<
      string,
      {
        assignedModeratorUserId: string;
        moderatorNote: string;
        resolutionNote: string;
      }
    >
  >({});
  const activeRelationship = activeConversation?.relationshipState ?? {
    blockedByMe: false,
    blockedMe: false
  };
  const isDirectConversationBlocked = activeRelationship.blockedByMe || activeRelationship.blockedMe;
  const isViewingStatuses = sidebarMode === "STATUS";
  const statusExpiresLabel = activeStatusDetail
    ? new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric"
      }).format(new Date(activeStatusDetail.expiresAt))
    : "";
  const isStatusOwner = activeStatusDetail?.owner.id === viewer.id;
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [isComposerToolsOpen, setIsComposerToolsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("profile");
  const settingsSections = useMemo(
    () =>
      [
        {
          id: "profile",
          label: "Profile",
          description: "Display identity, status line, and editable address details.",
          icon: CircleUserRound
        },
        {
          id: "reachability",
          label: "Reachability",
          description: "Privacy, inbox routing, and message requests.",
          icon: Lock
        },
        {
          id: "phone",
          label: "Phone login",
          description: "Verify and manage your portable sign-in number.",
          icon: Phone
        },
        {
          id: "alerts",
          label: "Alerts",
          description: "Browser notifications and activity visibility.",
          icon: BellRing
        },
        {
          id: "blocked",
          label: "Blocked people",
          description: "Restore or review your blocked direct contacts.",
          icon: ShieldBan
        },
        ...(viewer.access.isModerator
          ? [
              {
                id: "moderation" as const,
                label: "Moderation",
                description: "Open the safety desk and review trust events.",
                icon: ShieldAlert
              }
            ]
          : [])
      ] satisfies { id: SettingsView; label: string; description: string; icon: LucideIcon }[],
    [viewer.access.isModerator]
  );
  const notificationStatusLabel =
    browserNotificationPermission === "granted"
      ? "Enabled"
      : browserNotificationPermission === "denied"
        ? "Blocked in browser"
        : browserNotificationPermission === "unsupported"
          ? "Not supported"
        : "Not enabled";
  const selectedComposerParticipantIds = new Set(composerParticipants.map((participant) => participant.id));
  const countryOptions = useMemo(() => Country.getAllCountries(), []);
  const stateOptions = useMemo(
    () => (profileDraft.countryCode ? State.getStatesOfCountry(profileDraft.countryCode) : []),
    [profileDraft.countryCode]
  );
  const selectedStateOption =
    stateOptions.find(
      (state) =>
        state.name.toLowerCase() === profileDraft.stateRegion.trim().toLowerCase() ||
        state.isoCode.toLowerCase() === profileDraft.stateRegion.trim().toLowerCase()
    ) ?? null;
  const cityOptions = useMemo(() => {
    if (!profileDraft.countryCode || !selectedStateOption) {
      return [];
    }

    return City.getCitiesOfState(profileDraft.countryCode, selectedStateOption.isoCode);
  }, [profileDraft.countryCode, selectedStateOption]);

  useEffect(() => {
    setOpenMessageMenuId(null);
    setOpenReactionPickerId(null);
    setIsComposerToolsOpen(false);
  }, [activeConversation?.id, setOpenReactionPickerId]);

  function getModerationDraft(report: ModerationReport) {
    return (
      moderationDrafts[report.id] ?? {
        assignedModeratorUserId: report.assignedModerator?.id ?? "",
        moderatorNote: report.moderatorNote ?? "",
        resolutionNote: report.resolutionNote ?? ""
      }
    );
  }

  function updateModerationDraft(
    reportId: string,
    patch: Partial<{
      assignedModeratorUserId: string;
      moderatorNote: string;
      resolutionNote: string;
    }>
  ) {
    setModerationDrafts((current) => {
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

  return (
    <main className="min-h-screen bg-[#e8ddca] text-charcoal">
      <section className="relative flex min-h-screen overflow-hidden bg-[#f8f5ef]">
        <div
          aria-hidden="true"
          className={`absolute inset-0 z-20 bg-charcoal/20 transition lg:hidden ${isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        <aside className="hidden w-[72px] flex-col items-center justify-between border-r border-charcoal/10 bg-[#f3ede1] py-4 lg:flex">
          <div className="flex w-full flex-col items-center gap-3">
            <button
              className={`relative grid h-11 w-11 place-items-center rounded-2xl transition ${
                sidebarMode === "CHATS"
                  ? "bg-charcoal text-cloud shadow-[0_16px_24px_rgba(24,18,15,0.18)]"
                  : "text-graphite/70 hover:bg-white hover:text-charcoal"
              }`}
              onClick={() => {
                setSidebarMode("CHATS");
                setIsSidebarOpen(true);
              }}
              type="button"
            >
              <MessageSquareText className="h-5 w-5" />
              {unreadChatsCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#20c15a] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
                </span>
              ) : null}
            </button>
            <button
              className={`relative grid h-11 w-11 place-items-center rounded-2xl transition ${
                sidebarMode === "REQUESTS"
                  ? "bg-charcoal text-cloud shadow-[0_16px_24px_rgba(24,18,15,0.18)]"
                  : "text-graphite/70 hover:bg-white hover:text-charcoal"
              }`}
              onClick={() => {
                setSidebarMode("REQUESTS");
                setActivityView("REQUESTS");
                setIsSidebarOpen(true);
              }}
              type="button"
            >
              <Bell className="h-5 w-5" />
              {activityCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#20c15a] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activityCount > 9 ? "9+" : activityCount}
                </span>
              ) : null}
            </button>
            <button
              className={`relative grid h-11 w-11 place-items-center rounded-2xl transition ${
                sidebarMode === "STATUS"
                  ? "bg-charcoal text-cloud shadow-[0_16px_24px_rgba(24,18,15,0.18)]"
                  : "text-graphite/70 hover:bg-white hover:text-charcoal"
              }`}
              onClick={() => {
                setSidebarMode("STATUS");
                setIsSidebarOpen(true);
              }}
              type="button"
            >
              <Sparkles className="h-5 w-5" />
              {statusCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#d98ad1] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {statusCount > 9 ? "9+" : statusCount}
                </span>
              ) : null}
            </button>
            <button
              className={`relative grid h-11 w-11 place-items-center rounded-2xl transition ${
                sidebarMode === "VAULT"
                  ? "bg-charcoal text-cloud shadow-[0_16px_24px_rgba(24,18,15,0.18)]"
                  : "text-graphite/70 hover:bg-white hover:text-charcoal"
              }`}
              onClick={() => {
                setSidebarMode("VAULT");
                setVaultView("LOCKED");
                setIsSidebarOpen(true);
              }}
              type="button"
            >
              <Lock className="h-5 w-5" />
              {vaultCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#d9b870] px-1.5 py-0.5 text-[10px] font-bold text-charcoal">
                  {vaultCount > 9 ? "9+" : vaultCount}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flex w-full flex-col items-center gap-3">
            <button
              className="grid h-11 w-11 place-items-center rounded-2xl text-graphite/70 transition hover:bg-white hover:text-charcoal"
              onClick={() => setIsSettingsOpen(true)}
              type="button"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              className="grid h-11 w-11 place-items-center rounded-2xl text-graphite/70 transition hover:bg-white hover:text-charcoal"
              onClick={() => {
                void handleLogout().catch(() => undefined);
              }}
              type="button"
            >
              <LogOut className="h-5 w-5" />
            </button>
            {avatarBadge(viewer.displayName, viewer.avatarUrl, "h-11 w-11")}
          </div>
        </aside>

        <aside
          className={`absolute inset-y-0 left-0 z-30 flex w-[344px] max-w-[90vw] flex-col border-r border-charcoal/10 bg-[#f8f5ef] transition-transform duration-300 lg:static lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <header className="border-b border-charcoal/10 px-4 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-[1.65rem] font-semibold leading-none">{sidebarTitle}</h1>
                <p className="mt-1 text-xs text-graphite/60">{sidebarSubtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                {sidebarMode === "CHATS" ? (
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    onClick={() => setIsComposerOpen(!isComposerOpen)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : null}
                {sidebarMode === "STATUS" ? (
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    onClick={() => openStatusComposer("TEXT")}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20 lg:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                  type="button"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {sidebarMode !== "REQUESTS" ? (
              <label className="mt-4 block">
                <span className="sr-only">Search chats</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite/45" />
                  <input
                    aria-label="Search chats"
                    className="w-full rounded-full border border-charcoal/8 bg-[#f1ede6] py-3 pl-11 pr-4 text-sm outline-none ring-honey/20 transition focus:border-charcoal/15 focus:ring-4"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={
                      sidebarMode === "VAULT"
                        ? "Search locked or archived chats"
                        : sidebarMode === "STATUS"
                          ? "Search status by name, @code, or caption"
                        : "Search name, @code, username, phone, or start a new chat"
                    }
                    value={searchQuery}
                  />
                </span>
              </label>
            ) : null}

            {sidebarMode === "CHATS" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["ALL", "All"],
                  ["UNREAD", "Unread"],
                  ["DIRECT", "Direct"],
                  ["GROUP", "Groups"],
                  ["CHANNEL", "Channels"]
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      chatFilter === value
                        ? "border-charcoal/15 bg-white text-charcoal"
                        : "border-charcoal/10 bg-transparent text-graphite/72 hover:bg-white"
                    }`}
                    onClick={() => setChatFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {sidebarMode === "REQUESTS" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["REQUESTS", `Requests (${messageRequests.incoming.length})`],
                  ["NOTIFICATIONS", `Notifications (${notifications.unreadCount})`]
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      activityView === value
                        ? "border-charcoal/15 bg-white text-charcoal"
                        : "border-charcoal/10 bg-transparent text-graphite/72 hover:bg-white"
                    }`}
                    onClick={() => setActivityView(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {sidebarMode === "VAULT" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["LOCKED", `Locked (${lockedConversations.length})`],
                  ["ARCHIVED", `Archived (${archivedConversations.length})`]
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      vaultView === value
                        ? "border-charcoal/15 bg-white text-charcoal"
                        : "border-charcoal/10 bg-transparent text-graphite/72 hover:bg-white"
                    }`}
                    onClick={() => setVaultView(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </header>

          {sidebarMode === "CHATS" && isComposerOpen ? (
            <div className="border-b border-charcoal/10 px-4 py-4">
              <div className="rounded-[28px] border border-charcoal/10 bg-white p-4 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">New room</p>
                    <p className="mt-1 text-sm text-graphite/68">Start direct first. Add groups and channels later when they are needed.</p>
                  </div>
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-[#f3ede1] text-charcoal" onClick={() => setIsComposerOpen(false)} type="button">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(["DIRECT", "GROUP", "CHANNEL"] as ComposerMode[]).map((mode) => (
                    <button
                      key={mode}
                      className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                        composerMode === mode
                          ? "bg-charcoal text-cloud"
                          : "bg-[#f6f1e8] text-graphite hover:bg-[#efe6d7]"
                      }`}
                      onClick={() => setComposerMode(mode)}
                      type="button"
                    >
                      {mode === "DIRECT" ? <UserRound className="h-4 w-4" /> : mode === "GROUP" ? <Users className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                      {mode === "DIRECT" ? "Direct" : mode === "GROUP" ? "Group" : "Channel"}
                    </button>
                  ))}
                </div>

                {composerMode !== "DIRECT" ? (
                  <input
                    aria-label="Room title"
                    className="mt-4 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                    onChange={(event) => setComposerTitle(event.target.value)}
                    placeholder={composerMode === "GROUP" ? "Group name" : "Channel name"}
                    value={composerTitle}
                  />
                ) : null}

                {composerMode !== "DIRECT" && visibleSearchResults.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-graphite/55">
                      Choose people with the checkboxes
                    </p>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {visibleSearchResults.map((user) => (
                        <label
                          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-charcoal/8 bg-[#faf7f2] px-3 py-3 transition hover:border-charcoal/16 hover:bg-white"
                          key={`composer-${user.id}`}
                        >
                          <input
                            checked={selectedComposerParticipantIds.has(user.id)}
                            className="h-4 w-4 rounded border-charcoal/25 text-charcoal focus:ring-honey/35"
                            onChange={() => {
                              if (selectedComposerParticipantIds.has(user.id)) {
                                removeComposerParticipant(user.id);
                              } else {
                                addComposerParticipant(user);
                              }
                            }}
                            type="checkbox"
                          />
                          {avatarBadge(user.displayName, user.avatarUrl, "h-10 w-10")}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-charcoal">{user.displayName}</span>
                            <span className="block truncate text-xs text-graphite/62">
                              {formatUserTag(user)}
                              {user.phoneNumberMasked ? ` · ${user.phoneNumberMasked}` : ""}
                            </span>
                          </span>
                          {selectedComposerParticipantIds.has(user.id) ? (
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-charcoal text-cloud">
                              <Check className="h-4 w-4" />
                            </span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {composerParticipants.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-graphite/55">
                      Selected people ({composerParticipants.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {composerParticipants.map((participant) => (
                        <button
                          key={participant.id}
                          className="rounded-full bg-[#efe6d7] px-3 py-1.5 text-xs font-semibold text-charcoal"
                          onClick={() => removeComposerParticipant(participant.id)}
                          type="button"
                        >
                          {participant.displayName} x
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {composerMode !== "DIRECT" ? (
                  <button
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black"
                    onClick={() => {
                      void handleCreateRoom().catch(() => undefined);
                    }}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Create {composerMode === "GROUP" ? "group" : "channel"}
                  </button>
                ) : null}

                {notice ? <p className="mt-3 rounded-2xl bg-[#f8e7dd] px-3 py-3 text-sm text-graphite">{notice}</p> : null}
              </div>
            </div>
          ) : null}

          {sidebarMode === "CHATS" && composerMode === "DIRECT" && visibleSearchResults.length > 0 ? (
            <div className="border-b border-charcoal/10 px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">People</p>
                <span className="text-xs font-semibold text-graphite/48">{visibleSearchResults.length}</span>
              </div>
              <div className="space-y-2">
                {visibleSearchResults.map((user) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-3 text-left transition hover:bg-[#f5efe5]"
                    key={user.id}
                    onClick={() => {
                      if (composerMode === "DIRECT") {
                        void startDirectChat(user).catch(() => undefined);
                        return;
                      }

                      addComposerParticipant(user);
                    }}
                    type="button"
                  >
                    {avatarBadge(user.displayName, user.avatarUrl, "h-11 w-11")}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-charcoal">{user.displayName}</span>
                      <span className="block truncate text-xs text-graphite/62">
                        {formatUserTag(user)}
                        {user.dmPolicy === "REQUESTS_ONLY" ? " • request first" : ""}
                        {user.phoneNumberMasked ? ` • ${user.phoneNumberMasked}` : ""}
                      </span>
                    </span>
                    <span className="rounded-full bg-[#efe6d7] px-2.5 py-1 text-[11px] font-semibold text-charcoal">
                      {composerMode === "DIRECT" ? (user.dmPolicy === "REQUESTS_ONLY" ? "Request" : "Open") : "Add"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {sidebarMode === "STATUS" ? (
              <div className="space-y-5 px-4 py-4">
                <section className="rounded-[28px] border border-charcoal/10 bg-white p-4 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative">
                        {avatarBadge(viewer.displayName, viewer.avatarUrl, "h-12 w-12")}
                        {statusFeed?.mine?.items.length ? (
                          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-charcoal text-cloud">
                            <Sparkles className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#d98ad1] text-white">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-charcoal">My status</p>
                        <p className="truncate text-xs text-graphite/62">
                          {statusFeed?.mine?.items.length
                            ? `${statusFeed?.mine?.items.length ?? 0} live ${(statusFeed?.mine?.items.length ?? 0) === 1 ? "update" : "updates"}`
                            : "Share a photo, video, or a quick text moment"}
                        </p>
                      </div>
                    </div>
                    <button
                      className="rounded-full border border-charcoal/10 bg-[#faf7f2] px-3 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/20"
                      onClick={() => {
                        if (statusFeed?.mine?.items.length) {
                          selectStatusThread(viewer.id, statusFeed?.mine?.items[0]?.id);
                          return;
                        }

                        openStatusComposer("TEXT");
                      }}
                      type="button"
                    >
                      {statusFeed?.mine?.items.length ? "Open" : "Add"}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f6f1e8] px-3 py-2 text-xs font-semibold text-charcoal transition hover:bg-[#efe6d7]"
                      onClick={() => openStatusComposer("PHOTO")}
                      type="button"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Photo
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f6f1e8] px-3 py-2 text-xs font-semibold text-charcoal transition hover:bg-[#efe6d7]"
                      onClick={() => openStatusComposer("VIDEO")}
                      type="button"
                    >
                      <Video className="h-4 w-4" />
                      Video
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-3 py-2 text-xs font-semibold text-cloud transition hover:bg-black"
                      onClick={() => openStatusComposer("TEXT")}
                      type="button"
                    >
                      <PencilLine className="h-4 w-4" />
                      Text
                    </button>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Recent</p>
                    <span className="rounded-full bg-[#efe6d7] px-2.5 py-1 text-[11px] font-semibold text-charcoal">
                      {statusThreads.filter((thread) => thread.owner.id !== viewer.id).length}
                    </span>
                  </div>
                  {statusThreads.filter((thread) => thread.owner.id !== viewer.id).length === 0 ? (
                    <div className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-5 text-sm leading-7 text-graphite/66">
                      Once people you chat with share a status, they will appear here for the next 24 hours.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {statusThreads
                        .filter((thread) => thread.owner.id !== viewer.id)
                        .map((thread) => (
                          <button
                            className={`flex w-full items-center gap-3 rounded-[24px] border px-3 py-3 text-left transition ${
                              activeStatusThread?.owner.id === thread.owner.id
                                ? "border-charcoal/14 bg-white shadow-[0_16px_32px_rgba(24,18,15,0.06)]"
                                : "border-charcoal/8 bg-[#faf7f2] hover:border-charcoal/14 hover:bg-white"
                            }`}
                            key={thread.owner.id}
                            onClick={() => selectStatusThread(thread.owner.id, thread.items[0]?.id)}
                            type="button"
                          >
                            <div
                              className={`rounded-full p-[3px] ${
                                thread.hasUnseen
                                  ? "bg-[linear-gradient(135deg,#d98ad1,#f2c14f)]"
                                  : "bg-charcoal/10"
                              }`}
                            >
                              {avatarBadge(thread.owner.displayName, thread.owner.avatarUrl, "h-11 w-11")}
                            </div>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-charcoal">
                                {thread.owner.displayName}
                              </span>
                              <span className="block truncate text-xs text-graphite/62">
                                {formatUserTag(thread.owner)} • {thread.items.length} {thread.items.length === 1 ? "update" : "updates"}
                              </span>
                            </span>
                            <span className="flex flex-col items-end gap-1">
                              <span className="text-[11px] font-semibold text-graphite/52">
                                {thread.latestCreatedAt ? formatMessageTime(thread.latestCreatedAt) : ""}
                              </span>
                              {thread.unseenCount > 0 ? (
                                <span className="rounded-full bg-[#20c15a] px-2 py-0.5 text-[10px] font-bold text-white">
                                  {thread.unseenCount}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </section>
              </div>
            ) : sidebarMode === "REQUESTS" ? (
              activityView === "REQUESTS" ? (
                messageRequests.incoming.length === 0 && messageRequests.outgoing.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-graphite/64">
                    No message requests yet. Private reach-outs will land here before they open a real chat thread.
                  </div>
                ) : (
                  <div className="space-y-5 px-4 py-4">
                    {messageRequests.incoming.length > 0 ? (
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Incoming</p>
                          <span className="rounded-full bg-[#efe6d7] px-2.5 py-1 text-[11px] font-semibold text-charcoal">
                            {messageRequests.incoming.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {messageRequests.incoming.map((request) => (
                            <div className="rounded-[24px] border border-charcoal/10 bg-white px-3 py-3 shadow-[0_12px_30px_rgba(24,18,15,0.05)]" key={request.id}>
                              <div className="flex items-start gap-3">
                                {avatarBadge(request.requester.displayName, request.requester.avatarUrl, "h-11 w-11")}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-charcoal">{request.requester.displayName}</p>
                                  <p className="truncate text-xs text-graphite/58">{formatUserTag(request.requester)}</p>
                                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-graphite/72">{request.initialMessage ?? "They want to start a conversation."}</p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  className="rounded-full bg-charcoal px-3 py-2 text-xs font-semibold text-cloud transition hover:bg-black"
                                  onClick={() => {
                                    void handleAcceptMessageRequest(request.id).catch(() => undefined);
                                  }}
                                  type="button"
                                >
                                  Accept
                                </button>
                                <button
                                  className="rounded-full border border-charcoal/10 bg-[#f8f5ef] px-3 py-2 text-xs font-semibold text-graphite transition hover:border-charcoal/20 hover:text-charcoal"
                                  onClick={() => {
                                    void handleDeclineMessageRequest(request.id).catch(() => undefined);
                                  }}
                                  type="button"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {messageRequests.outgoing.length > 0 ? (
                      <section>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Waiting on replies</p>
                          <span className="rounded-full bg-[#efe6d7] px-2.5 py-1 text-[11px] font-semibold text-charcoal">
                            {messageRequests.outgoing.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {messageRequests.outgoing.map((request) => (
                            <div className="rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-3 py-3" key={request.id}>
                              <p className="text-sm font-semibold text-charcoal">{request.recipient.displayName}</p>
                              <p className="mt-1 text-xs text-graphite/58">{formatUserTag(request.recipient)}</p>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-graphite/68">{request.initialMessage ?? "Pending message request."}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                )
              ) : notifications.items.length === 0 ? (
                <div className="px-4 py-8 text-sm text-graphite/64">
                  No notifications yet. Request updates and safety notices will show up here.
                </div>
              ) : (
                <div className="space-y-3 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Unread</p>
                    <button
                      className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-graphite transition hover:border-charcoal/20 hover:text-charcoal"
                      onClick={() => {
                        void handleMarkAllNotifications().catch(() => undefined);
                      }}
                      type="button"
                    >
                      Mark all read
                    </button>
                  </div>
                  {notifications.items.map((notification) => {
                    const unread = !notification.readAt;
                    const Icon =
                      notification.type === "USER_BLOCKED"
                        ? ShieldBan
                        : notification.type === "USER_REPORTED"
                          ? ShieldAlert
                          : notification.type === "MESSAGE_REQUEST"
                            ? Mail
                            : Bell;

                    return (
                      <button
                        className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                          unread ? "border-charcoal/12 bg-white shadow-[0_12px_30px_rgba(24,18,15,0.05)]" : "border-charcoal/8 bg-[#faf7f2]"
                        }`}
                        key={notification.id}
                        onClick={() => {
                          void handleMarkNotificationRead(notification.id).catch(() => undefined);
                        }}
                        type="button"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#efe6d7] text-charcoal">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-semibold text-charcoal">{notification.title}</p>
                              <span className="shrink-0 text-[11px] text-graphite/52">{formatMessageTime(notification.createdAt)}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-graphite/68">{notification.body}</p>
                            {unread ? (
                              <span className="mt-3 inline-flex rounded-full bg-[#efe6d7] px-2.5 py-1 text-[11px] font-semibold text-charcoal">
                                New
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : sidebarConversations.length === 0 ? (
              <div className="px-4 py-8 text-sm text-graphite/64">
                {sidebarMode === "VAULT"
                  ? searchQuery.trim()
                    ? `No ${vaultLabel} chats match that search yet.`
                    : `No ${vaultLabel} chats yet.`
                  : searchQuery.trim()
                    ? "No chats match that search yet."
                    : "No chats yet. Search for someone above and open your first room."}
              </div>
            ) : (
              <nav className="divide-y divide-charcoal/6">
                {sidebarConversations.map((conversation) => {
                  const isActive = conversation.id === activeConversation?.id;
                  const label = conversationLabel(conversation, viewer);
                  const other = directPartner(conversation, viewer);
                  const preview = conversationPreview(conversation, viewer);
                  const timestamp = conversation.lastMessageAt ?? conversation.messages[0]?.createdAt;
                  const isPinned = Boolean(conversation.participantState.pinnedAt);
                  const isLocked = Boolean(conversation.participantState.lockedAt);
                  const isArchived = Boolean(conversation.participantState.archivedAt);

                  return (
                    <div
                      className={`flex items-start gap-3 px-4 py-3 transition ${
                        isActive ? "bg-[#efe9dd]" : "hover:bg-[#f5efe5]"
                      }`}
                      key={conversation.id}
                    >
                      <button
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        onClick={() => {
                          setActiveConversationId(conversation.id);
                          setIsSidebarOpen(false);
                        }}
                        type="button"
                      >
                        {avatarBadge(label, other?.avatarUrl ?? null, "h-12 w-12")}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="block truncate text-[15px] font-semibold text-charcoal">{label}</span>
                            {isPinned ? (
                              <span className="rounded-full bg-[#efe6d7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-graphite/72">
                                Pinned
                              </span>
                            ) : null}
                            {isLocked ? (
                              <span className="rounded-full bg-[#ece7fb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-graphite/72">
                                Locked
                              </span>
                            ) : null}
                            {isArchived ? (
                              <span className="rounded-full bg-[#efe6d7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-graphite/72">
                                Archived
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-graphite/58">
                            {other ? formatUserTag(other) : formatConversationType(conversation.type)}
                          </span>
                          <span className="mt-1 block truncate text-sm text-graphite/72">{preview}</span>
                        </span>
                      </button>
                      <span className="flex shrink-0 flex-col items-end gap-2">
                        <span className="text-[11px] font-medium text-graphite/52">
                          {timestamp ? formatMessageTime(timestamp) : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          {sidebarMode === "CHATS" ? (
                            <>
                              <button
                                className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                                  isPinned
                                    ? "border-charcoal/12 bg-charcoal text-cloud"
                                    : "border-charcoal/10 bg-white text-graphite/62 hover:text-charcoal"
                                }`}
                                onClick={() => {
                                  void onTogglePinConversation(conversation.id, {
                                    pinned: !isPinned
                                  }).catch(() => undefined);
                                }}
                                type="button"
                              >
                                <Pin className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                                  isLocked
                                    ? "border-charcoal/12 bg-charcoal text-cloud"
                                    : "border-charcoal/10 bg-white text-graphite/62 hover:text-charcoal"
                                }`}
                                onClick={() => {
                                  void onArchiveConversation(conversation.id, {
                                    locked: !isLocked
                                  }).catch(() => undefined);
                                }}
                                type="button"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="grid h-7 w-7 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/62 transition hover:text-charcoal"
                                onClick={() => {
                                  void onArchiveConversation(conversation.id, {
                                    archived: true
                                  }).catch(() => undefined);
                                }}
                                type="button"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : vaultView === "LOCKED" ? (
                            <>
                              <button
                                className="grid h-7 w-7 place-items-center rounded-full border border-charcoal/12 bg-charcoal text-cloud transition"
                                onClick={() => {
                                  void onArchiveConversation(conversation.id, {
                                    locked: false
                                  }).catch(() => undefined);
                                }}
                                type="button"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="grid h-7 w-7 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/62 transition hover:text-charcoal"
                                onClick={() => {
                                  void onArchiveConversation(conversation.id, {
                                    archived: true
                                  }).catch(() => undefined);
                                }}
                                type="button"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="grid h-7 w-7 place-items-center rounded-full border border-charcoal/12 bg-charcoal text-cloud transition"
                                onClick={() => {
                                  void onArchiveConversation(conversation.id, {
                                    archived: false
                                  }).catch(() => undefined);
                                }}
                                type="button"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="grid h-7 w-7 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/62 transition hover:text-charcoal"
                                onClick={() => {
                                  void onArchiveConversation(conversation.id, {
                                    locked: true
                                  }).catch(() => undefined);
                                }}
                                type="button"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <span className="rounded-full bg-[#20c15a] px-2 py-0.5 text-[10px] font-bold text-white">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </nav>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[#efe6d7]">
          <header className="border-b border-charcoal/10 bg-white/92 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                  type="button"
                >
                  <Menu className="h-4 w-4" />
                </button>
                {isViewingStatuses
                  ? avatarBadge(
                      activeStatusThread?.owner.displayName ?? viewer.displayName,
                      activeStatusThread?.owner.avatarUrl ?? viewer.avatarUrl,
                      "h-11 w-11"
                    )
                  : avatarBadge(activeRoomLabel ?? viewer.displayName, activePartner?.avatarUrl ?? viewer.avatarUrl, "h-11 w-11")}
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-charcoal">
                    {isViewingStatuses
                      ? activeStatusThread
                        ? activeStatusThread.owner.id === viewer.id
                          ? "My status"
                          : `${activeStatusThread.owner.displayName}'s status`
                        : "Status updates"
                      : activeRoomLabel ?? "Choose a chat"}
                  </p>
                  <p className="truncate text-xs text-graphite/60">
                    {isViewingStatuses
                      ? activeStatusDetail
                        ? `${activeStatusIndex + 1} of ${activeStatusThread?.items.length ?? 1} • expires ${statusExpiresLabel}`
                        : "Share photos, video, and text that roll off automatically."
                      : activeConversation
                        ? activeTypingUsers.length > 0
                          ? `${activeTypingUsers.map((user) => user.displayName).join(", ")} typing...`
                          : roomStatusLine
                        : roomStatusLine}
                  </p>
                </div>
              </div>
              <div className="relative flex items-center gap-2">
                <span className="hidden rounded-full bg-[#e9d08f] px-3 py-1.5 text-xs font-semibold text-charcoal sm:inline-flex sm:items-center sm:gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {currentIdentity}
                </span>
                {isViewingStatuses ? (
                  <>
                    <button
                      className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/20 disabled:opacity-50"
                      disabled={!activeStatusThread}
                      onClick={() => stepStatus("previous")}
                      type="button"
                    >
                      Prev
                    </button>
                    <button
                      className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/20 disabled:opacity-50"
                      disabled={!activeStatusThread}
                      onClick={() => stepStatus("next")}
                      type="button"
                    >
                      Next
                    </button>
                    <button
                      className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/72 transition hover:text-charcoal"
                      onClick={() => openStatusComposer("TEXT")}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/72 transition hover:text-charcoal disabled:opacity-50"
                      disabled={!activeConversation}
                      onClick={() => {
                        void handleStartCall("VOICE").catch(() => undefined);
                      }}
                      type="button"
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    <button
                      className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/72 transition hover:text-charcoal disabled:opacity-50"
                      disabled={!activeConversation}
                      onClick={() => {
                        void handleStartCall("VIDEO").catch(() => undefined);
                      }}
                      type="button"
                    >
                      <Video className="h-4 w-4" />
                    </button>
                    <button
                      className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/72 transition hover:text-charcoal"
                      onClick={() => setIsConversationMenuOpen(!isConversationMenuOpen)}
                      type="button"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </>
                )}
                {!isViewingStatuses && isConversationMenuOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-[240px] rounded-[24px] border border-charcoal/10 bg-white p-2 shadow-[0_20px_40px_rgba(24,18,15,0.12)]">
                    {activeConversation ? (
                      <>
                        <button
                          className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                          onClick={() => {
                            void onArchiveConversation(activeConversation.id, {
                              locked: !Boolean(activeConversation.participantState.lockedAt)
                            }).catch(() => undefined);
                            setIsConversationMenuOpen(false);
                          }}
                          type="button"
                        >
                          <Lock className="h-4 w-4" />
                          {activeConversation.participantState.lockedAt ? "Unlock chat" : "Lock chat"}
                        </button>
                        <button
                          className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                          onClick={() => {
                            void onArchiveConversation(activeConversation.id, {
                              archived: !Boolean(activeConversation.participantState.archivedAt)
                            }).catch(() => undefined);
                            setIsConversationMenuOpen(false);
                          }}
                          type="button"
                        >
                          <Archive className="h-4 w-4" />
                          {activeConversation.participantState.archivedAt ? "Move back to chats" : "Archive chat"}
                        </button>
                        {activePartner ? (
                          <>
                            <button
                              className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold transition ${
                                activeRelationship.blockedByMe
                                  ? "cursor-not-allowed text-graphite/48"
                                  : "text-charcoal hover:bg-[#f5efe5]"
                              }`}
                              disabled={activeRelationship.blockedByMe || isSafetyBusy}
                              onClick={() => {
                                void handleBlockActiveUser().catch(() => undefined);
                              }}
                              type="button"
                            >
                              <ShieldBan className="h-4 w-4" />
                              {activeRelationship.blockedByMe ? "Already blocked" : `Block ${activePartner.displayName}`}
                            </button>
                            <button
                              className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                              onClick={() => {
                                setIsReportOpen(true);
                                setIsConversationMenuOpen(false);
                              }}
                              type="button"
                            >
                              <ShieldAlert className="h-4 w-4" />
                              Report this user
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <p className="px-3 py-3 text-sm text-graphite/62">Open a chat first to manage it.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#efe6d7] px-3 py-6 [background-image:radial-gradient(circle_at_1px_1px,rgba(120,98,68,0.08)_1px,transparent_0)] [background-size:24px_24px] sm:px-6 xl:px-8">
            <div className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col">
              {isViewingStatuses ? (
                <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="flex min-h-[720px] flex-col overflow-hidden rounded-[36px] border border-charcoal/10 bg-white shadow-[0_28px_60px_rgba(24,18,15,0.1)]">
                    {activeStatusDetail ? (
                      <>
                        <div className="flex items-center gap-2 border-b border-charcoal/10 px-5 py-4">
                          {activeStatusThread?.items.map((item, index) => (
                            <span
                              className={`h-1.5 flex-1 rounded-full ${
                                index < activeStatusIndex
                                  ? "bg-charcoal"
                                  : index === activeStatusIndex
                                    ? "bg-[linear-gradient(90deg,#d98ad1,#f2c14f)]"
                                    : "bg-charcoal/10"
                              }`}
                              key={item.id}
                            />
                          ))}
                        </div>

                        <div
                          className={`relative flex flex-1 flex-col justify-between overflow-hidden px-6 py-6 ${
                            activeStatusDetail.media ? "bg-charcoal text-cloud" : "text-white"
                          }`}
                          style={
                            activeStatusDetail.media
                              ? {
                                  backgroundImage: `linear-gradient(180deg, rgba(18,18,18,0.18), rgba(18,18,18,0.74)), url(${detailImage})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center"
                                }
                              : {
                                  backgroundImage: `linear-gradient(135deg, ${activeStatusDetail.backgroundColor ?? "#8d3270"}, #f2c14f)`
                                }
                          }
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {avatarBadge(activeStatusDetail.owner.displayName, activeStatusDetail.owner.avatarUrl, "h-12 w-12")}
                              <div>
                                <p className="text-sm font-semibold">{activeStatusDetail.owner.displayName}</p>
                                <p className="text-xs text-white/72">
                                  {formatMessageTime(activeStatusDetail.createdAt)} • @
                                  {activeStatusDetail.owner.userCode ?? activeStatusDetail.owner.username}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white/88 backdrop-blur">
                              {activeStatusIndex + 1} / {activeStatusThread?.items.length ?? 1}
                            </div>
                          </div>

                          <div className="flex flex-1 items-center justify-center py-6">
                            {activeStatusDetail.media ? (
                              activeStatusDetail.media.mimeType.startsWith("video/") ? (
                                <video
                                  autoPlay
                                  className="max-h-[520px] w-full rounded-[28px] border border-white/10 bg-black object-contain shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
                                  controls
                                  loop
                                  muted
                                  src={activeStatusDetail.media.url}
                                />
                              ) : (
                                <img
                                  alt={activeStatusDetail.caption ?? "Status media"}
                                  className="max-h-[520px] w-full rounded-[28px] border border-white/10 object-contain shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
                                  src={activeStatusDetail.media.url}
                                />
                              )
                            ) : (
                              <div className="mx-auto max-w-[720px] text-center">
                                <p className="text-4xl font-semibold leading-[1.2] sm:text-5xl">
                                  {activeStatusDetail.text}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            {activeStatusDetail.caption ? (
                              <p className="max-w-3xl text-sm leading-7 text-white/88">{activeStatusDetail.caption}</p>
                            ) : null}

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                {reactionCatalog.map((reaction) => (
                                  <button
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                      activeStatusDetail.myReaction?.emoji === reaction.emoji
                                        ? "border-white/70 bg-white text-charcoal"
                                        : "border-white/18 bg-white/10 text-white hover:bg-white/16"
                                    }`}
                                    key={`status-${activeStatusDetail.id}-${reaction.emoji}`}
                                    onClick={() => {
                                      void handleReactToStatus(reaction.emoji).catch(() => undefined);
                                    }}
                                    type="button"
                                  >
                                    <span>{reaction.emoji}</span>
                                    {reaction.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-white/76">
                                <span className="rounded-full bg-white/10 px-3 py-2">{activeStatusDetail.viewerCount} views</span>
                                <span className="rounded-full bg-white/10 px-3 py-2">{activeStatusDetail.reactionCount} reactions</span>
                                <span className="rounded-full bg-white/10 px-3 py-2">{activeStatusDetail.commentCount} replies</span>
                              </div>
                            </div>

                            {isStatusOwner ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:bg-[#f8f5ef]"
                                  onClick={() => {
                                    void handleDeleteCurrentStatus().catch(() => undefined);
                                  }}
                                  type="button"
                                >
                                  Remove status
                                </button>
                                {viewer.access.isModerator ? (
                                  <>
                                    <button
                                      className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/16"
                                      onClick={() => {
                                        void handleModerateCurrentStatus({ expiresInHours: 12 }).catch(() => undefined);
                                      }}
                                      type="button"
                                    >
                                      Set 12h
                                    </button>
                                    <button
                                      className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/16"
                                      onClick={() => {
                                        void handleModerateCurrentStatus({ expiresInHours: 48 }).catch(() => undefined);
                                      }}
                                      type="button"
                                    >
                                      Set 48h
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 rounded-[24px] border border-white/14 bg-white/8 px-3 py-3 backdrop-blur">
                                <input
                                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/52"
                                  onChange={(event) => setStatusReplyDraft(event.target.value)}
                                  placeholder="Reply to this status"
                                  value={statusReplyDraft}
                                />
                                <button
                                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:bg-[#f8f5ef] disabled:opacity-60"
                                  disabled={!statusReplyDraft.trim() || isStatusBusy}
                                  onClick={() => {
                                    void handleReplyToStatus().catch(() => undefined);
                                  }}
                                  type="button"
                                >
                                  Reply
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="grid flex-1 place-items-center px-8 py-12 text-center">
                        <div className="max-w-md">
                          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#efe6d7] text-charcoal">
                            <Sparkles className="h-7 w-7" />
                          </span>
                          <h2 className="mt-5 text-[1.8rem] font-semibold text-charcoal">Share a status update</h2>
                          <p className="mt-3 text-sm leading-7 text-graphite/68">
                            Post a text burst, a photo, or a short video so the people you already chat with can catch it for the next day.
                          </p>
                          <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <button
                              className="rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud"
                              onClick={() => openStatusComposer("TEXT")}
                              type="button"
                            >
                              Text status
                            </button>
                            <button
                              className="rounded-full border border-charcoal/12 bg-white px-4 py-3 text-sm font-semibold text-charcoal"
                              onClick={() => openStatusComposer("PHOTO")}
                              type="button"
                            >
                              Photo status
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <aside className="space-y-4">
                    {statusNotice ? (
                      <div className="rounded-[28px] border border-charcoal/10 bg-white px-4 py-4 text-sm leading-7 text-graphite shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                        {statusNotice}
                      </div>
                    ) : null}

                    <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Status lane</p>
                      <h3 className="mt-2 text-xl font-semibold text-charcoal">
                        {activeStatusThread ? activeStatusThread.owner.displayName : "Pick an update"}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-graphite/68">
                        {activeStatusThread
                          ? `${activeStatusThread.items.length} live ${activeStatusThread.items.length === 1 ? "moment" : "moments"} visible to shared chats.`
                          : "Choose a status from the left or publish your own to open the viewer."}
                      </p>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-[20px] bg-[#faf7f2] px-3 py-3">
                          <p className="text-lg font-semibold text-charcoal">{activeStatusDetail?.viewerCount ?? 0}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-graphite/55">Views</p>
                        </div>
                        <div className="rounded-[20px] bg-[#faf7f2] px-3 py-3">
                          <p className="text-lg font-semibold text-charcoal">{activeStatusDetail?.reactionCount ?? 0}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-graphite/55">Reacts</p>
                        </div>
                        <div className="rounded-[20px] bg-[#faf7f2] px-3 py-3">
                          <p className="text-lg font-semibold text-charcoal">{activeStatusDetail?.commentCount ?? 0}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-graphite/55">Replies</p>
                        </div>
                      </div>
                    </section>

                    {activeStatusDetail?.comments.length ? (
                      <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Replies</p>
                        <div className="mt-4 space-y-3">
                          {activeStatusDetail.comments.map((comment) => (
                            <div className="rounded-[22px] bg-[#faf7f2] px-4 py-4" key={comment.id}>
                              <div className="flex items-center gap-3">
                                {avatarBadge(comment.user.displayName, comment.user.avatarUrl, "h-10 w-10")}
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-charcoal">{comment.user.displayName}</p>
                                  <p className="truncate text-xs text-graphite/58">{formatMessageTime(comment.createdAt)}</p>
                                </div>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-graphite/74">{comment.body}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {isStatusOwner && activeStatusDetail?.viewers.length ? (
                      <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Viewed by</p>
                        <div className="mt-4 space-y-3">
                          {activeStatusDetail.viewers.map((view) => (
                            <div className="flex items-center gap-3 rounded-[22px] bg-[#faf7f2] px-4 py-3" key={view.id}>
                              {avatarBadge(view.viewer.displayName, view.viewer.avatarUrl, "h-10 w-10")}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-charcoal">{view.viewer.displayName}</p>
                                <p className="truncate text-xs text-graphite/58">
                                  {formatUserTag(view.viewer)} • {formatMessageTime(view.viewedAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </aside>
                </div>
              ) : !activeConversation ? (
                <div className="grid flex-1 place-items-center py-10">
                <div className="max-w-md rounded-[28px] bg-white/84 px-8 py-10 text-center shadow-[0_20px_50px_rgba(24,18,15,0.08)]">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#efe6d7] text-charcoal">
                      <MessageSquareText className="h-6 w-6" />
                    </span>
                    <h2 className="mt-5 text-[1.65rem] font-semibold text-charcoal">Your chat lane is ready</h2>
                    <p className="mt-3 text-sm leading-7 text-graphite/68">
                      Pick a chat from the left, or search for someone new and start talking without dragging extra chrome into the thread.
                    </p>
                    <button
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud lg:hidden"
                      onClick={() => setIsSidebarOpen(true)}
                      type="button"
                    >
                      <Menu className="h-4 w-4" />
                      Open chats
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isDirectConversationBlocked ? (
                    <div className="rounded-[24px] border border-[#d4b27f] bg-[#fff6e7] px-5 py-4 text-sm leading-7 text-graphite shadow-[0_12px_30px_rgba(24,18,15,0.05)]">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#f1dfb4] px-3 py-1.5 text-xs font-semibold text-charcoal">
                          <ShieldBan className="h-3.5 w-3.5" />
                          Chat protected
                        </span>
                        {activeRelationship.blockedByMe ? (
                          <span>You blocked this person, so this thread is read-only until you unblock them.</span>
                        ) : (
                          <span>This person is not accepting direct messages from you right now.</span>
                        )}
                      </div>
                      {activeRelationship.blockedByMe ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            className="rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-cloud transition hover:bg-black"
                            onClick={() => setIsSettingsOpen(true)}
                            type="button"
                          >
                            Manage blocked people
                          </button>
                        </div>
                      ) : null}
                  </div>
                ) : null}

                <div className="flex justify-center">
                  <span className="rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-graphite/60 shadow-sm">
                    Today
                  </span>
                </div>

                  {incomingCall ? (
                    <div className="mt-4 rounded-[24px] border border-[#d4b27f] bg-[#fff6e7] px-5 py-4 text-sm leading-7 text-graphite shadow-[0_12px_30px_rgba(24,18,15,0.05)]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-charcoal">
                            Incoming {incomingCall.call.type === "VIDEO" ? "video" : "voice"} call
                          </p>
                          <p className="text-xs text-graphite/62">
                            {incomingCall.call.startedBy?.displayName ?? "Someone"} is calling in this conversation.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-cloud"
                            onClick={() => {
                              void handleAcceptIncomingCall().catch(() => undefined);
                            }}
                            type="button"
                          >
                            Accept
                          </button>
                          <button
                            className="rounded-full border border-charcoal/12 bg-white px-4 py-2 text-xs font-semibold text-charcoal"
                            onClick={() => {
                              void handleEndCall(incomingCall.call.id).catch(() => undefined);
                            }}
                            type="button"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {callNotice ? (
                    <div className="mt-4 rounded-[22px] bg-white/84 px-4 py-3 text-sm text-graphite/70 shadow-[0_12px_30px_rgba(24,18,15,0.05)]">
                      {callNotice}
                    </div>
                  ) : null}

                  {nextMessagesCursor ? (
                    <div className="mt-4 flex justify-center">
                      <button
                        className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-xs font-semibold text-graphite transition hover:border-charcoal/18 hover:text-charcoal disabled:opacity-50"
                        disabled={isLoadingOlderMessages}
                        onClick={() => {
                          void loadOlderMessages().catch(() => undefined);
                        }}
                        type="button"
                      >
                        {isLoadingOlderMessages ? "Loading older messages..." : "Load older messages"}
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-6 space-y-4">
                    {messages.map((message) => {
                      const mine = message.sender?.id === viewer.id;
                      const seenText = seenByLine(message, viewer.id);

                      return (
                        <article className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                          <div className={`group flex max-w-[94%] items-end gap-2 md:max-w-[74%] xl:max-w-[66%] ${mine ? "flex-row-reverse" : ""}`}>
                            {!mine ? avatarBadge(message.sender?.displayName ?? "Unknown", message.sender?.avatarUrl ?? null, "h-8 w-8") : null}
                            <div className="relative">
                              {!message.deletedAt ? (
                                <div
                                  className={`absolute -top-5 z-10 flex items-center gap-1 rounded-full border border-charcoal/10 bg-white px-2 py-1 shadow-[0_14px_34px_rgba(24,18,15,0.12)] transition ${
                                    mine ? "right-3" : "left-3"
                                  } pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100`}
                                >
                                  {reactionCatalog.slice(0, 4).map((reaction) => (
                                    <button
                                      aria-label={reaction.label}
                                      className="grid h-8 w-8 place-items-center rounded-full text-sm text-graphite/72 transition hover:bg-[#f5efe5] hover:text-charcoal"
                                      key={`${message.id}-${reaction.emoji}-quick`}
                                      onClick={() => {
                                        setOpenMessageMenuId(null);
                                        setOpenReactionPickerId(null);
                                        void handleToggleReaction(message.id, reaction.emoji).catch(() => undefined);
                                      }}
                                      type="button"
                                    >
                                      <span aria-hidden="true">{reaction.emoji}</span>
                                    </button>
                                  ))}
                                  <button
                                    aria-label="More reactions"
                                    className="grid h-8 w-8 place-items-center rounded-full text-graphite/72 transition hover:bg-[#f5efe5] hover:text-charcoal"
                                    onClick={() => {
                                      setOpenMessageMenuId(null);
                                      setOpenReactionPickerId(openReactionPickerId === message.id ? null : message.id);
                                    }}
                                    type="button"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                  <button
                                    aria-label="Message actions"
                                    className="grid h-8 w-8 place-items-center rounded-full text-graphite/72 transition hover:bg-[#f5efe5] hover:text-charcoal"
                                    onClick={() => {
                                      setOpenReactionPickerId(null);
                                      setOpenMessageMenuId(openMessageMenuId === message.id ? null : message.id);
                                    }}
                                    type="button"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : null}

                              {openReactionPickerId === message.id ? (
                                <div
                                  className={`absolute -top-16 z-20 flex items-center gap-1 rounded-full border border-charcoal/10 bg-white px-2 py-2 shadow-[0_12px_30px_rgba(23,22,19,0.1)] ${
                                    mine ? "right-3" : "left-3"
                                  }`}
                                >
                                  {reactionCatalog.map((reaction) => (
                                    <ReactionToggleButton
                                      inverted={false}
                                      key={`${message.id}-${reaction.emoji}-picker`}
                                      onClick={() => {
                                        setOpenReactionPickerId(null);
                                        void handleToggleReaction(message.id, reaction.emoji).catch(() => undefined);
                                      }}
                                      option={reaction}
                                    />
                                  ))}
                                </div>
                              ) : null}

                              {openMessageMenuId === message.id ? (
                                <div
                                  className={`absolute top-11 z-20 w-52 rounded-[24px] border border-charcoal/10 bg-white p-2 shadow-[0_20px_40px_rgba(24,18,15,0.12)] ${
                                    mine ? "right-0" : "left-0"
                                  }`}
                                >
                                  <button
                                    className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                                    onClick={() => {
                                      setReplyTarget(message);
                                      setEditingMessageId(null);
                                      setOpenMessageMenuId(null);
                                    }}
                                    type="button"
                                  >
                                    <Reply className="h-4 w-4" />
                                    Reply
                                  </button>
                                  {message.body ? (
                                    <button
                                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                                      onClick={() => {
                                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                                          void navigator.clipboard.writeText(message.body ?? "").catch(() => undefined);
                                        }
                                        setOpenMessageMenuId(null);
                                      }}
                                      type="button"
                                    >
                                      <Copy className="h-4 w-4" />
                                      Copy text
                                    </button>
                                  ) : null}
                                  {!message.deletedAt && (message.body || message.media.length > 0) ? (
                                    <button
                                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                                      onClick={() => {
                                        setForwardMessage(message);
                                        setForwardConversationIds([]);
                                        setForwardQuery("");
                                        setOpenMessageMenuId(null);
                                      }}
                                      type="button"
                                    >
                                      <ArrowRight className="h-4 w-4" />
                                      Forward
                                    </button>
                                  ) : null}
                                  <button
                                    className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                                    onClick={() => {
                                      setOpenReactionPickerId(message.id);
                                      setOpenMessageMenuId(null);
                                    }}
                                    type="button"
                                  >
                                    <SmilePlus className="h-4 w-4" />
                                    React
                                  </button>
                                  {mine && (message.type === "TEXT" || message.body) ? (
                                    <button
                                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                                      onClick={() => {
                                        setEditingMessageId(message.id);
                                        setReplyTarget(null);
                                        setDraft(message.body ?? "");
                                        setOpenMessageMenuId(null);
                                      }}
                                      type="button"
                                    >
                                      <PencilLine className="h-4 w-4" />
                                      Edit
                                    </button>
                                  ) : null}
                                  {mine ? (
                                    <button
                                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-[#b04b34] transition hover:bg-[#fff3ee]"
                                      onClick={() => {
                                        void handleDeleteMessage(message.id).catch(() => undefined);
                                        setOpenMessageMenuId(null);
                                      }}
                                      type="button"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </button>
                                  ) : activePartner ? (
                                    <button
                                      className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                                      onClick={() => {
                                        setIsReportOpen(true);
                                        setOpenMessageMenuId(null);
                                      }}
                                      type="button"
                                    >
                                      <ShieldAlert className="h-4 w-4" />
                                      Report
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}

                              <div
                                className={`rounded-[22px] border px-4 py-3 shadow-[0_10px_24px_rgba(24,18,15,0.06)] ${
                                  mine
                                    ? "rounded-br-md border-[#cfe8be] bg-[#d9fdd3] text-charcoal"
                                    : "rounded-bl-md border-white/80 bg-white text-charcoal"
                                }`}
                              >
                              {!mine ? (
                                <p className="mb-1 text-[11px] font-semibold text-graphite/55">
                                  {message.sender?.displayName ?? "Unknown"}
                                </p>
                              ) : null}
                              {message.parent ? (
                                <button
                                  className="mb-3 block w-full rounded-[18px] border border-charcoal/10 bg-white/60 px-3 py-2 text-left text-xs text-graphite/72"
                                  onClick={() => setReplyTarget(message.parent as ChatMessage)}
                                  type="button"
                                >
                                  <span className="flex items-center gap-2 font-semibold text-charcoal">
                                    <Reply className="h-3.5 w-3.5" />
                                    Replying to {message.parent.sender?.displayName ?? "Unknown"}
                                  </span>
                                  <span className="mt-1 block truncate">
                                    {message.parent.deletedAt ? "Message removed" : message.parent.body ?? formatConversationType(message.parent.type)}
                                  </span>
                                </button>
                              ) : null}
                              {message.media.length > 0 ? <MessageMediaGrid media={message.media} /> : null}
                              {message.deletedAt ? (
                                <p className="break-words text-[14px] italic leading-6 text-graphite/56">Message removed</p>
                              ) : message.body ? (
                                <p className="break-words text-[15px] leading-6">{message.body}</p>
                              ) : null}

                              {message.reactions.length > 0 ? (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {summarizeReactions(message, viewer.id).map((reaction) => (
                                    <ReactionSummaryChip
                                      inverted={false}
                                      key={`${message.id}-${reaction.emoji}`}
                                      mine={reaction.mine}
                                      onClick={() => {
                                        void handleToggleReaction(message.id, reaction.emoji).catch(() => undefined);
                                      }}
                                      reaction={reaction}
                                    />
                                  ))}
                                </div>
                              ) : null}

                              <div className="mt-3 flex items-end justify-end gap-3">
                                <div className="text-right">
                                  <p className="text-[11px] font-medium text-graphite/56">{formatMessageTime(message.createdAt)}</p>
                                  {message.editedAt && !message.deletedAt ? <p className="mt-0.5 text-[10px] font-medium text-graphite/48">Edited</p> : null}
                                  {mine && seenText ? <p className="mt-0.5 text-[10px] font-medium text-graphite/48">{seenText}</p> : null}
                                </div>
                              </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {!isViewingStatuses ? (
            <form className="border-t border-charcoal/10 bg-[#f8f5ef] px-4 py-4" onSubmit={handleSendMessage}>
            <div className="mx-auto w-full max-w-[1280px]">
              {(replyTarget || editingMessageId) && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-[24px] border border-charcoal/10 bg-white px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-charcoal">
                      {editingMessageId ? "Editing message" : `Replying to ${replyTarget?.sender?.displayName ?? "message"}`}
                    </p>
                    <p className="truncate text-xs text-graphite/62">
                      {editingMessageId
                        ? "Save changes to update the message for everyone in this room."
                        : replyTarget?.deletedAt
                          ? "Message removed"
                          : replyTarget?.body ?? formatConversationType(replyTarget?.type ?? "TEXT")}
                    </p>
                  </div>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-[#faf7f2] text-charcoal"
                    onClick={() => {
                      setReplyTarget(null);
                      setEditingMessageId(null);
                      setDraft("");
                    }}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {isGifPickerOpen ? (
                <div className="mb-3 rounded-[28px] border border-charcoal/10 bg-white p-4 shadow-[0_18px_40px_rgba(24,18,15,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">GIF lane</p>
                      <p className="mt-1 text-sm text-graphite/68">
                        {giphy
                          ? "Search and send a GIF directly into the thread."
                          : "Add NEXT_PUBLIC_GIPHY_API_KEY and restart the web app to enable GIF search."}
                      </p>
                    </div>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-[#faf7f2] text-charcoal"
                      onClick={() => setIsGifPickerOpen(false)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    className="mt-4 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                    onChange={(event) => setGifQuery(event.target.value)}
                    placeholder="Search celebration, hello, welcome, wow..."
                    value={gifQuery}
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {isGifLoading ? (
                      <div className="sm:col-span-3 flex items-center gap-2 rounded-[20px] bg-[#faf7f2] px-4 py-4 text-sm text-graphite/68">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading GIF results...
                      </div>
                    ) : (
                      gifResults.map((gif) => (
                        <button
                          className="overflow-hidden rounded-[22px] border border-charcoal/10 bg-[#faf7f2] text-left transition hover:border-charcoal/20"
                          key={gif.id}
                          onClick={() => {
                            void handleSendGif(gif).catch(() => undefined);
                          }}
                          type="button"
                        >
                          <img
                            alt={gif.title || "GIF result"}
                            className="h-36 w-full object-cover"
                            src={gif.images?.fixed_width?.url ?? gif.images?.original?.url}
                          />
                          <p className="truncate px-3 py-2 text-xs font-semibold text-graphite/70">
                            {gif.title || "Send GIF"}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="relative flex w-full items-center gap-3 rounded-[30px] border border-charcoal/10 bg-white px-3 py-2 shadow-[0_12px_30px_rgba(24,18,15,0.05)]">
                <input
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    void handlePickAttachments(event.target.files, "DOCUMENT").catch(() => undefined);
                  }}
                  ref={attachmentInputRef}
                  type="file"
                />
                <input
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    void handlePickAttachments(event.target.files, "PHOTO").catch(() => undefined);
                  }}
                  ref={photoInputRef}
                  type="file"
                />
                <input
                  accept="video/*"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    void handlePickAttachments(event.target.files, "VIDEO").catch(() => undefined);
                  }}
                  ref={videoInputRef}
                  type="file"
                />
                <input
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.7z,application/*"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    void handlePickAttachments(event.target.files, "DOCUMENT").catch(() => undefined);
                  }}
                  ref={documentInputRef}
                  type="file"
                />
                <input
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    void handlePickAttachments(event.target.files, "CAMERA").catch(() => undefined);
                  }}
                  ref={cameraInputRef}
                  type="file"
                />
                <div className="relative">
                  <button
                    className={`grid h-10 w-10 place-items-center rounded-full text-graphite/58 transition hover:bg-[#f3ede1] hover:text-charcoal disabled:opacity-50 ${
                      isComposerToolsOpen ? "bg-[#f3ede1] text-charcoal" : ""
                    }`}
                    disabled={!activeConversation || isDirectConversationBlocked || isUploadBusy}
                    onClick={() => {
                      setIsComposerToolsOpen(!isComposerToolsOpen);
                      setIsEmojiPickerOpen(false);
                    }}
                    type="button"
                  >
                    {isUploadBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>
                  {isComposerToolsOpen ? (
                    <div className="absolute bottom-[calc(100%+12px)] left-0 z-20 w-56 rounded-[24px] border border-charcoal/10 bg-white p-2 shadow-[0_20px_40px_rgba(24,18,15,0.12)]">
                      <button
                        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                        onClick={() => {
                          photoInputRef.current?.click();
                          setIsComposerToolsOpen(false);
                        }}
                        type="button"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Photos
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                        onClick={() => {
                          videoInputRef.current?.click();
                          setIsComposerToolsOpen(false);
                        }}
                        type="button"
                      >
                        <Video className="h-4 w-4" />
                        Videos
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                        onClick={() => {
                          cameraInputRef.current?.click();
                          setIsComposerToolsOpen(false);
                        }}
                        type="button"
                      >
                        <Camera className="h-4 w-4" />
                        Camera
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                        onClick={() => {
                          documentInputRef.current?.click();
                          setIsComposerToolsOpen(false);
                        }}
                        type="button"
                      >
                        <FileText className="h-4 w-4" />
                        Document
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-[#f5efe5]"
                        onClick={() => {
                          setIsGifPickerOpen(!isGifPickerOpen);
                          setIsEmojiPickerOpen(false);
                          setIsComposerToolsOpen(false);
                        }}
                        type="button"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Open GIF lane
                      </button>
                    </div>
                  ) : null}
                </div>
                <label className="flex-1">
                  <span className="sr-only">Message</span>
                  <textarea
                    aria-label="Message"
                    className="h-11 max-h-32 w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-graphite/50"
                    disabled={!activeConversation || isDirectConversationBlocked}
                    onBlur={() => emitTyping(false)}
                    onChange={(event) => {
                      const nextDraft = event.target.value;
                      setDraft(nextDraft);

                      if (!activeConversation) {
                        return;
                      }

                      emitTyping(nextDraft.trim().length > 0);
                      if (typingTimeoutRef.current) {
                        window.clearTimeout(typingTimeoutRef.current);
                      }
                      typingTimeoutRef.current = window.setTimeout(() => emitTyping(false), 1200);
                    }}
                    placeholder={
                      !activeConversation
                        ? "Choose a chat first"
                        : isDirectConversationBlocked
                          ? activeRelationship.blockedByMe
                            ? "Unblock this person to send messages"
                            : "This person is not available for direct chat"
                          : editingMessageId
                            ? "Update your message"
                            : "Type a message"
                    }
                    rows={1}
                    value={draft}
                  />
                </label>
                <button
                  className={`grid h-10 w-10 place-items-center rounded-full text-graphite/58 transition hover:bg-[#f3ede1] hover:text-charcoal disabled:opacity-50 ${
                    isEmojiPickerOpen ? "bg-[#f3ede1] text-charcoal" : ""
                  }`}
                  disabled={!activeConversation || isDirectConversationBlocked}
                  onClick={() => {
                    setIsEmojiPickerOpen(!isEmojiPickerOpen);
                    setIsGifPickerOpen(false);
                  }}
                  type="button"
                >
                  <SmilePlus className="h-4 w-4" />
                </button>
                <button
                  className="grid h-11 w-11 place-items-center rounded-full bg-charcoal text-cloud transition hover:bg-black disabled:opacity-50"
                  disabled={!activeConversation || isDirectConversationBlocked || (!draft.trim() && !editingMessageId)}
                  type="submit"
                >
                  {editingMessageId ? <PencilLine className="h-4 w-4" /> : <SendHorizontal className="h-4 w-4" />}
                </button>

                {isEmojiPickerOpen ? (
                  <div className="absolute bottom-[calc(100%+12px)] right-4 z-20 overflow-hidden rounded-[28px] border border-charcoal/10 bg-white shadow-[0_24px_60px_rgba(24,18,15,0.14)]">
                    <EmojiPicker
                      lazyLoadEmojis
                      onEmojiClick={(emojiData: { emoji: string }) => {
                        setDraft(`${draft}${emojiData.emoji}`);
                      }}
                      previewConfig={{ showPreview: false }}
                      searchDisabled={false}
                      width={320}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            </form>
          ) : null}

          {isStatusComposerOpen ? (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-0 z-40 bg-charcoal/24"
                onClick={() => setIsStatusComposerOpen(false)}
              />
              <div className="absolute inset-x-4 top-1/2 z-50 mx-auto w-full max-w-[760px] -translate-y-1/2 rounded-[32px] border border-charcoal/10 bg-[#f8f5ef] p-6 shadow-[0_36px_80px_rgba(24,18,15,0.16)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">New status</p>
                    <h3 className="mt-2 text-2xl font-semibold text-charcoal">Share something that fades on its own</h3>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Photos, short videos, and text moments stay visible to people you already chat with, then roll off automatically.
                    </p>
                  </div>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/70 transition hover:text-charcoal"
                    onClick={() => setIsStatusComposerOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {([
                    ["TEXT", "Text", PencilLine],
                    ["PHOTO", "Photo", ImageIcon],
                    ["VIDEO", "Video", Video]
                  ] as const).map(([mode, label, Icon]) => (
                    <button
                      className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                        statusComposerMode === mode
                          ? "bg-charcoal text-cloud"
                          : "bg-white text-graphite hover:bg-[#efe6d7] hover:text-charcoal"
                      }`}
                      key={mode}
                      onClick={() => setStatusComposerMode(mode)}
                      type="button"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="space-y-4">
                    {statusComposerMode === "TEXT" ? (
                      <>
                        <div
                          className="flex min-h-[320px] items-center justify-center rounded-[28px] px-8 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${statusDraftBackgroundColor}, #f2c14f)`,
                            color: statusDraftTextColor
                          }}
                        >
                          <textarea
                            className="min-h-[220px] w-full resize-none bg-transparent text-center text-3xl font-semibold leading-[1.25] outline-none placeholder:text-current/55"
                            maxLength={700}
                            onChange={(event) => setStatusDraftText(event.target.value)}
                            placeholder="Type a status"
                            value={statusDraftText}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm font-semibold text-charcoal">
                            <span>Background color</span>
                            <input
                              className="mt-2 h-12 w-full rounded-2xl border border-charcoal/10 bg-white p-2"
                              onChange={(event) => setStatusDraftBackgroundColor(event.target.value)}
                              type="color"
                              value={statusDraftBackgroundColor}
                            />
                          </label>
                          <label className="block text-sm font-semibold text-charcoal">
                            <span>Text color</span>
                            <input
                              className="mt-2 h-12 w-full rounded-2xl border border-charcoal/10 bg-white p-2"
                              onChange={(event) => setStatusDraftTextColor(event.target.value)}
                              type="color"
                              value={statusDraftTextColor}
                            />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-charcoal/16 bg-white px-6 py-8 text-center transition hover:border-charcoal/24"
                          onClick={() => statusMediaInputRef.current?.click()}
                          type="button"
                        >
                          {statusDraftMedia ? (
                            statusDraftMedia.mimeType.startsWith("video/") ? (
                              <video
                                className="max-h-[260px] w-full rounded-[24px] object-contain"
                                controls
                                muted
                                src={statusDraftMedia.url}
                              />
                            ) : (
                              <img
                                alt={statusDraftMedia.fileName}
                                className="max-h-[260px] w-full rounded-[24px] object-contain"
                                src={statusDraftMedia.url}
                              />
                            )
                          ) : (
                            <>
                              {statusComposerMode === "PHOTO" ? <ImageIcon className="h-8 w-8 text-graphite/58" /> : <Video className="h-8 w-8 text-graphite/58" />}
                              <p className="mt-4 text-base font-semibold text-charcoal">
                                {statusComposerMode === "PHOTO" ? "Upload a photo" : "Upload a short video"}
                              </p>
                              <p className="mt-2 text-sm leading-7 text-graphite/68">
                                This uses the same media lane as chat uploads, so the status asset is ready to publish once it lands.
                              </p>
                            </>
                          )}
                        </button>
                        <input
                          accept={statusComposerMode === "PHOTO" ? "image/*" : "video/*"}
                          className="hidden"
                          onChange={(event) => {
                            void handlePickStatusMedia(event.target.files).catch(() => undefined);
                          }}
                          ref={statusMediaInputRef}
                          type="file"
                        />
                        <label className="block text-sm font-semibold text-charcoal">
                          <span>Caption</span>
                          <textarea
                            className="mt-2 min-h-[110px] w-full rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 text-sm leading-7 outline-none ring-honey/20 transition focus:ring-4"
                            maxLength={240}
                            onChange={(event) => setStatusDraftCaption(event.target.value)}
                            placeholder="Add a caption if it helps."
                            value={statusDraftCaption}
                          />
                        </label>
                      </>
                    )}
                  </div>

                  <div className="space-y-4">
                    <section className="rounded-[28px] border border-charcoal/10 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Lifetime</p>
                      <p className="mt-2 text-sm leading-7 text-graphite/68">
                        Default is {statusFeed?.defaultExpiresInHours ?? 24} hours. Moderators can tune this per status.
                      </p>
                      <label className="mt-4 block text-sm font-semibold text-charcoal">
                        <span>Hours live</span>
                        <input
                          className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4 disabled:opacity-60"
                          disabled={!viewer.access.isModerator}
                          onChange={(event) => setStatusDraftTtlHours(event.target.value)}
                          placeholder={String(statusFeed?.defaultExpiresInHours ?? 24)}
                          type="number"
                          value={statusDraftTtlHours}
                        />
                      </label>
                    </section>

                    {statusNotice ? (
                      <div className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite">
                        {statusNotice}
                      </div>
                    ) : null}

                    <button
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-60"
                      disabled={
                        isStatusBusy ||
                        (statusComposerMode === "TEXT" ? !statusDraftText.trim() : !statusDraftMedia)
                      }
                      onClick={() => {
                        void handleCreateStatus().catch(() => undefined);
                      }}
                      type="button"
                    >
                      {isStatusBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                      {isStatusBusy ? "Publishing..." : "Publish status"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {isSettingsOpen ? (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-0 z-40 bg-charcoal/24"
                onClick={() => setIsSettingsOpen(false)}
              />
              <aside className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[760px] flex-col border-l border-charcoal/10 bg-[#f8f5ef] shadow-[-24px_0_60px_rgba(24,18,15,0.12)]">
                <div className="flex items-center justify-between border-b border-charcoal/10 px-5 py-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Settings workspace</p>
                    <h3 className="mt-2 text-xl font-semibold text-charcoal">Privacy, trust, and identity controls</h3>
                    <p className="mt-2 text-sm text-graphite/68">
                      Keep your reachability, alerts, and recovery details in one cleaner operating desk.
                    </p>
                  </div>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/70 transition hover:text-charcoal"
                    onClick={() => setIsSettingsOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                    {settingsSections.map((section) => {
                      const Icon = section.icon;
                      const active = settingsView === section.id;

                      return (
                        <button
                          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-charcoal/15 bg-[#efe6d7] text-charcoal"
                              : "border-charcoal/10 bg-white text-graphite/72 hover:text-charcoal"
                          }`}
                          key={section.id}
                          onClick={() => setSettingsView(section.id)}
                          type="button"
                        >
                          <Icon className="h-4 w-4" />
                          {section.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mb-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 shadow-[0_16px_34px_rgba(24,18,15,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Profile</p>
                      <p className="mt-3 text-lg font-semibold text-charcoal">{viewer.displayName}</p>
                      <p className="mt-2 text-xs leading-6 text-graphite/64">
                        {viewer.statusMessage || "Add a status line so people know your current vibe or availability."}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 shadow-[0_16px_34px_rgba(24,18,15,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Reachability</p>
                      <p className="mt-3 text-lg font-semibold text-charcoal">
                        {viewer.dmPolicy === "REQUESTS_ONLY" ? "Requests first" : "Open inbox"}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-graphite/64">{messageRequests.incoming.length} requests waiting.</p>
                    </div>
                    <div className="rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 shadow-[0_16px_34px_rgba(24,18,15,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Phone login</p>
                      <p className="mt-3 text-lg font-semibold text-charcoal">{viewer.phoneVerifiedAt ? "Verified" : "Not linked"}</p>
                      <p className="mt-2 text-xs leading-6 text-graphite/64">{viewer.phoneNumber || "Add a number for portable sign in."}</p>
                    </div>
                    <div className="rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 shadow-[0_16px_34px_rgba(24,18,15,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Alerts</p>
                      <p className="mt-3 text-lg font-semibold text-charcoal">{notificationStatusLabel}</p>
                      <p className="mt-2 text-xs leading-6 text-graphite/64">{notifications.unreadCount} unread notices right now.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                  {settingsView === "profile" ? (
                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Profile</p>
                    <h4 className="mt-2 text-lg font-semibold text-charcoal">Editable identity and public details</h4>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Keep your name, status line, profile summary, avatar, and address details current so the platform admin
                      lane and your chat identity both stay accurate.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-charcoal">
                        <span>Display name</span>
                        <input
                          className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                          onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))}
                          placeholder="Mira Stone"
                          value={profileDraft.displayName}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-charcoal">
                        <span>Status message</span>
                        <input
                          className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                          onChange={(event) => setProfileDraft((current) => ({ ...current, statusMessage: event.target.value }))}
                          placeholder="Available for calls after 4 PM"
                          value={profileDraft.statusMessage}
                        />
                      </label>
                    </div>

                    <label className="mt-4 block text-sm font-semibold text-charcoal">
                      <span>Short bio</span>
                      <textarea
                        className="mt-2 min-h-[110px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-6 text-charcoal outline-none ring-honey/20 transition focus:ring-4"
                        onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}
                        placeholder="Tell people a bit about who you are and how you use the platform."
                        value={profileDraft.bio}
                      />
                    </label>

                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleUploadAvatar(event.target.files).catch(() => undefined);
                      }}
                      ref={avatarInputRef}
                      type="file"
                    />
                    <div className="mt-4 rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
                      <p className="text-sm font-semibold text-charcoal">Profile picture</p>
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        {avatarBadge(profileDraft.displayName || viewer.displayName, profileDraft.avatarUrl || null, "h-16 w-16")}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-charcoal">
                            {profileDraft.avatarUrl ? "Avatar ready" : "No avatar uploaded yet"}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-graphite/64">
                            Upload a photo to Cloudinary instead of pasting a raw URL. Save the profile after upload to publish it.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition hover:border-charcoal/18"
                            disabled={isAvatarUploading}
                            onClick={() => avatarInputRef.current?.click()}
                            type="button"
                          >
                            {isAvatarUploading ? "Uploading..." : "Upload avatar"}
                          </button>
                          {profileDraft.avatarUrl ? (
                            <button
                              className="rounded-full border border-charcoal/10 bg-white px-4 py-2 text-sm font-semibold text-graphite/78 transition hover:border-charcoal/18"
                              onClick={() => setProfileDraft((current) => ({ ...current, avatarUrl: "" }))}
                              type="button"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold text-charcoal">Location</p>
                        <p className="mt-1 text-xs leading-6 text-graphite/64">
                          Use structured country, state, and city selections or pull in your current location.
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition hover:border-charcoal/18 disabled:opacity-50"
                        disabled={isLocatingProfile}
                        onClick={() => {
                          void handleUseCurrentLocation().catch(() => undefined);
                        }}
                        type="button"
                      >
                        <LocateFixed className="h-4 w-4" />
                        {isLocatingProfile ? "Locating..." : "Use current location"}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-charcoal">
                        <span>Address line</span>
                        <input
                          className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                          onChange={(event) => setProfileDraft((current) => ({ ...current, addressLine1: event.target.value }))}
                          placeholder="18 Market Street"
                          value={profileDraft.addressLine1}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-charcoal">
                        <span>Country</span>
                        <select
                          className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              countryCode: event.target.value,
                              stateRegion: "",
                              city: "",
                              latitude: null,
                              longitude: null
                            }))
                          }
                          value={profileDraft.countryCode}
                        >
                          <option value="">Choose country</option>
                          {countryOptions.map((country) => (
                            <option key={country.isoCode} value={country.isoCode}>
                              {country.name} ({country.isoCode})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-charcoal">
                        <span>State or region</span>
                        {stateOptions.length > 0 ? (
                          <select
                            className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                            onChange={(event) =>
                              setProfileDraft((current) => ({
                                ...current,
                                stateRegion: event.target.value,
                                city: "",
                                latitude: null,
                                longitude: null
                              }))
                            }
                            value={profileDraft.stateRegion}
                          >
                            <option value="">Choose state</option>
                            {stateOptions.map((state) => (
                              <option key={state.isoCode} value={state.name}>
                                {state.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                            onChange={(event) => setProfileDraft((current) => ({ ...current, stateRegion: event.target.value }))}
                            placeholder="Tennessee"
                            value={profileDraft.stateRegion}
                          />
                        )}
                      </label>
                      <label className="block text-sm font-semibold text-charcoal">
                        <span>City</span>
                        {cityOptions.length > 0 ? (
                          <select
                            className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                            onChange={(event) => {
                              const selectedCity = cityOptions.find((city) => city.name === event.target.value) ?? null;
                              setProfileDraft((current) => ({
                                ...current,
                                city: event.target.value,
                                latitude: selectedCity?.latitude ? Number(selectedCity.latitude) : current.latitude,
                                longitude: selectedCity?.longitude ? Number(selectedCity.longitude) : current.longitude
                              }));
                            }}
                            value={profileDraft.city}
                          >
                            <option value="">Choose city</option>
                            {cityOptions.map((city) => (
                              <option key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                            onChange={(event) => setProfileDraft((current) => ({ ...current, city: event.target.value }))}
                            placeholder="Nashville"
                            value={profileDraft.city}
                          />
                        )}
                      </label>
                    </div>

                    {profileDraft.latitude !== null && profileDraft.longitude !== null ? (
                      <div className="mt-4 rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-xs font-medium text-graphite/72">
                        Coordinates saved for this profile: {profileDraft.latitude.toFixed(5)}, {profileDraft.longitude.toFixed(5)}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                        disabled={isProfileBusy || profileDraft.displayName.trim().length < 2}
                        onClick={() => {
                          void handleSaveProfile().catch(() => undefined);
                        }}
                        type="button"
                      >
                        {isProfileBusy ? "Saving..." : "Save profile"}
                      </button>
                    </div>
                  </section>
                  ) : null}

                  {settingsView === "reachability" ? (
                  <>
                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Privacy</p>
                    <h4 className="mt-2 text-lg font-semibold text-charcoal">How new people reach you</h4>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Open mode allows direct chats. Request mode keeps first contact in a review queue until you accept it.
                    </p>
                    <div className="mt-4 grid gap-3">
                      {([
                        ["OPEN", "Open inbox", "People can start direct chats immediately."],
                        ["REQUESTS_ONLY", "Requests first", "Strangers send a request and you decide when to open the thread."]
                      ] as const).map(([value, label, description]) => (
                        <button
                          className={`rounded-[24px] border px-4 py-4 text-left transition ${
                            viewer.dmPolicy === value
                              ? "border-charcoal/15 bg-[#efe6d7]"
                              : "border-charcoal/10 bg-[#faf7f2] hover:bg-white"
                          }`}
                          key={value}
                          onClick={() => {
                            void handlePrivacyChange(value).catch(() => undefined);
                          }}
                          type="button"
                        >
                          <span className="block text-sm font-semibold text-charcoal">{label}</span>
                          <span className="mt-1 block text-xs leading-6 text-graphite/66">{description}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Activity</p>
                    <h4 className="mt-2 text-lg font-semibold text-charcoal">Requests and notices</h4>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Keep first-contact requests, privacy updates, and safety actions visible without cluttering your main chat lane.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="rounded-full bg-[#efe6d7] px-3 py-2 text-xs font-semibold text-charcoal">
                        {notifications.unreadCount} unread
                      </span>
                      <button
                        className="rounded-full border border-charcoal/12 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/20"
                        onClick={() => {
                          setSidebarMode("REQUESTS");
                          setActivityView("NOTIFICATIONS");
                          setIsSettingsOpen(false);
                          setIsSidebarOpen(true);
                        }}
                        type="button"
                      >
                        Open activity
                      </button>
                    </div>
                  </section>
                  </>
                  ) : null}

                  {settingsView === "alerts" ? (
                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Browser alerts</p>
                    <h4 className="mt-2 text-lg font-semibold text-charcoal">Desktop notifications</h4>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Turn on browser alerts for new message requests, fresh messages in background chats, and incoming calls.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#efe6d7] px-3 py-2 text-xs font-semibold text-charcoal">
                        <BellRing className="h-3.5 w-3.5" />
                        {browserNotificationPermission === "granted"
                          ? "Enabled"
                          : browserNotificationPermission === "denied"
                            ? "Blocked in browser"
                            : browserNotificationPermission === "unsupported"
                              ? "Not supported"
                              : "Not enabled"}
                      </span>
                      <button
                        className="rounded-full border border-charcoal/12 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/20 disabled:opacity-50"
                        disabled={browserNotificationPermission === "granted" || browserNotificationPermission === "unsupported"}
                        onClick={() => {
                          void handleEnableBrowserNotifications().catch(() => undefined);
                        }}
                        type="button"
                      >
                        {browserNotificationPermission === "granted" ? "Alerts live" : "Enable alerts"}
                      </button>
                    </div>
                  </section>
                  ) : null}

                  {settingsView === "moderation" ? (
                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Moderation</p>
                    <h4 className="mt-2 text-lg font-semibold text-charcoal">Review trust reports</h4>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Open the moderation desk to review abuse and spam reports in a dedicated lane. Site admins can also jump
                      into the full platform control desk when they need broader account and role controls.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {viewer.access.isModerator ? (
                        <button
                          className="rounded-full border border-charcoal/12 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/20"
                          onClick={() => {
                            setIsModerationOpen(true);
                            setIsSettingsOpen(false);
                          }}
                          type="button"
                        >
                          Open moderation desk
                        </button>
                      ) : (
                        <div className="rounded-full border border-dashed border-charcoal/12 bg-[#faf7f2] px-4 py-2 text-xs font-semibold text-graphite/72">
                          You do not have moderation access.
                        </div>
                      )}
                      {viewer.access.isSiteAdmin ? (
                        <a
                          className="rounded-full border border-charcoal/12 bg-charcoal px-4 py-2 text-xs font-semibold text-cloud transition hover:bg-black"
                          href="/admin"
                        >
                          Site admin dashboard
                        </a>
                      ) : null}
                    </div>
                  </section>
                  ) : null}

                  {settingsView === "phone" ? (
                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Phone</p>
                    <h4 className="mt-2 text-lg font-semibold text-charcoal">Verify a login number</h4>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Use international format like <span className="font-semibold">+16155543592</span>. Once verified, this number can sign in with your password too.
                    </p>

                    <label className="mt-4 block text-sm font-semibold text-charcoal">
                      <span>Phone number</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                        onChange={(event) => setPhoneDraft(event.target.value)}
                        placeholder="+16155543592"
                        value={phoneDraft}
                      />
                    </label>

                    {viewer.phoneVerifiedAt ? (
                      <p className="mt-3 rounded-2xl bg-[#eef7ea] px-3 py-3 text-sm text-graphite">
                        Verified on {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(viewer.phoneVerifiedAt))}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                        disabled={isPhoneBusy || phoneDraft.trim().length < 8}
                        onClick={() => {
                          void handleStartPhoneVerification().catch(() => undefined);
                        }}
                        type="button"
                      >
                        {isPhoneBusy ? "Sending..." : viewer.phoneVerifiedAt && phoneDraft === viewer.phoneNumber ? "Send new code" : "Send code"}
                      </button>
                    </div>

                    {phoneCodeSent ? (
                      <div className="mt-4 rounded-[24px] border border-charcoal/10 bg-[#faf7f2] p-4">
                        <label className="block text-sm font-semibold text-charcoal">
                          <span>Verification code</span>
                          <input
                            className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                            onChange={(event) => setPhoneCode(event.target.value)}
                            placeholder="123456"
                            value={phoneCode}
                          />
                        </label>
                        <button
                          className="mt-4 rounded-full border border-charcoal/12 bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:border-charcoal/20"
                          disabled={isPhoneBusy || phoneCode.trim().length < 4}
                          onClick={() => {
                            void handleVerifyPhoneCode().catch(() => undefined);
                          }}
                          type="button"
                        >
                          {isPhoneBusy ? "Verifying..." : "Verify code"}
                        </button>
                      </div>
                    ) : null}
                  </section>
                  ) : null}

                  {settingsView === "blocked" ? (
                  <>
                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Blocked people</p>
                    <h4 className="mt-2 text-lg font-semibold text-charcoal">Reachability controls</h4>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      People you block cannot open new direct chats with you, and their pending requests are cleared out of your review lane.
                    </p>
                    <div className="mt-4 space-y-3">
                      {blockedUsers.length === 0 ? (
                        <div className="rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4 text-sm leading-7 text-graphite/68">
                          No blocked users yet. If you need more control later, this list becomes your quick restore lane.
                        </div>
                      ) : (
                        blockedUsers.map((blocked) => (
                          <div
                            className="flex items-center justify-between gap-3 rounded-[24px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4"
                            key={blocked.id}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {avatarBadge(blocked.user.displayName, blocked.user.avatarUrl, "h-11 w-11")}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-charcoal">{blocked.user.displayName}</p>
                                <p className="truncate text-xs text-graphite/62">{formatUserTag(blocked.user)}</p>
                              </div>
                            </div>
                            <button
                              className="rounded-full border border-charcoal/12 bg-white px-4 py-2 text-xs font-semibold text-charcoal transition hover:border-charcoal/20 disabled:opacity-50"
                              disabled={isSafetyBusy}
                              onClick={() => {
                                void handleUnblockUser(blocked.user.id, blocked.user.displayName).catch(() => undefined);
                              }}
                              type="button"
                            >
                              Unblock
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-charcoal/10 bg-white p-5 shadow-[0_16px_34px_rgba(24,18,15,0.06)]">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Why this matters</p>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Privacy keeps surprise inbox drops under control, blocked users stay out of your live lanes, and a verified phone gives you a stronger portable identity for global login and recovery.
                    </p>
                  </section>
                  </>
                  ) : null}
                </div>
                </div>
              </aside>
            </>
          ) : null}

          {isCallSheetOpen ? (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-0 z-40 bg-charcoal/24"
                onClick={() => setIsCallSheetOpen(false)}
              />
              <div className="absolute inset-x-4 top-1/2 z-50 mx-auto w-full max-w-[560px] -translate-y-1/2 rounded-[32px] border border-charcoal/10 bg-[#f8f5ef] p-6 shadow-[0_36px_80px_rgba(24,18,15,0.14)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Call lane</p>
                    <h3 className="mt-2 text-2xl font-semibold text-charcoal">Call state and history</h3>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Use the phone and video buttons to start a live room call, then manage the state here.
                    </p>
                  </div>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/70 transition hover:text-charcoal"
                    onClick={() => setIsCallSheetOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {activeCall ? (
                  <div className="mt-5 rounded-[24px] border border-charcoal/10 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-charcoal">
                          Live {activeCall.type === "VIDEO" ? "video" : "voice"} call
                        </p>
                        <p className="text-xs text-graphite/62">
                          {activeCall.status} since {formatMessageTime(activeCall.startedAt)}
                        </p>
                      </div>
                      <button
                        className="rounded-full bg-charcoal px-4 py-2 text-xs font-semibold text-cloud"
                        onClick={() => {
                          void handleEndCall(activeCall.id).catch(() => undefined);
                        }}
                        type="button"
                      >
                        End call
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-charcoal px-4 py-3 text-sm font-semibold text-cloud"
                    onClick={() => {
                      void handleStartCall("VOICE").catch(() => undefined);
                    }}
                    type="button"
                  >
                    Start voice call
                  </button>
                  <button
                    className="rounded-full border border-charcoal/12 bg-white px-4 py-3 text-sm font-semibold text-charcoal"
                    onClick={() => {
                      void handleStartCall("VIDEO").catch(() => undefined);
                    }}
                    type="button"
                  >
                    Start video call
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {callHistory.length === 0 ? (
                    <div className="rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 text-sm leading-7 text-graphite/68">
                      No call history yet for this conversation.
                    </div>
                  ) : (
                    callHistory.map((call) => (
                      <div className="rounded-[24px] border border-charcoal/10 bg-white px-4 py-4" key={call.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-charcoal">
                              {call.type === "VIDEO" ? "Video call" : "Voice call"} with {call.startedBy?.displayName ?? "room"}
                            </p>
                            <p className="text-xs text-graphite/62">
                              {call.status} · {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(call.startedAt))}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#efe6d7] px-3 py-1 text-[11px] font-semibold text-charcoal">
                            {call.participants.length} in room
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}

          {isModerationOpen ? (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-0 z-40 bg-charcoal/24"
                onClick={() => setIsModerationOpen(false)}
              />
              <div className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col border-l border-charcoal/10 bg-[#f8f5ef] shadow-[-24px_0_60px_rgba(24,18,15,0.12)]">
                <div className="flex items-center justify-between border-b border-charcoal/10 px-5 py-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Moderation</p>
                    <h3 className="mt-2 text-xl font-semibold text-charcoal">Report review lane</h3>
                  </div>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/70 transition hover:text-charcoal"
                    onClick={() => setIsModerationOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="border-b border-charcoal/10 px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {(["ALL", "OPEN", "REVIEWED", "DISMISSED"] as const).map((value) => (
                      <button
                        key={value}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          moderationStatusFilter === value
                            ? "border-charcoal/15 bg-charcoal text-cloud"
                            : "border-charcoal/10 bg-white text-charcoal"
                        }`}
                        onClick={() => setModerationStatusFilter(value)}
                        type="button"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                  {isModerationBusy ? (
                    <div className="flex items-center gap-2 rounded-[24px] bg-white px-4 py-4 text-sm text-graphite/68">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading reports...
                    </div>
                  ) : moderationReports.length === 0 ? (
                    <div className="rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 text-sm leading-7 text-graphite/68">
                      No reports in this moderation lane.
                    </div>
                  ) : (
                    moderationReports.map((report) => {
                      const draft = getModerationDraft(report);

                      return (
                        <div className="rounded-[24px] border border-charcoal/10 bg-white px-4 py-4" key={report.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-charcoal">{report.reason}</p>
                              <p className="mt-1 text-xs text-graphite/62">
                                {report.reporter.displayName} {"->"} {report.target.displayName}
                              </p>
                              {report.details ? <p className="mt-2 text-sm leading-6 text-graphite/72">{report.details}</p> : null}
                              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-graphite/62">
                                {report.assignedModerator ? (
                                  <span className="rounded-full bg-[#faf7f2] px-2.5 py-1">
                                    Assigned to {report.assignedModerator.displayName}
                                  </span>
                                ) : null}
                                {report.reviewedBy ? (
                                  <span className="rounded-full bg-[#faf7f2] px-2.5 py-1">
                                    Reviewed by {report.reviewedBy.displayName}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <span className="rounded-full bg-[#efe6d7] px-2.5 py-1 text-[11px] font-semibold text-charcoal">
                              {report.status}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-graphite/55">
                              Assignee
                              <select
                                className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm font-medium text-charcoal outline-none ring-honey/20 transition focus:ring-4"
                                onChange={(event) => updateModerationDraft(report.id, { assignedModeratorUserId: event.target.value })}
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

                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-graphite/55">
                              Internal note
                              <textarea
                                className="mt-2 min-h-[92px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-6 text-charcoal outline-none ring-honey/20 transition focus:ring-4"
                                onChange={(event) => updateModerationDraft(report.id, { moderatorNote: event.target.value })}
                                placeholder="Add context for the moderation team..."
                                value={draft.moderatorNote}
                              />
                            </label>

                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-graphite/55">
                              Reporter-facing resolution
                              <textarea
                                className="mt-2 min-h-[92px] w-full rounded-[22px] border border-charcoal/10 bg-[#faf7f2] px-4 py-3 text-sm leading-6 text-charcoal outline-none ring-honey/20 transition focus:ring-4"
                                onChange={(event) => updateModerationDraft(report.id, { resolutionNote: event.target.value })}
                                placeholder="Optional summary that can be shared back to the reporter..."
                                value={draft.resolutionNote}
                              />
                            </label>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              className="rounded-full border border-charcoal/12 bg-white px-3 py-2 text-xs font-semibold text-charcoal"
                              onClick={() => {
                                void handleReviewModerationReport(report.id, {
                                  assignedModeratorUserId: draft.assignedModeratorUserId || undefined,
                                  moderatorNote: draft.moderatorNote,
                                  resolutionNote: draft.resolutionNote
                                }).catch(() => undefined);
                              }}
                              type="button"
                            >
                              Save notes
                            </button>
                            <button
                              className="rounded-full bg-charcoal px-3 py-2 text-xs font-semibold text-cloud"
                              onClick={() => {
                                void handleReviewModerationReport(report.id, {
                                  status: "REVIEWED",
                                  assignedModeratorUserId: draft.assignedModeratorUserId || undefined,
                                  moderatorNote: draft.moderatorNote,
                                  resolutionNote: draft.resolutionNote
                                }).catch(() => undefined);
                              }}
                              type="button"
                            >
                              Mark reviewed
                            </button>
                            <button
                              className="rounded-full border border-charcoal/12 bg-[#faf7f2] px-3 py-2 text-xs font-semibold text-charcoal"
                              onClick={() => {
                                void handleReviewModerationReport(report.id, {
                                  status: "DISMISSED",
                                  assignedModeratorUserId: draft.assignedModeratorUserId || undefined,
                                  moderatorNote: draft.moderatorNote,
                                  resolutionNote: draft.resolutionNote
                                }).catch(() => undefined);
                              }}
                              type="button"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : null}

          {requestRecipient ? (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-0 z-40 bg-charcoal/24"
                onClick={() => setRequestRecipient(null)}
              />
              <div className="absolute inset-x-4 top-1/2 z-50 mx-auto w-full max-w-[520px] -translate-y-1/2 rounded-[32px] border border-charcoal/10 bg-[#f8f5ef] p-6 shadow-[0_36px_80px_rgba(24,18,15,0.14)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Message request</p>
                    <h3 className="mt-2 text-2xl font-semibold text-charcoal">Notify {requestRecipient.displayName}</h3>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      This account reviews first contact before the chat opens. We’ll notify them with your intro message.
                    </p>
                  </div>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/70 transition hover:text-charcoal"
                    onClick={() => setRequestRecipient(null)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <label className="mt-5 block text-sm font-semibold text-charcoal">
                  <span>Intro message</span>
                  <textarea
                    className="mt-2 h-32 w-full rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 text-sm outline-none ring-honey/20 transition focus:ring-4"
                    onChange={(event) => setRequestDraft(event.target.value)}
                    placeholder="Hi, I found your profile and wanted to start a conversation."
                    value={requestDraft}
                  />
                </label>

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    className="rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-graphite transition hover:border-charcoal/20 hover:text-charcoal"
                    onClick={() => setRequestRecipient(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                    disabled={requestDraft.trim().length < 2}
                    onClick={() => {
                      void handleSubmitMessageRequest().catch(() => undefined);
                    }}
                    type="button"
                  >
                    Send request
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {isReportOpen && activePartner ? (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-0 z-40 bg-charcoal/24"
                onClick={() => setIsReportOpen(false)}
              />
              <div className="absolute inset-x-4 top-1/2 z-50 mx-auto w-full max-w-[520px] -translate-y-1/2 rounded-[32px] border border-charcoal/10 bg-[#f8f5ef] p-6 shadow-[0_36px_80px_rgba(24,18,15,0.14)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-graphite/55">Safety report</p>
                    <h3 className="mt-2 text-2xl font-semibold text-charcoal">Report {activePartner.displayName}</h3>
                    <p className="mt-2 text-sm leading-7 text-graphite/68">
                      Tell us what happened in this thread. We’ll save the report for follow-up without changing your chat history.
                    </p>
                  </div>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-full border border-charcoal/10 bg-white text-graphite/70 transition hover:text-charcoal"
                    onClick={() => setIsReportOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <label className="mt-5 block text-sm font-semibold text-charcoal">
                  <span>Reason</span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-white px-4 py-3 text-sm outline-none ring-honey/20 transition focus:ring-4"
                    onChange={(event) => setReportReason(event.target.value)}
                    value={reportReason}
                  >
                    <option value="spam">Spam or unwanted contact</option>
                    <option value="harassment">Harassment</option>
                    <option value="impersonation">Impersonation</option>
                    <option value="abuse">Abusive language</option>
                    <option value="other">Something else</option>
                  </select>
                </label>

                <label className="mt-5 block text-sm font-semibold text-charcoal">
                  <span>Details</span>
                  <textarea
                    className="mt-2 h-32 w-full rounded-[24px] border border-charcoal/10 bg-white px-4 py-4 text-sm outline-none ring-honey/20 transition focus:ring-4"
                    onChange={(event) => setReportDetails(event.target.value)}
                    placeholder="Add a few more details to help with review."
                    value={reportDetails}
                  />
                </label>

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    className="rounded-full border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-graphite transition hover:border-charcoal/20 hover:text-charcoal"
                    onClick={() => setIsReportOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-full bg-charcoal px-5 py-3 text-sm font-semibold text-cloud transition hover:bg-black disabled:opacity-50"
                    disabled={isSafetyBusy || reportReason.trim().length < 2}
                    onClick={() => {
                      void handleSubmitReport().catch(() => undefined);
                    }}
                    type="button"
                  >
                    {isSafetyBusy ? "Sending..." : "Submit report"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function avatarBadge(label: string, imageUrl: string | null, sizeClass: string) {
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

function initialsForName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function directPartner(conversation: Conversation, currentUser: PublicUser) {
  return conversation.participants.find((participant) => participant.user.id !== currentUser.id)?.user ?? null;
}

function conversationLabel(conversation: Conversation, currentUser: PublicUser) {
  if (conversation.title) {
    return conversation.title;
  }

  const other = directPartner(conversation, currentUser);
  return other?.displayName ?? conversation.type;
}

function formatConversationType(type: string) {
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

function conversationPreview(conversation: Conversation, currentUser: PublicUser) {
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

function formatSeenAt(value: string) {
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

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatUserTag(user: Pick<PublicUser, "userCode" | "username">) {
  return user.userCode ? `@${user.userCode}` : `@${user.username}`;
}

function describeMessageForForward(message: ChatMessage | null) {
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

function summarizeReactions(message: ChatMessage, currentUserId: string) {
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

function reactionMeta(emoji: string) {
  return reactionCatalog.find((reaction) => reaction.emoji === emoji) ?? reactionCatalog[0];
}

function seenByLine(message: ChatMessage, currentUserId: string) {
  const readers = message.receipts.filter((receipt) => receipt.user.id !== currentUserId && receipt.status === "READ");
  if (readers.length === 0) {
    return "";
  }

  if (readers.length === 1) {
    return `Seen by ${readers[0].user.displayName}`;
  }

  return `Seen by ${readers.length} people`;
}

function humanizeConnectionState(state: RTCPeerConnectionState) {
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

function describeMediaError(error: unknown, type: "VOICE" | "VIDEO") {
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
      return `${type === "VIDEO" ? "Your camera or microphone" : "Your microphone"} is busy in another app. Close the other app and try again.`;
    }
  }

  return `We could not start the ${type === "VIDEO" ? "video" : "voice"} call media on this device.`;
}

function formatCallElapsed(startedAt: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function mergeCallRecord(items: CallRecord[], call: CallRecord) {
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

function CallToastStack({
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

function LiveCallOverlay({
  activeCall,
  callConnectionState,
  isCameraOff,
  isMuted,
  localVideoRef,
  onClose,
  onEnd,
  onToggleCamera,
  onToggleMute,
  remoteAudioRef,
  remoteStream,
  remoteVideoRef,
  viewer
}: {
  activeCall: CallRecord;
  callConnectionState: string;
  isCameraOff: boolean;
  isMuted: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onEnd: () => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  remoteStream: MediaStream | null;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  viewer: PublicUser;
}) {
  const remoteParticipant =
    activeCall.participants.find((participant) => participant.userId !== viewer.id)?.user ?? activeCall.startedBy;
  const isVideoCall = activeCall.type === "VIDEO";
  const [elapsed, setElapsed] = useState(() => formatCallElapsed(activeCall.startedAt));

  useEffect(() => {
    setElapsed(formatCallElapsed(activeCall.startedAt));
    const handle = window.setInterval(() => {
      setElapsed(formatCallElapsed(activeCall.startedAt));
    }, 1000);

    return () => window.clearInterval(handle);
  }, [activeCall.startedAt]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <div className="pointer-events-auto absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-auto relative flex w-full max-w-[1100px] flex-col overflow-hidden rounded-[36px] border border-white/12 bg-[#11100d] text-cloud shadow-[0_40px_120px_rgba(0,0,0,0.42)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cloud/55">
              {isVideoCall ? "Video call" : "Voice call"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-cloud">
              {remoteParticipant?.displayName ?? "Live room call"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-cloud/68">
              {callConnectionState} • Started {formatMessageTime(activeCall.startedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-cloud/78">
              {activeCall.status}
            </span>
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
                  {remoteStream ? (
                    <video autoPlay className="h-full min-h-[360px] w-full object-cover" playsInline ref={remoteVideoRef} />
                  ) : (
                    <div className="grid min-h-[360px] place-items-center">
                      <div className="text-center">
                        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/10 text-3xl font-bold text-cloud">
                          {initialsForName(remoteParticipant?.displayName ?? "Call")}
                        </div>
                        <p className="mt-5 text-lg font-semibold text-cloud">
                          Waiting for {remoteParticipant?.displayName ?? "the other side"} to connect
                        </p>
                        <p className="mt-2 text-sm text-cloud/68">We’ll switch to live video as soon as the peer handshake lands.</p>
                      </div>
                    </div>
                  )}
                </div>
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
              </>
            ) : (
              <div className="grid min-h-[360px] place-items-center">
                <div className="text-center">
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/10 text-4xl font-bold text-cloud">
                    {initialsForName(remoteParticipant?.displayName ?? "Call")}
                  </div>
                  <p className="mt-6 text-2xl font-semibold text-cloud">{remoteParticipant?.displayName ?? "Voice call"}</p>
                  <p className="mt-3 text-sm text-cloud/68">
                    {remoteStream ? "Audio stream connected." : "Connecting voice stream and keeping the room warm."}
                  </p>
                  <audio autoPlay className="hidden" ref={remoteAudioRef} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-[30px] border border-white/8 bg-white/6 p-5">
            <div className="rounded-[24px] border border-white/8 bg-white/6 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cloud/52">Live status</p>
              <p className="mt-3 text-lg font-semibold text-cloud">{callConnectionState}</p>
              <p className="mt-2 text-sm leading-7 text-cloud/68">
                {remoteStream
                  ? "Peer media is live. You can stay here or hide the panel and keep the call running."
                  : "We’re still negotiating the connection. Keep this panel open while the other side answers."}
              </p>
              <div className="mt-4 grid gap-2 text-xs text-cloud/62">
                <div className="flex items-center justify-between rounded-2xl bg-white/6 px-3 py-2">
                  <span>Call timer</span>
                  <span className="font-semibold text-cloud">{elapsed}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/6 px-3 py-2">
                  <span>Remote media</span>
                  <span className="font-semibold text-cloud">{remoteStream ? "Live" : "Negotiating"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                disabled={!isVideoCall}
                onClick={onToggleCamera}
                type="button"
              >
                {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                {isCameraOff ? "Camera off" : "Camera on"}
              </button>
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

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

function attachmentFileName(asset: ChatMessage["media"][number]) {
  return asset.storageKey.split("/").pop() ?? "Attachment";
}

function formatFileSize(sizeBytes: number) {
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

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function attachmentIconForMime(mimeType: string, fileName: string): LucideIcon {
  if (mimeType.includes("zip") || fileName.match(/\.(zip|rar|7z|tar|gz)$/i)) {
    return FileArchive;
  }

  if (mimeType.includes("pdf") || mimeType.includes("text") || mimeType.includes("word") || mimeType.includes("sheet")) {
    return FileText;
  }

  return Paperclip;
}

function attachmentKindLabel(mimeType: string, fileName: string) {
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

function MessageMediaGrid({ media }: { media: ChatMessage["media"] }) {
  return (
    <div className={`mb-3 grid gap-3 ${media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {media.map((asset) => {
        const fileName = attachmentFileName(asset);
        const sizeLabel = formatFileSize(asset.sizeBytes);

        if (asset.mimeType.startsWith("image/")) {
          return (
            <div className="overflow-hidden rounded-[20px] border border-charcoal/10 bg-[#faf7f2]" key={asset.id}>
              <a href={asset.url} rel="noreferrer" target="_blank">
                <img
                  alt={fileName}
                  className="max-h-[320px] w-full object-cover transition hover:scale-[1.01]"
                  loading="lazy"
                  src={asset.url}
                />
              </a>
              <div className="flex items-center justify-between gap-3 border-t border-charcoal/8 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{fileName}</p>
                  <p className="mt-1 text-xs text-graphite/62">
                    Image {asset.width && asset.height ? `• ${asset.width}×${asset.height}` : ""} • {sizeLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    href={asset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    download={fileName}
                    href={asset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        }

        if (asset.mimeType.startsWith("video/")) {
          return (
            <div className="overflow-hidden rounded-[20px] border border-charcoal/10 bg-[#faf7f2]" key={asset.id}>
              <video className="w-full bg-black/10" controls src={asset.url} />
              <div className="flex items-center justify-between gap-3 border-t border-charcoal/8 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{fileName}</p>
                  <p className="mt-1 text-xs text-graphite/62">
                    Video {asset.durationMs ? `• ${formatDuration(asset.durationMs)}` : ""} • {sizeLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    href={asset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                    download={fileName}
                    href={asset.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        }

        if (asset.mimeType.startsWith("audio/")) {
          return (
            <div className="rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4" key={asset.id}>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-charcoal shadow-[0_8px_20px_rgba(24,18,15,0.05)]">
                  <Radio className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-charcoal">{fileName}</p>
                  <p className="mt-1 text-xs text-graphite/62">
                    Audio {asset.durationMs ? `• ${formatDuration(asset.durationMs)}` : ""} • {sizeLabel}
                  </p>
                </div>
                <a
                  className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                  download={fileName}
                  href={asset.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
              <audio className="mt-4 w-full" controls src={asset.url} />
            </div>
          );
        }

        const FileIcon = attachmentIconForMime(asset.mimeType, fileName);

        return (
          <div
            className="flex items-center justify-between gap-3 rounded-[20px] border border-charcoal/10 bg-[#faf7f2] px-4 py-4"
            key={asset.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-charcoal shadow-[0_8px_20px_rgba(24,18,15,0.05)]">
                <FileIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">{fileName}</p>
                <p className="mt-1 text-xs text-graphite/62">
                  {attachmentKindLabel(asset.mimeType, fileName)} • {sizeLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                href={asset.url}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                className="grid h-9 w-9 place-items-center rounded-full border border-charcoal/10 bg-white text-charcoal transition hover:border-charcoal/20"
                download={fileName}
                href={asset.url}
                rel="noreferrer"
                target="_blank"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyFeature({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-charcoal/10 bg-white/72 p-5 shadow-[0_16px_40px_rgba(23,22,19,0.05)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">{label}</p>
      <p className="mt-3 text-sm leading-6 text-graphite/76">{text}</p>
    </div>
  );
}

function PresenceStatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
        online ? "bg-green-500" : "bg-graphite/30"
      }`}
    />
  );
}

function DetailStatCard({
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

function ReactionSummaryChip({
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

function ReactionToggleButton({
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

function SideCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-charcoal/8 bg-white/78 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-graphite/55">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function AuthPanel({ onSession }: { onSession: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const resetToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("resetToken") : null;

  useEffect(() => {
    if (resetToken) {
      setMode("reset");
    }
  }, [resetToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");

    try {
      if (mode === "register") {
        const nextSession = await register({
          email: String(form.get("email")),
          username: String(form.get("username")),
          displayName: String(form.get("displayName")),
          password: String(form.get("password")),
          platform: "web"
        });
        onSession(nextSession);
        return;
      }

      if (mode === "forgot") {
        await forgotPassword(String(form.get("email")));
        setMessage("Check Mailpit for the reset link.");
        return;
      }

      if (mode === "reset") {
        await resetPassword(String(form.get("token") || resetToken), String(form.get("password")));
        window.history.replaceState({}, "", "/");
        setMode("login");
        setMessage("Password updated. Sign in with the new password.");
        return;
      }

      const nextSession = await login({
        identifier: String(form.get("identifier")),
        password: String(form.get("password")),
        platform: "web"
      });
      onSession(nextSession);
    } catch {
      setMessage("That did not work. Check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 text-charcoal">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-charcoal/10 bg-cloud/90 shadow-2xl shadow-charcoal/10 backdrop-blur lg:grid-cols-[1.2fr_420px]">
        <div className="relative hidden min-h-[720px] overflow-hidden lg:block">
          <img alt="Omochat workspace" className="h-full w-full object-cover" src={detailImage} />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(242,193,79,0.16),rgba(255,255,255,0)_42%,rgba(217,138,209,0.18))]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,13,10,0.06),rgba(17,13,10,0.28)_48%,rgba(17,13,10,0.78))]" />
          <div className="absolute inset-x-6 bottom-6 rounded-[30px] border border-white/16 bg-[rgba(22,17,13,0.48)] p-6 shadow-[0_24px_60px_rgba(12,10,8,0.28)] backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/84">Omochat</p>
            <h1 className="font-display mt-6 max-w-lg text-[2.5rem] font-bold leading-[1.02] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:text-[3.15rem]">State-of-the-art chat, calm enough to live in.</h1>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-white/88">
              Sign in with email, username, verified phone, or your short identity code. Every new account now gets a unique tag like <span className="font-bold text-white">@23yg2</span>.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-normal text-graphite">Omochat</p>
          <h2 className="font-display mt-2 text-[2rem] font-bold">{authTitle(mode)}</h2>
          <p className="mt-2 text-[14px] leading-6 text-graphite/80">
            Sign in with your email, username, verified phone, or short code. Password reset stays local through Mailpit.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <AuthInput label="Email" name="email" placeholder="mira@omochat.local" type="email" />
                <AuthInput label="Username" name="username" placeholder="mira" />
                <AuthInput label="Display name" name="displayName" placeholder="Mira Stone" />
                <AuthInput label="Password" name="password" placeholder="ChangeMe123!" type="password" />
              </>
            ) : null}

            {mode === "login" ? (
              <>
                <AuthInput label="Email, username, phone, or @code" name="identifier" placeholder="@23yg2 or +16155543592" />
                <AuthInput label="Password" name="password" placeholder="ChangeMe123!" type="password" />
              </>
            ) : null}

            {mode === "forgot" ? <AuthInput label="Email" name="email" placeholder="mira@omochat.local" type="email" /> : null}

            {mode === "reset" ? (
              <>
                {!resetToken ? <AuthInput label="Reset token" name="token" placeholder="Paste token" /> : null}
                <AuthInput label="New password" name="password" placeholder="NewChangeMe123!" type="password" />
              </>
            ) : null}

            <button className="w-full rounded-lg bg-charcoal px-4 py-4 font-bold text-cloud transition hover:bg-black" disabled={busy}>
              {busy ? "Working..." : authButton(mode)}
            </button>
          </form>

          {message ? <p className="mt-4 rounded-lg bg-sweet px-4 py-3 text-sm font-semibold text-graphite">{message}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-graphite">
            {mode !== "login" ? <button onClick={() => setMode("login")}>Sign in</button> : null}
            {mode !== "register" ? <button onClick={() => setMode("register")}>Create account</button> : null}
            {mode !== "forgot" ? <button onClick={() => setMode("forgot")}>Forgot password</button> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthInput({
  label,
  name,
  placeholder,
  type = "text"
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      <span>{label}</span>
      <input
                    className="mt-1 w-full rounded-lg border border-charcoal/10 bg-white px-4 py-4 outline-none ring-honey/30 transition focus:ring-4"
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}

function authTitle(mode: AuthMode) {
  if (mode === "register") {
    return "Create your room";
  }
  if (mode === "forgot") {
    return "Reset access";
  }
  if (mode === "reset") {
    return "Choose a new password";
  }
  return "Welcome back";
}

function authButton(mode: AuthMode) {
  if (mode === "register") {
    return "Create account";
  }
  if (mode === "forgot") {
    return "Send reset link";
  }
  if (mode === "reset") {
    return "Update password";
  }
  return "Sign in";
}
