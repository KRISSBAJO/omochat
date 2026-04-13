export type DirectMessagePolicy = "OPEN" | "REQUESTS_ONLY";
export type UserAccess = {
  isModerator: boolean;
  isPlatformAdmin: boolean;
  isSiteAdmin: boolean;
  roles: Array<"SITE_ADMIN" | "PLATFORM_ADMIN" | "MODERATOR">;
};

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  userCode: string | null;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  bio: string | null;
  addressLine1: string | null;
  city: string | null;
  stateRegion: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  dmPolicy: DirectMessagePolicy;
  status: string;
  access: UserAccess;
};

export type AuthSession = {
  tokenType: "Bearer";
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
  user: PublicUser;
};

export type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP" | "CHANNEL";
  title: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  relationshipState: {
    blockedByMe: boolean;
    blockedMe: boolean;
  };
  participantState: {
    archivedAt: string | null;
    lockedAt: string | null;
    mutedUntil: string | null;
    pinnedAt: string | null;
    lastReadAt: string | null;
    lastReadMessageId: string | null;
  };
  participants: Array<{
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      username: string;
      userCode: string | null;
      displayName: string;
      avatarUrl: string | null;
      lastSeenAt: string | null;
    };
  }>;
  messages: Array<{
    id: string;
    body: string | null;
    createdAt: string;
  }>;
};

export type ConversationInviteLink = {
  code: string;
  inviteUrl: string;
  expiresAt: string | null;
};

export type MessagePage = {
  items: ChatMessage[];
  nextCursor: string | null;
};

export type SearchUser = {
  id: string;
  username: string;
  userCode: string | null;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  dmPolicy: DirectMessagePolicy;
  phoneVerifiedAt: string | null;
  phoneNumberMasked: string | null;
};

export type DirectMessageRequest = {
  id: string;
  requesterUserId: string;
  recipientUserId: string;
  conversationId: string | null;
  initialMessage: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
    lastSeenAt: string | null;
    dmPolicy: DirectMessagePolicy;
  };
  recipient: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
    lastSeenAt: string | null;
    dmPolicy: DirectMessagePolicy;
  };
};

export type MessageRequestInbox = {
  incoming: DirectMessageRequest[];
  outgoing: DirectMessageRequest[];
};

export type NotificationItem = {
  id: string;
  type:
    | "SYSTEM"
    | "MESSAGE_REQUEST"
    | "MESSAGE_REQUEST_ACCEPTED"
    | "MESSAGE_REQUEST_DECLINED"
    | "MESSAGE_RECEIVED"
    | "CALL_RINGING"
    | "CALL_MISSED"
    | "REPORT_UPDATED"
    | "USER_BLOCKED"
    | "USER_REPORTED";
  contextId: string | null;
  title: string;
  body: string;
  status: "PENDING" | "SENT" | "FAILED" | "READ";
  readAt: string | null;
  createdAt: string;
  message: {
    id: string;
    conversationId: string;
    body: string | null;
  } | null;
};

export type NotificationInbox = {
  items: NotificationItem[];
  unreadCount: number;
};

export type ChatMediaAsset = {
  id: string;
  provider: "LOCAL" | "S3" | "CLOUDINARY";
  bucket: string | null;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  checksum: string | null;
};

export type StatusOwner = {
  id: string;
  username: string;
  userCode: string | null;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
};

export type StatusSummary = {
  id: string;
  type: "TEXT" | "IMAGE" | "VIDEO";
  text: string | null;
  caption: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  createdAt: string;
  expiresAt: string;
  owner: StatusOwner;
  media: {
    provider: "LOCAL" | "S3" | "CLOUDINARY";
    bucket: string | null;
    storageKey: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    checksum: string | null;
  } | null;
  viewedAt: string | null;
  myReaction: {
    id: string;
    emoji: string;
    createdAt: string;
  } | null;
  viewerCount: number;
  reactionCount: number;
  commentCount: number;
};

export type StatusDetail = StatusSummary & {
  removedAt: string | null;
  removedReason: string | null;
  reactions: Array<{
    id: string;
    emoji: string;
    createdAt: string;
    user: StatusOwner;
  }>;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    conversationId: string | null;
    messageId: string | null;
    user: StatusOwner;
  }>;
  viewers: Array<{
    id: string;
    viewedAt: string;
    viewer: StatusOwner;
  }>;
};

export type StatusThread = {
  owner: StatusOwner;
  latestCreatedAt: string | null;
  hasUnseen: boolean;
  unseenCount: number;
  items: StatusSummary[];
};

export type StatusFeed = {
  defaultExpiresInHours: number;
  canModerate: boolean;
  mine: StatusThread | null;
  contacts: StatusThread[];
};

export type BlockedUser = {
  id: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
    lastSeenAt: string | null;
    dmPolicy: DirectMessagePolicy;
  };
};

export type StartDirectAccessResult =
  | {
      kind: "conversation";
      conversation: Conversation;
    }
  | {
      kind: "request";
      request: DirectMessageRequest;
    };

export type ChatMessage = {
  id: string;
  conversationId: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "SYSTEM" | "CALL";
  body: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  parentId?: string | null;
  parent?: {
    id: string;
    body: string | null;
    type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "SYSTEM" | "CALL";
    deletedAt: string | null;
    createdAt: string;
    sender: {
      id: string;
      username: string;
      userCode: string | null;
      displayName: string;
      avatarUrl: string | null;
    } | null;
  } | null;
  sender: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  reactions: Array<{
    id: string;
    emoji: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
      userCode: string | null;
      displayName: string;
    };
  }>;
  receipts: Array<{
    id: string;
    status: "SENT" | "DELIVERED" | "READ";
    deliveredAt: string | null;
    readAt: string | null;
    user: {
      id: string;
      username: string;
      userCode: string | null;
      displayName: string;
    };
  }>;
  media: ChatMediaAsset[];
};

export type PreparedUpload = {
  provider: "S3";
  bucket: string;
  storageKey: string;
  uploadUrl: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
};

export type RtcConfig = {
  credentialExpiresAt: string | null;
  iceServers: Array<{
    credential?: string;
    urls: string | string[];
    username?: string;
  }>;
};

export type CallRecord = {
  id: string;
  conversationId: string;
  type: "VOICE" | "VIDEO";
  status: "RINGING" | "ANSWERED" | "MISSED" | "ENDED" | "FAILED";
  startedAt: string;
  endedAt: string | null;
  startedBy: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  participants: Array<{
    id: string;
    userId: string;
    joinedAt: string | null;
    leftAt: string | null;
    user: {
      id: string;
      username: string;
      userCode: string | null;
      displayName: string;
      avatarUrl: string | null;
    };
  }>;
};

export type ModerationReport = {
  id: string;
  reason: string;
  details: string | null;
  moderatorNote: string | null;
  resolutionNote: string | null;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  assignedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
  };
  target: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
  };
  assignedModerator: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
    email: string;
  } | null;
  reviewedBy: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
    email: string;
  } | null;
  conversation: {
    id: string;
    type: "DIRECT" | "GROUP" | "CHANNEL";
    title: string | null;
  } | null;
  message: {
    id: string;
    body: string | null;
    createdAt: string;
    deletedAt: string | null;
  } | null;
};

export type ModeratorSummary = {
  id: string;
  username: string;
  userCode: string | null;
  displayName: string;
  avatarUrl: string | null;
  email: string;
};

export type AdminOverview = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  openReports: number;
  totalConversations: number;
  pendingRequests: number;
  siteAdmins: number;
  platformAdmins: number;
  moderators: number;
};

export type AdminAction = {
  id: string;
  type: "USER_SUSPENDED" | "USER_RESTORED" | "USER_ROLE_UPDATED";
  note: string | null;
  createdAt: string;
  actorUser: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
    email: string;
  } | null;
  targetUser: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
    email: string;
  };
};

export type AdminActionPreview = {
  id: string;
  type: AdminAction["type"];
  note: string | null;
  createdAt: string;
  actorUser: AdminAction["actorUser"];
};

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  userCode: string | null;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  bio: string | null;
  addressLine1: string | null;
  city: string | null;
  stateRegion: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  dmPolicy: DirectMessagePolicy;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  lastSeenAt: string | null;
  createdAt: string;
  access: UserAccess;
  latestAdminAction: AdminActionPreview | null;
  counts: {
    conversations: number;
    reportsReceived: number;
    reportsFiled: number;
  };
};

export type AdminUserPage = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminStatus = {
  id: string;
  type: "TEXT" | "IMAGE" | "VIDEO";
  text: string | null;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  removedAt: string | null;
  removedReason: string | null;
  owner: {
    id: string;
    email: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
  };
  media: {
    provider: "LOCAL" | "S3" | "CLOUDINARY";
    bucket: string | null;
    storageKey: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    checksum: string | null;
  } | null;
  counts: {
    views: number;
    reactions: number;
    comments: number;
  };
};

export type AdminStatusPage = {
  items: AdminStatus[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const text = await response.text();
    if (text) {
      let parsed: { message?: string | string[] } | null = null;
      try {
        parsed = JSON.parse(text) as { message?: string | string[] };
      } catch {
        parsed = null;
      }

      if (Array.isArray(parsed?.message)) {
        throw new Error(parsed.message.join(", "));
      }
      if (typeof parsed?.message === "string") {
        throw new Error(parsed.message);
      }

      throw new Error(text);
    }
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function register(input: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  platform?: string;
}) {
  return apiRequest<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function login(input: { identifier: string; password: string; platform?: string }) {
  return apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function refreshSession() {
  return apiRequest<AuthSession>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function logout(accessToken?: string) {
  return apiRequest<{ ok: true }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function forgotPassword(email: string) {
  return apiRequest<{ ok: true }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function resetPassword(token: string, password: string) {
  return apiRequest<{ ok: true }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password })
  });
}

export function getMe(accessToken: string) {
  return apiRequest<PublicUser>("/users/me", {}, accessToken);
}

export function updateMe(
  input: {
    displayName?: string;
    avatarUrl?: string;
    statusMessage?: string;
    bio?: string;
    addressLine1?: string;
    city?: string;
    stateRegion?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    dmPolicy?: DirectMessagePolicy;
  },
  accessToken: string
) {
  return apiRequest<PublicUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function getStatusFeed(accessToken: string) {
  return apiRequest<StatusFeed>("/statuses/feed", {}, accessToken);
}

export function getStatus(statusId: string, accessToken: string) {
  return apiRequest<StatusDetail>(`/statuses/${statusId}`, {}, accessToken);
}

export function createStatus(
  input: {
    type: "TEXT" | "IMAGE" | "VIDEO";
    text?: string;
    caption?: string;
    media?: {
      provider: "LOCAL" | "S3" | "CLOUDINARY";
      storageKey: string;
      url: string;
      mimeType: string;
      sizeBytes: number;
      width?: number;
      height?: number;
      durationMs?: number;
      checksum?: string;
    };
    backgroundColor?: string;
    textColor?: string;
    expiresInHours?: number;
  },
  accessToken: string
) {
  return apiRequest<StatusDetail>("/statuses", {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function markStatusViewed(statusId: string, accessToken: string) {
  return apiRequest<StatusDetail>(`/statuses/${statusId}/views`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function toggleStatusReaction(statusId: string, emoji: string, accessToken: string) {
  return apiRequest<StatusDetail>(`/statuses/${statusId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji })
  }, accessToken);
}

export function commentOnStatus(statusId: string, body: string, accessToken: string) {
  return apiRequest<StatusDetail>(`/statuses/${statusId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body })
  }, accessToken);
}

export function moderateStatus(
  statusId: string,
  input: {
    remove?: boolean;
    removedReason?: string;
    expiresInHours?: number;
  },
  accessToken: string
) {
  return apiRequest<StatusDetail>(`/statuses/${statusId}/moderation`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function deleteStatus(statusId: string, accessToken: string) {
  return apiRequest<{ ok: true }>(`/statuses/${statusId}`, {
    method: "DELETE"
  }, accessToken);
}

export function getConversations(
  accessToken: string,
  input?: {
    includeArchived?: boolean;
    includeLocked?: boolean;
  }
) {
  const params = new URLSearchParams();
  if (input?.includeArchived) {
    params.set("includeArchived", "true");
  }
  if (input?.includeLocked) {
    params.set("includeLocked", "true");
  }

  const query = params.toString();
  return apiRequest<Conversation[]>(`/conversations${query ? `?${query}` : ""}`, {}, accessToken);
}

export function searchUsers(query: string, accessToken: string) {
  return apiRequest<SearchUser[]>(`/users/search?q=${encodeURIComponent(query)}`, {}, accessToken);
}

export function startPhoneVerification(phoneNumber: string, accessToken: string) {
  return apiRequest<{ ok: true; phoneNumber: string }>("/auth/phone/start", {
    method: "POST",
    body: JSON.stringify({ phoneNumber })
  }, accessToken);
}

export function verifyPhoneNumber(phoneNumber: string, code: string, accessToken: string) {
  return apiRequest<{ ok: true; user: PublicUser }>("/auth/phone/verify", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, code })
  }, accessToken);
}

export function getMessageRequests(accessToken: string) {
  return apiRequest<MessageRequestInbox>("/message-requests", {}, accessToken);
}

export function getNotifications(accessToken: string, input?: { unreadOnly?: boolean; limit?: number }) {
  const params = new URLSearchParams();
  if (input?.unreadOnly) {
    params.set("unreadOnly", "true");
  }
  if (input?.limit) {
    params.set("limit", String(input.limit));
  }

  const query = params.toString();
  return apiRequest<NotificationInbox>(`/notifications${query ? `?${query}` : ""}`, {}, accessToken);
}

export function markNotificationRead(notificationId: string, accessToken: string) {
  return apiRequest<NotificationItem>(`/notifications/${notificationId}/read`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function markAllNotificationsRead(accessToken: string) {
  return apiRequest<{ ok: true }>("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function startDirectAccess(
  input: {
    recipientUserId: string;
    initialMessage?: string;
  },
  accessToken: string
) {
  return apiRequest<StartDirectAccessResult>("/message-requests/start", {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function acceptMessageRequest(requestId: string, accessToken: string) {
  return apiRequest<{ request: DirectMessageRequest; conversation: Conversation }>(`/message-requests/${requestId}/accept`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function declineMessageRequest(requestId: string, accessToken: string) {
  return apiRequest<DirectMessageRequest>(`/message-requests/${requestId}/decline`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function getBlockedUsers(accessToken: string) {
  return apiRequest<BlockedUser[]>("/safety/blocks", {}, accessToken);
}

export function blockUser(targetUserId: string, accessToken: string) {
  return apiRequest<BlockedUser>(`/safety/blocks/${targetUserId}`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function unblockUser(targetUserId: string, accessToken: string) {
  return apiRequest<{ ok: true; targetUserId: string }>(`/safety/blocks/${targetUserId}`, {
    method: "DELETE"
  }, accessToken);
}

export function reportUser(
  input: {
    targetUserId: string;
    reason: string;
    details?: string;
    conversationId?: string;
    messageId?: string;
  },
  accessToken: string
) {
  return apiRequest<{
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
  }>("/safety/reports", {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function getModerators(accessToken: string) {
  return apiRequest<ModeratorSummary[]>("/safety/moderators", {}, accessToken);
}

export function createConversation(input: { type: "DIRECT" | "GROUP" | "CHANNEL"; title?: string; participantIds: string[] }, accessToken: string) {
  return apiRequest<Conversation>("/conversations", {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function addConversationMembers(conversationId: string, participantIds: string[], accessToken: string) {
  return apiRequest<Conversation>(`/conversations/${conversationId}/members`, {
    method: "POST",
    body: JSON.stringify({ participantIds })
  }, accessToken);
}

export function updateConversationMemberRole(
  conversationId: string,
  memberUserId: string,
  role: "ADMIN" | "MEMBER",
  accessToken: string
) {
  return apiRequest<Conversation>(`/conversations/${conversationId}/members/${memberUserId}`, {
    method: "PATCH",
    body: JSON.stringify({ role })
  }, accessToken);
}

export function transferConversationOwnership(conversationId: string, memberUserId: string, accessToken: string) {
  return apiRequest<Conversation>(`/conversations/${conversationId}/ownership`, {
    method: "POST",
    body: JSON.stringify({ memberUserId })
  }, accessToken);
}

export function createConversationInviteLink(conversationId: string, accessToken: string) {
  return apiRequest<ConversationInviteLink>(`/conversations/${conversationId}/invite-link`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function joinConversationByInvite(inviteCode: string, accessToken: string) {
  return apiRequest<Conversation>(`/conversations/join/${inviteCode}`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function leaveConversation(conversationId: string, accessToken: string) {
  return apiRequest<{ ok: true }>(`/conversations/${conversationId}/leave`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function deleteConversation(conversationId: string, accessToken: string) {
  return apiRequest<{ ok: true }>(`/conversations/${conversationId}`, {
    method: "DELETE"
  }, accessToken);
}

export function reportConversation(
  conversationId: string,
  input: {
    reason: string;
    details?: string;
  },
  accessToken: string
) {
  return apiRequest<{
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
  }>(`/conversations/${conversationId}/report`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function getMessages(conversationId: string, accessToken: string, input?: { cursor?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (input?.cursor) {
    params.set("cursor", input.cursor);
  }
  if (input?.limit) {
    params.set("limit", String(input.limit));
  }

  const query = params.toString();
  return apiRequest<MessagePage>(`/conversations/${conversationId}/messages${query ? `?${query}` : ""}`, {}, accessToken);
}

export function sendMessage(
  conversationId: string,
  body: string,
  accessToken: string,
  input?: {
    parentId?: string;
  }
) {
  return apiRequest<ChatMessage>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      body,
      ...(input?.parentId ? { parentId: input.parentId } : {})
    })
  }, accessToken);
}

export function prepareAttachmentUpload(
  conversationId: string,
  input: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    durationMs?: number;
  },
  accessToken: string
) {
  return apiRequest<PreparedUpload>(`/conversations/${conversationId}/messages/attachments/presign`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export async function uploadFileToSignedUrl(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    },
    body: file
  });

  if (!response.ok) {
    throw new Error(`Upload failed with ${response.status}`);
  }
}

export function sendAttachmentMessage(
  conversationId: string,
  input: {
    body?: string;
    parentId?: string;
    attachments: Array<{
      provider: "LOCAL" | "S3" | "CLOUDINARY";
      storageKey: string;
      url: string;
      mimeType: string;
      sizeBytes: number;
      width?: number;
      height?: number;
      durationMs?: number;
      checksum?: string;
    }>;
  },
  accessToken: string
) {
  return apiRequest<ChatMessage>(`/conversations/${conversationId}/messages/attachments`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateMessage(conversationId: string, messageId: string, body: string, accessToken: string) {
  return apiRequest<ChatMessage>(`/conversations/${conversationId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ body })
  }, accessToken);
}

export function deleteMessage(conversationId: string, messageId: string, accessToken: string) {
  return apiRequest<ChatMessage>(`/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE"
  }, accessToken);
}

export function toggleReaction(conversationId: string, messageId: string, emoji: string, accessToken: string) {
  return apiRequest<ChatMessage>(`/conversations/${conversationId}/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji })
  }, accessToken);
}

export function markConversationRead(conversationId: string, accessToken: string, messageId?: string) {
  return apiRequest<ChatMessage | { ok: true; messageId: null }>(`/conversations/${conversationId}/messages/read`, {
    method: "POST",
    body: JSON.stringify(messageId ? { messageId } : {})
  }, accessToken);
}

export function updateConversationState(
  conversationId: string,
  input: {
    archived?: boolean;
    locked?: boolean;
    pinned?: boolean;
    mutedUntil?: string | null;
  },
  accessToken: string
) {
  return apiRequest<Conversation>(`/conversations/${conversationId}/state`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function getCallHistory(conversationId: string, accessToken: string) {
  return apiRequest<CallRecord[]>(`/conversations/${conversationId}/calls`, {}, accessToken);
}

export function getRtcConfig(accessToken: string) {
  return apiRequest<RtcConfig>("/calls/rtc-config", {}, accessToken);
}

export function startCall(conversationId: string, type: "VOICE" | "VIDEO", accessToken: string) {
  return apiRequest<CallRecord>(`/conversations/${conversationId}/calls`, {
    method: "POST",
    body: JSON.stringify({ type })
  }, accessToken);
}

export function acceptCall(callId: string, accessToken: string) {
  return apiRequest<CallRecord>(`/calls/${callId}/accept`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function endCall(callId: string, accessToken: string) {
  return apiRequest<CallRecord>(`/calls/${callId}/end`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function getModerationReports(
  accessToken: string,
  input?: {
    status?: "OPEN" | "REVIEWED" | "DISMISSED";
    limit?: number;
  }
) {
  const params = new URLSearchParams();
  if (input?.status) {
    params.set("status", input.status);
  }
  if (input?.limit) {
    params.set("limit", String(input.limit));
  }

  const query = params.toString();
  return apiRequest<ModerationReport[]>(`/safety/reports/admin${query ? `?${query}` : ""}`, {}, accessToken);
}

export function updateModerationReport(
  reportId: string,
  input: {
    status?: "OPEN" | "REVIEWED" | "DISMISSED";
    assignedModeratorUserId?: string;
    moderatorNote?: string;
    resolutionNote?: string;
  },
  accessToken: string
) {
  return apiRequest<ModerationReport>(`/safety/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function getAdminOverview(accessToken: string) {
  return apiRequest<AdminOverview>("/admin/overview", {}, accessToken);
}

export function getAdminUsers(
  accessToken: string,
  input?: {
    q?: string;
    status?: "ACTIVE" | "SUSPENDED" | "DELETED";
    page?: number;
    pageSize?: number;
  }
) {
  const params = new URLSearchParams();
  if (input?.q?.trim()) {
    params.set("q", input.q.trim());
  }
  if (input?.status) {
    params.set("status", input.status);
  }
  if (input?.page) {
    params.set("page", String(input.page));
  }
  if (input?.pageSize) {
    params.set("pageSize", String(input.pageSize));
  }

  const query = params.toString();
  return apiRequest<AdminUserPage>(`/admin/users${query ? `?${query}` : ""}`, {}, accessToken);
}

export function getAdminActions(accessToken: string) {
  return apiRequest<AdminAction[]>("/admin/actions", {}, accessToken);
}

export function getAdminStatuses(
  accessToken: string,
  input?: {
    q?: string;
    state?: "ALL" | "LIVE" | "REMOVED" | "EXPIRED";
    page?: number;
    pageSize?: number;
  }
) {
  const params = new URLSearchParams();
  if (input?.q?.trim()) {
    params.set("q", input.q.trim());
  }
  if (input?.state && input.state !== "ALL") {
    params.set("state", input.state);
  }
  if (input?.page) {
    params.set("page", String(input.page));
  }
  if (input?.pageSize) {
    params.set("pageSize", String(input.pageSize));
  }

  const query = params.toString();
  return apiRequest<AdminStatusPage>(`/admin/statuses${query ? `?${query}` : ""}`, {}, accessToken);
}

export function updateAdminUserStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
  note: string | undefined,
  accessToken: string
) {
  return apiRequest<AdminUser>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note })
  }, accessToken);
}

export function updateAdminUserRoles(
  userId: string,
  roles: Array<"SITE_ADMIN" | "PLATFORM_ADMIN" | "MODERATOR">,
  accessToken: string
) {
  return apiRequest<AdminUser>(`/admin/users/${userId}/roles`, {
    method: "PATCH",
    body: JSON.stringify({ roles })
  }, accessToken);
}

export function registerPushSubscription(
  input: {
    endpoint: string;
    keys: {
      auth: string;
      p256dh: string;
    };
    userAgent?: string;
  },
  accessToken: string
) {
  return apiRequest<{ endpoint: string; id: string }>(
    "/notifications/push-subscriptions",
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    accessToken
  );
}

export function unregisterPushSubscription(endpoint: string, accessToken: string) {
  return apiRequest<{ ok: true }>(
    "/notifications/push-subscriptions",
    {
      method: "DELETE",
      body: JSON.stringify({ endpoint })
    },
    accessToken
  );
}
