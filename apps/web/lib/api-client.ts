export type DirectMessagePolicy = "OPEN" | "REQUESTS_ONLY";
export type ConversationCategory = "GENERAL" | "CHURCH" | "WORKSPACE" | "COMMUNITY" | "DEPARTMENT" | "CARE_TEAM";
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
  category: ConversationCategory;
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

export type ConversationToolPack = "CORE_WORKSPACE" | "COMMUNITY_CARE" | "BOARDS" | "ATTENDANCE";
export type ConversationToolRequestStatus = "PENDING" | "APPROVED" | "DECLINED";
export type ConversationNoteKind = "NOTE" | "ANNOUNCEMENT";
export type ConversationTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type ConversationTaskType = "TASK" | "FEATURE" | "BUG" | "IMPROVEMENT" | "FOLLOW_UP" | "REQUEST";
export type ConversationTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ConversationBoardSprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED";
export type PrayerRequestStatus = "OPEN" | "ANSWERED" | "ARCHIVED";
export type ConversationBoardTemplate = "KANBAN" | "SPRINT" | "CUSTOM";
export type ConversationBoardMemberRole = "MANAGER" | "EDITOR" | "CONTRIBUTOR" | "VIEWER";
export type ConversationAttendanceShiftStatus = "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ConversationAttendanceAssignmentStatus = "ASSIGNED" | "CONFIRMED" | "DECLINED" | "CALLED_OFF";
export type ConversationAttendanceClockEventType = "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT" | "ADJUSTMENT";
export type ConversationAttendanceClockMethod = "WEB" | "MOBILE" | "QR" | "NFC" | "PHOTO" | "MANUAL" | "KIOSK";
export type ConversationAttendanceRecordStatus = "ON_CLOCK" | "ON_BREAK" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ABSENT";
export type ConversationAttendanceExceptionFlag = "LATE" | "EARLY_LEAVE" | "OVERTIME" | "MISSED_CLOCK_OUT" | "LOCATION_EXCEPTION" | "MANUAL_REVIEW";
export type ConversationAttendanceLeaveType = "VACATION" | "SICK" | "PERSONAL" | "COMPASSIONATE" | "MINISTRY" | "HOLIDAY" | "UNPAID" | "OTHER";
export type ConversationAttendanceLeaveStatus = "DRAFT" | "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED";

export type ToolUser = {
  id: string;
  username: string;
  userCode: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type ConversationToolActivation = {
  id: string;
  pack: ConversationToolPack;
  activatedAt: string;
  activatedBy: ToolUser | null;
};

export type ConversationToolRequest = {
  id: string;
  pack: ConversationToolPack;
  status: ConversationToolRequestStatus;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  conversation: {
    id: string;
    type: Conversation["type"];
    category: ConversationCategory;
    title: string | null;
  };
  requestedBy: ToolUser;
  reviewedBy: ToolUser | null;
};

export type ConversationToolNote = {
  id: string;
  kind: ConversationNoteKind;
  audience: "ROOM" | "LEADS_ONLY" | "CARE_TEAM" | "FOLLOW_UP_TEAM" | "NEW_GUESTS";
  title: string;
  body: string;
  pinnedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ToolUser;
  updatedBy: ToolUser | null;
};

export type ConversationToolTask = {
  id: string;
  boardId: string | null;
  columnId: string | null;
  sprintId: string | null;
  taskNumber: number | null;
  taskCode: string | null;
  title: string;
  details: string | null;
  category: string | null;
  taskType: ConversationTaskType;
  priority: ConversationTaskPriority;
  storyPoints: number | null;
  score: number | null;
  sprintName: string | null;
  labels: string[];
  pinned: boolean;
  status: ConversationTaskStatus;
  sortOrder: number;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  board: {
    id: string;
    title: string;
    template: ConversationBoardTemplate;
    isDefault: boolean;
  } | null;
  column: {
    id: string;
    title: string;
    color: string | null;
    sortOrder: number;
    taskStatus: ConversationTaskStatus;
  } | null;
  sprint: {
    id: string;
    title: string;
    status: ConversationBoardSprintStatus;
    startsAt: string | null;
    endsAt: string | null;
  } | null;
  createdBy: ToolUser;
  assignedTo: ToolUser | null;
  sourceMessage: {
    id: string;
    body: string | null;
    type: ChatMessage["type"];
    createdAt: string;
    sender: ToolUser | null;
  } | null;
  counts: {
    attachments: number;
    comments: number;
    likes: number;
    watchers: number;
  };
  viewerHasLiked: boolean;
  viewerIsWatching: boolean;
};

export type ConversationToolTaskComment = {
  id: string;
  taskId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: ToolUser;
};

export type ConversationToolTaskAttachment = {
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
  createdAt: string;
  uploadedBy: ToolUser;
};

export type ConversationToolTaskDetail = ConversationToolTask & {
  attachments: ConversationToolTaskAttachment[];
  comments: ConversationToolTaskComment[];
};

export type ConversationToolPoll = {
  id: string;
  question: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  createdBy: ToolUser;
  totalVotes: number;
  viewerVoteOptionId: string | null;
  options: Array<{
    id: string;
    label: string;
    sortOrder: number;
    voteCount: number;
  }>;
};

export type ConversationPrayerUpdate = {
  id: string;
  body: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  author: ToolUser;
};

export type ConversationPrayerRequest = {
  id: string;
  requestType: "PRAYER" | "FOLLOW_UP" | "VISITATION" | "COUNSELING" | "SUPPORT" | "WELFARE" | "GUEST";
  visibility: "PRIVATE" | "CARE_TEAM" | "ROOM";
  priority: ConversationTaskPriority;
  subjectName: string | null;
  subjectContact: string | null;
  title: string;
  body: string;
  status: PrayerRequestStatus;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  answeredAt: string | null;
  resolvedAt: string | null;
  createdBy: ToolUser;
  assignedTo: ToolUser | null;
  supportCount: number;
  viewerSupported: boolean;
  updates: ConversationPrayerUpdate[];
};

export type ConversationAttendanceClockEvent = {
  id: string;
  eventType: ConversationAttendanceClockEventType;
  method: ConversationAttendanceClockMethod;
  occurredAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  proofUrl: string | null;
  proofProvider: "LOCAL" | "S3" | "CLOUDINARY" | null;
  qrValue: string | null;
  stationCode: string | null;
  deviceLabel: string | null;
  note: string | null;
  createdAt: string;
  actor: ToolUser;
};

export type ConversationAttendanceRecord = {
  id: string;
  shiftId: string;
  assignmentId: string | null;
  userId: string;
  status: ConversationAttendanceRecordStatus;
  flags: ConversationAttendanceExceptionFlag[];
  clockInAt: string | null;
  clockOutAt: string | null;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  user: ToolUser;
  reviewedBy: ToolUser | null;
  clockEvents: ConversationAttendanceClockEvent[];
};

export type ConversationAttendanceAssignment = {
  id: string;
  userId: string;
  status: ConversationAttendanceAssignmentStatus;
  createdAt: string;
  updatedAt: string;
  user: ToolUser;
  assignedBy: ToolUser | null;
  record: ConversationAttendanceRecord | null;
};

export type ConversationAttendanceShiftTemplate = {
  id: string;
  title: string;
  description: string | null;
  locationName: string | null;
  locationAddress: string | null;
  startsAtTime: string;
  endsAtTime: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  daysOfWeek: number[];
  requiresLocation: boolean;
  requiresPhoto: boolean;
  requiresQr: boolean;
  requiresNfc: boolean;
  geofenceLatitude: number | null;
  geofenceLongitude: number | null;
  geofenceRadiusM: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: ToolUser;
};

export type ConversationAttendanceShift = {
  id: string;
  templateId: string | null;
  title: string;
  notes: string | null;
  locationName: string | null;
  locationAddress: string | null;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  approvalRequired: boolean;
  status: ConversationAttendanceShiftStatus;
  requiresLocation: boolean;
  requiresPhoto: boolean;
  requiresQr: boolean;
  requiresNfc: boolean;
  stationCode: string | null;
  geofenceLatitude: number | null;
  geofenceLongitude: number | null;
  geofenceRadiusM: number | null;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    title: string;
    startsAtTime: string;
    endsAtTime: string;
  } | null;
  createdBy: ToolUser;
  assignmentCount: number;
  recordCount: number;
  assignments: ConversationAttendanceAssignment[];
  records: ConversationAttendanceRecord[];
};

export type ConversationAttendancePolicy = {
  id: string;
  timezone: string;
  standardHoursPerDay: number;
  standardHoursPerWeek: number;
  overtimeAfterMinutes: number;
  doubleTimeAfterMinutes: number;
  lateGraceMinutes: number;
  breakRequiredAfterMinutes: number;
  breakDurationMinutes: number;
  allowSelfClock: boolean;
  allowManualAdjustments: boolean;
  requireSupervisorApproval: boolean;
  requireLocation: boolean;
  requirePhoto: boolean;
  requireQr: boolean;
  requireNfc: boolean;
  stationLabel: string | null;
  stationCode: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ToolUser;
  updatedBy: ToolUser | null;
};

export type ConversationAttendanceHoliday = {
  id: string;
  policyId: string | null;
  title: string;
  description: string | null;
  startsOn: string;
  endsOn: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: ToolUser;
};

export type ConversationAttendanceLeaveRequest = {
  id: string;
  policyId: string | null;
  userId: string;
  leaveType: ConversationAttendanceLeaveType;
  status: ConversationAttendanceLeaveStatus;
  title: string;
  reason: string | null;
  startsAt: string;
  endsAt: string;
  minutesRequested: number;
  isPartialDay: boolean;
  deductFromBalance: boolean;
  reviewNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: ToolUser;
  reviewedBy: ToolUser | null;
};

export type ConversationAttendanceMemberHistory = {
  member: {
    id: string;
    username: string;
    userCode: string | null;
    displayName: string;
    avatarUrl: string | null;
  };
  summary: {
    scheduledShifts: number;
    completedShifts: number;
    workedMinutes: number;
    overtimeMinutes: number;
    lateCount: number;
    exceptionCount: number;
    approvedLeaveCount: number;
    pendingLeaveCount: number;
  };
  recentRecords: ConversationAttendanceRecord[];
  leaveRequests: ConversationAttendanceLeaveRequest[];
  upcomingAssignments: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: ConversationAttendanceShiftStatus;
    assignmentCount: number;
    recordCount: number;
  }>;
};

export type ConversationAttendanceExportSummary = {
  range: {
    from: string;
    to: string;
  };
  totals: {
    memberCount: number;
    recordCount: number;
    approvedLeaveCount: number;
    totalWorkedMinutes: number;
    totalOvertimeMinutes: number;
  };
  rows: Array<{
    userId: string;
    member: string;
    code: string;
    workedMinutes: number;
    breakMinutes: number;
    overtimeMinutes: number;
    lateCount: number;
    exceptionCount: number;
    approvedLeaveMinutes: number;
    pendingLeaveMinutes: number;
  }>;
  csv: string;
};

export type ConversationToolPackCatalogItem = {
  pack: ConversationToolPack;
  title: string;
  subtitle: string;
  recommendedCategories: ConversationCategory[];
};

export type ConversationBoardMember = {
  id: string;
  role: ConversationBoardMemberRole;
  createdAt: string;
  updatedAt: string;
  user: ToolUser;
  addedBy: ToolUser | null;
};

export type ConversationBoardSprint = {
  id: string;
  boardId: string;
  title: string;
  goal: string | null;
  status: ConversationBoardSprintStatus;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: ToolUser;
};

export type ConversationBoardColumn = {
  id: string;
  title: string;
  color: string | null;
  sortOrder: number;
  taskStatus: ConversationTaskStatus;
  createdAt: string;
  updatedAt: string;
  tasks: ConversationToolTask[];
};

export type ConversationBoard = {
  id: string;
  title: string;
  description: string | null;
  codePrefix: string;
  template: ConversationBoardTemplate;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: ToolUser;
  viewerRole: ConversationBoardMemberRole | null;
  canManage: boolean;
  canManageMembers: boolean;
  canContribute: boolean;
  memberCount: number;
  taskCount: number;
  members: ConversationBoardMember[];
  sprints: ConversationBoardSprint[];
  columns: ConversationBoardColumn[];
};

export type ConversationToolsWorkspace = {
  conversation: {
    id: string;
    type: Conversation["type"];
    category: ConversationCategory;
    title: string | null;
    participantCount: number;
    participants: Conversation["participants"];
  };
  access: {
    canManage: boolean;
    canRequest: boolean;
  };
  packCatalog: ConversationToolPackCatalogItem[];
  activePacks: ConversationToolActivation[];
  requests: ConversationToolRequest[];
  dashboard: {
    boardCount: number;
    openTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    noteCount: number;
    announcementCount: number;
    livePollCount: number;
    prayerCount: number;
    careAssignedCount: number;
    urgentCareCount: number;
    attendanceTemplateCount: number;
    scheduledShiftCount: number;
    onClockCount: number;
    pendingAttendanceApprovals: number;
    holidayCount: number;
    pendingLeaveApprovals: number;
    approvedLeaveCount: number;
    attendanceExceptionCount: number;
    dueFollowUpCount: number;
    defaultBoard: {
      id: string;
      title: string;
      codePrefix: string;
      template: ConversationBoardTemplate;
      isDefault: boolean;
      memberCount: number;
      taskCount: number;
    } | null;
    latestAnnouncement: ConversationToolNote | null;
    nextTask: ConversationToolTask | null;
    activePoll: ConversationToolPoll | null;
    latestPrayer: ConversationPrayerRequest | null;
    nextShift: {
      id: string;
      title: string;
      startsAt: string;
      endsAt: string;
      status: ConversationAttendanceShiftStatus;
      assignmentCount: number;
      recordCount: number;
    } | null;
  };
  notes: ConversationToolNote[];
  tasks: ConversationToolTask[];
  boards: ConversationBoard[];
  polls: ConversationToolPoll[];
  prayerRequests: ConversationPrayerRequest[];
  attendanceTemplates: ConversationAttendanceShiftTemplate[];
  attendanceShifts: ConversationAttendanceShift[];
  attendanceRecords: ConversationAttendanceRecord[];
  attendancePolicy: ConversationAttendancePolicy | null;
  attendanceHolidays: ConversationAttendanceHoliday[];
  attendanceLeaveRequests: ConversationAttendanceLeaveRequest[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const AUTH_SESSION_REFRESH_EVENT = "omochat:session-refreshed";
let refreshSessionPromise: Promise<AuthSession> | null = null;
type ApiRequestError = Error & { status?: number };

function dispatchSessionRefresh(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthSession>(AUTH_SESSION_REFRESH_EVENT, {
      detail: session
    })
  );
}

export function subscribeToSessionRefresh(listener: (session: AuthSession) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleEvent = (event: Event) => {
    const nextSession = (event as CustomEvent<AuthSession>).detail;
    if (nextSession) {
      listener(nextSession);
    }
  };

  window.addEventListener(AUTH_SESSION_REFRESH_EVENT, handleEvent);
  return () => window.removeEventListener(AUTH_SESSION_REFRESH_EVENT, handleEvent);
}

async function performRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
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
    let message = `Request failed with ${response.status}`;

    if (text) {
      let parsed: { message?: string | string[] } | null = null;
      try {
        parsed = JSON.parse(text) as { message?: string | string[] };
      } catch {
        parsed = null;
      }

      if (Array.isArray(parsed?.message)) {
        message = parsed.message.join(", ");
      } else if (typeof parsed?.message === "string") {
        message = parsed.message;
      } else {
        message = text;
      }
    }

    const error = new Error(message) as ApiRequestError;
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

async function refreshSessionWithLock() {
  if (!refreshSessionPromise) {
    refreshSessionPromise = performRequest<AuthSession>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({})
    }).then((session) => {
      dispatchSessionRefresh(session);
      return session;
    }).finally(() => {
      refreshSessionPromise = null;
    });
  }

  return refreshSessionPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  try {
    return await performRequest<T>(path, init, accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = typeof error === "object" && error && "status" in error ? (error as ApiRequestError).status : undefined;
    const canRetryWithRefresh =
      Boolean(accessToken) &&
      path !== "/auth/refresh" &&
      path !== "/auth/login" &&
      path !== "/auth/register" &&
      path !== "/auth/logout" &&
      (status === 401 ||
        message === "Unauthorized" ||
        message === "Invalid refresh token" ||
        message === "Missing refresh token" ||
        message.includes("401"));

    if (!canRetryWithRefresh) {
      throw error;
    }

    const nextSession = await refreshSessionWithLock();
    return performRequest<T>(path, init, nextSession.accessToken);
  }
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
  return refreshSessionWithLock();
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

export function createConversation(
  input: {
    type: "DIRECT" | "GROUP" | "CHANNEL";
    title?: string;
    category?: ConversationCategory;
    participantIds: string[];
  },
  accessToken: string
) {
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

export function getConversationToolsWorkspace(conversationId: string, accessToken: string) {
  return apiRequest<ConversationToolsWorkspace>(`/conversations/${conversationId}/tools`, {}, accessToken);
}

export function requestConversationToolPack(
  conversationId: string,
  input: {
    pack: ConversationToolPack;
    note?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolRequest>(`/conversations/${conversationId}/tools/requests`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationBoard(
  conversationId: string,
  input: {
    title: string;
    description?: string;
    template?: ConversationBoardTemplate;
    columns?: Array<{
      title: string;
      color?: string;
      taskStatus?: ConversationTaskStatus;
      sortOrder?: number;
    }>;
  },
  accessToken: string
) {
  return apiRequest<ConversationBoard>(`/conversations/${conversationId}/tools/boards`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationBoard(
  conversationId: string,
  boardId: string,
  input: {
    title?: string;
    description?: string;
    template?: ConversationBoardTemplate;
    isDefault?: boolean;
  },
  accessToken: string
) {
  return apiRequest<ConversationBoard>(`/conversations/${conversationId}/tools/boards/${boardId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function deleteConversationBoard(
  conversationId: string,
  boardId: string,
  accessToken: string
) {
  return apiRequest<{ ok: true }>(`/conversations/${conversationId}/tools/boards/${boardId}`, {
    method: "DELETE"
  }, accessToken);
}

export function addConversationBoardMember(
  conversationId: string,
  boardId: string,
  input: {
    userId: string;
    role?: ConversationBoardMemberRole;
  },
  accessToken: string
) {
  return apiRequest<ConversationBoard>(`/conversations/${conversationId}/tools/boards/${boardId}/members`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationBoardSprint(
  conversationId: string,
  boardId: string,
  input: {
    title: string;
    goal?: string;
    status?: ConversationBoardSprintStatus;
    startsAt?: string;
    endsAt?: string;
    sortOrder?: number;
  },
  accessToken: string
) {
  return apiRequest<ConversationBoard>(`/conversations/${conversationId}/tools/boards/${boardId}/sprints`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationBoardSprint(
  conversationId: string,
  boardId: string,
  sprintId: string,
  input: {
    title?: string;
    goal?: string | null;
    status?: ConversationBoardSprintStatus;
    startsAt?: string | null;
    endsAt?: string | null;
    sortOrder?: number;
  },
  accessToken: string
) {
  return apiRequest<ConversationBoard>(`/conversations/${conversationId}/tools/boards/${boardId}/sprints/${sprintId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function deleteConversationBoardSprint(
  conversationId: string,
  boardId: string,
  sprintId: string,
  accessToken: string
) {
  return apiRequest<{ ok: true }>(`/conversations/${conversationId}/tools/boards/${boardId}/sprints/${sprintId}`, {
    method: "DELETE"
  }, accessToken);
}

export function updateConversationBoardMember(
  conversationId: string,
  boardId: string,
  memberUserId: string,
  role: ConversationBoardMemberRole,
  accessToken: string
) {
  return apiRequest<ConversationBoard>(`/conversations/${conversationId}/tools/boards/${boardId}/members/${memberUserId}`, {
    method: "PATCH",
    body: JSON.stringify({ role })
  }, accessToken);
}

export function removeConversationBoardMember(
  conversationId: string,
  boardId: string,
  memberUserId: string,
  accessToken: string
) {
  return apiRequest<{ ok: true }>(`/conversations/${conversationId}/tools/boards/${boardId}/members/${memberUserId}`, {
    method: "DELETE"
  }, accessToken);
}

export function createConversationBoardColumn(
  conversationId: string,
  boardId: string,
  input: {
    title: string;
    color?: string;
    taskStatus?: ConversationTaskStatus;
    sortOrder?: number;
  },
  accessToken: string
) {
  return apiRequest<ConversationBoard>(`/conversations/${conversationId}/tools/boards/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationBoardColumn(
  conversationId: string,
  boardId: string,
  columnId: string,
  input: {
    title?: string;
    color?: string;
    taskStatus?: ConversationTaskStatus;
    sortOrder?: number;
  },
  accessToken: string
) {
  return apiRequest<ConversationBoard>(`/conversations/${conversationId}/tools/boards/${boardId}/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function deleteConversationBoardColumn(
  conversationId: string,
  boardId: string,
  columnId: string,
  accessToken: string
) {
  return apiRequest<{ ok: true }>(`/conversations/${conversationId}/tools/boards/${boardId}/columns/${columnId}`, {
    method: "DELETE"
  }, accessToken);
}

export function createConversationToolNote(
  conversationId: string,
  input: {
    kind: ConversationNoteKind;
    title: string;
    body: string;
    audience?: "ROOM" | "LEADS_ONLY" | "CARE_TEAM" | "FOLLOW_UP_TEAM" | "NEW_GUESTS";
    pinned?: boolean;
    expiresAt?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolNote>(`/conversations/${conversationId}/tools/notes`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationToolNote(
  conversationId: string,
  noteId: string,
  input: {
    kind?: ConversationNoteKind;
    title?: string;
    body?: string;
    audience?: "ROOM" | "LEADS_ONLY" | "CARE_TEAM" | "FOLLOW_UP_TEAM" | "NEW_GUESTS";
    pinned?: boolean;
    expiresAt?: string | null;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolNote>(`/conversations/${conversationId}/tools/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function deleteConversationToolNote(conversationId: string, noteId: string, accessToken: string) {
  return apiRequest<{ ok: true }>(`/conversations/${conversationId}/tools/notes/${noteId}`, {
    method: "DELETE"
  }, accessToken);
}

export function createConversationToolTask(
  conversationId: string,
  input: {
    title: string;
    details?: string;
    category?: string;
    taskType?: ConversationTaskType;
    priority?: ConversationTaskPriority;
    storyPoints?: number;
    score?: number;
    sprintName?: string;
    sprintId?: string;
    labels?: string[];
    pinned?: boolean;
    dueAt?: string;
    assignedToUserId?: string;
    boardId?: string;
    columnId?: string;
    sortOrder?: number;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolTask>(`/conversations/${conversationId}/tools/tasks`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationToolTaskFromMessage(
  conversationId: string,
  input: {
    messageId: string;
    title?: string;
    category?: string;
    taskType?: ConversationTaskType;
    priority?: ConversationTaskPriority;
    storyPoints?: number;
    score?: number;
    sprintName?: string;
    sprintId?: string;
    labels?: string[];
    pinned?: boolean;
    dueAt?: string;
    assignedToUserId?: string;
    boardId?: string;
    columnId?: string;
    sortOrder?: number;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolTask>(`/conversations/${conversationId}/tools/tasks/from-message`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationToolTask(
  conversationId: string,
  taskId: string,
  input: {
    title?: string;
    details?: string;
    category?: string;
    taskType?: ConversationTaskType;
    priority?: ConversationTaskPriority;
    storyPoints?: number;
    score?: number;
    sprintName?: string;
    sprintId?: string | null;
    labels?: string[];
    pinned?: boolean;
    status?: ConversationTaskStatus;
    dueAt?: string;
    assignedToUserId?: string;
    boardId?: string;
    columnId?: string;
    sortOrder?: number;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolTask>(`/conversations/${conversationId}/tools/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function getConversationToolTask(
  conversationId: string,
  taskId: string,
  accessToken: string
) {
  return apiRequest<ConversationToolTaskDetail>(`/conversations/${conversationId}/tools/tasks/${taskId}`, {}, accessToken);
}

export function toggleConversationToolTaskWatch(
  conversationId: string,
  taskId: string,
  accessToken: string
) {
  return apiRequest<ConversationToolTaskDetail>(`/conversations/${conversationId}/tools/tasks/${taskId}/watch`, {
    method: "POST"
  }, accessToken);
}

export function toggleConversationToolTaskLike(
  conversationId: string,
  taskId: string,
  accessToken: string
) {
  return apiRequest<ConversationToolTaskDetail>(`/conversations/${conversationId}/tools/tasks/${taskId}/likes`, {
    method: "POST"
  }, accessToken);
}

export function createConversationToolTaskComment(
  conversationId: string,
  taskId: string,
  input: {
    body: string;
    parentId?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolTaskDetail>(`/conversations/${conversationId}/tools/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationToolTaskAttachment(
  conversationId: string,
  taskId: string,
  input: {
    provider: "LOCAL" | "S3" | "CLOUDINARY";
    bucket?: string;
    storageKey: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    durationMs?: number;
    checksum?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolTaskDetail>(`/conversations/${conversationId}/tools/tasks/${taskId}/attachments`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function deleteConversationToolTask(conversationId: string, taskId: string, accessToken: string) {
  return apiRequest<{ ok: true }>(`/conversations/${conversationId}/tools/tasks/${taskId}`, {
    method: "DELETE"
  }, accessToken);
}

export function createConversationToolPoll(
  conversationId: string,
  input: {
    question: string;
    options: string[];
  },
  accessToken: string
) {
  return apiRequest<ConversationToolPoll>(`/conversations/${conversationId}/tools/polls`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function voteConversationToolPoll(conversationId: string, pollId: string, optionId: string, accessToken: string) {
  return apiRequest<ConversationToolPoll>(`/conversations/${conversationId}/tools/polls/${pollId}/votes`, {
    method: "POST",
    body: JSON.stringify({ optionId })
  }, accessToken);
}

export function updateConversationToolPoll(
  conversationId: string,
  pollId: string,
  input: {
    closed?: boolean;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolPoll>(`/conversations/${conversationId}/tools/polls/${pollId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationPrayerRequest(
  conversationId: string,
  input: {
    title: string;
    body: string;
    requestType?: "PRAYER" | "FOLLOW_UP" | "VISITATION" | "COUNSELING" | "SUPPORT" | "WELFARE" | "GUEST";
    visibility?: "PRIVATE" | "CARE_TEAM" | "ROOM";
    priority?: ConversationTaskPriority;
    subjectName?: string;
    subjectContact?: string;
    assignedToUserId?: string;
    followUpAt?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationPrayerRequest>(`/conversations/${conversationId}/tools/prayer-requests`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationPrayerRequest(
  conversationId: string,
  prayerRequestId: string,
  input: {
    status?: PrayerRequestStatus;
    title?: string;
    body?: string;
    requestType?: "PRAYER" | "FOLLOW_UP" | "VISITATION" | "COUNSELING" | "SUPPORT" | "WELFARE" | "GUEST";
    visibility?: "PRIVATE" | "CARE_TEAM" | "ROOM";
    priority?: ConversationTaskPriority;
    subjectName?: string;
    subjectContact?: string;
    assignedToUserId?: string | null;
    followUpAt?: string | null;
  },
  accessToken: string
) {
  return apiRequest<ConversationPrayerRequest>(`/conversations/${conversationId}/tools/prayer-requests/${prayerRequestId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function toggleConversationPrayerSupport(conversationId: string, prayerRequestId: string, accessToken: string) {
  return apiRequest<ConversationPrayerRequest>(`/conversations/${conversationId}/tools/prayer-requests/${prayerRequestId}/support`, {
    method: "POST",
    body: JSON.stringify({})
  }, accessToken);
}

export function createConversationPrayerUpdate(
  conversationId: string,
  prayerRequestId: string,
  input: {
    body: string;
    isPrivate?: boolean;
  },
  accessToken: string
) {
  return apiRequest<ConversationPrayerRequest>(`/conversations/${conversationId}/tools/prayer-requests/${prayerRequestId}/updates`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationAttendanceTemplate(
  conversationId: string,
  input: {
    title: string;
    description?: string;
    locationName?: string;
    locationAddress?: string;
    startsAtTime: string;
    endsAtTime: string;
    breakMinutes?: number;
    gracePeriodMinutes?: number;
    daysOfWeek?: number[];
    requiresLocation?: boolean;
    requiresPhoto?: boolean;
    requiresQr?: boolean;
    requiresNfc?: boolean;
    geofenceLatitude?: number;
    geofenceLongitude?: number;
    geofenceRadiusM?: number;
    isActive?: boolean;
  },
  accessToken: string
) {
  return apiRequest<ConversationAttendanceShiftTemplate>(`/conversations/${conversationId}/tools/attendance/templates`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationAttendanceTemplate(
  conversationId: string,
  templateId: string,
  input: Partial<{
    title: string;
    description: string | null;
    locationName: string | null;
    locationAddress: string | null;
    startsAtTime: string;
    endsAtTime: string;
    breakMinutes: number;
    gracePeriodMinutes: number;
    daysOfWeek: number[];
    requiresLocation: boolean;
    requiresPhoto: boolean;
    requiresQr: boolean;
    requiresNfc: boolean;
    geofenceLatitude: number | null;
    geofenceLongitude: number | null;
    geofenceRadiusM: number | null;
    isActive: boolean;
  }>,
  accessToken: string
) {
  return apiRequest<ConversationAttendanceShiftTemplate>(`/conversations/${conversationId}/tools/attendance/templates/${templateId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationAttendanceShift(
  conversationId: string,
  input: {
    title: string;
    templateId?: string;
    notes?: string;
    startsAt: string;
    endsAt: string;
    locationName?: string;
    locationAddress?: string;
    breakMinutes?: number;
    gracePeriodMinutes?: number;
    approvalRequired?: boolean;
    status?: ConversationAttendanceShiftStatus;
    requiresLocation?: boolean;
    requiresPhoto?: boolean;
    requiresQr?: boolean;
    requiresNfc?: boolean;
    stationCode?: string | null;
    geofenceLatitude?: number;
    geofenceLongitude?: number;
    geofenceRadiusM?: number;
  },
  accessToken: string
) {
  return apiRequest<ConversationAttendanceShift>(`/conversations/${conversationId}/tools/attendance/shifts`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationAttendanceShift(
  conversationId: string,
  shiftId: string,
  input: Partial<{
    title: string;
    templateId: string | null;
    notes: string | null;
    startsAt: string;
    endsAt: string;
    locationName: string | null;
    locationAddress: string | null;
    breakMinutes: number;
    gracePeriodMinutes: number;
    approvalRequired: boolean;
    status: ConversationAttendanceShiftStatus;
    requiresLocation: boolean;
    requiresPhoto: boolean;
    requiresQr: boolean;
    requiresNfc: boolean;
    stationCode: string | null;
    geofenceLatitude: number | null;
    geofenceLongitude: number | null;
    geofenceRadiusM: number | null;
  }>,
  accessToken: string
) {
  return apiRequest<ConversationAttendanceShift>(`/conversations/${conversationId}/tools/attendance/shifts/${shiftId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationAttendanceAssignment(
  conversationId: string,
  shiftId: string,
  input: {
    userId: string;
    status?: ConversationAttendanceAssignmentStatus;
  },
  accessToken: string
) {
  return apiRequest<ConversationAttendanceShift>(`/conversations/${conversationId}/tools/attendance/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationAttendanceAssignment(
  conversationId: string,
  shiftId: string,
  assignmentId: string,
  status: ConversationAttendanceAssignmentStatus,
  accessToken: string
) {
  return apiRequest<ConversationAttendanceShift>(`/conversations/${conversationId}/tools/attendance/shifts/${shiftId}/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  }, accessToken);
}

export function createConversationAttendanceClockEvent(
  conversationId: string,
  shiftId: string,
  input: {
    eventType: ConversationAttendanceClockEventType;
    method?: ConversationAttendanceClockMethod;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    proofUrl?: string;
    proofProvider?: "LOCAL" | "S3" | "CLOUDINARY";
    qrValue?: string;
    stationCode?: string;
    deviceLabel?: string;
    note?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationAttendanceRecord>(`/conversations/${conversationId}/tools/attendance/shifts/${shiftId}/clock`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function reviewConversationAttendanceRecord(
  conversationId: string,
  recordId: string,
  input: {
    status: ConversationAttendanceRecordStatus;
    reviewNote?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationAttendanceRecord>(`/conversations/${conversationId}/tools/attendance/records/${recordId}/review`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationAttendancePolicy(
  conversationId: string,
  input: Partial<{
    timezone: string;
    standardHoursPerDay: number;
    standardHoursPerWeek: number;
    overtimeAfterMinutes: number;
    doubleTimeAfterMinutes: number;
    lateGraceMinutes: number;
    breakRequiredAfterMinutes: number;
    breakDurationMinutes: number;
    allowSelfClock: boolean;
    allowManualAdjustments: boolean;
    requireSupervisorApproval: boolean;
    requireLocation: boolean;
    requirePhoto: boolean;
    requireQr: boolean;
    requireNfc: boolean;
    stationLabel: string | null;
    stationCode: string | null;
  }>,
  accessToken: string
) {
  return apiRequest<ConversationAttendancePolicy>(`/conversations/${conversationId}/tools/attendance/policy`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationAttendanceHoliday(
  conversationId: string,
  input: {
    title: string;
    description?: string;
    startsOn: string;
    endsOn: string;
    isPaid?: boolean;
  },
  accessToken: string
) {
  return apiRequest<ConversationAttendanceHoliday>(`/conversations/${conversationId}/tools/attendance/holidays`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function updateConversationAttendanceHoliday(
  conversationId: string,
  holidayId: string,
  input: Partial<{
    title: string;
    description: string | null;
    startsOn: string;
    endsOn: string;
    isPaid: boolean;
  }>,
  accessToken: string
) {
  return apiRequest<ConversationAttendanceHoliday>(`/conversations/${conversationId}/tools/attendance/holidays/${holidayId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function createConversationAttendanceLeaveRequest(
  conversationId: string,
  input: {
    title: string;
    reason?: string;
    leaveType?: ConversationAttendanceLeaveType;
    startsAt: string;
    endsAt: string;
    isPartialDay?: boolean;
    deductFromBalance?: boolean;
    userId?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationAttendanceLeaveRequest>(`/conversations/${conversationId}/tools/attendance/leave-requests`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
}

export function reviewConversationAttendanceLeaveRequest(
  conversationId: string,
  leaveRequestId: string,
  input: {
    status: Extract<ConversationAttendanceLeaveStatus, "APPROVED" | "DECLINED" | "CANCELLED">;
    reviewNote?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationAttendanceLeaveRequest>(`/conversations/${conversationId}/tools/attendance/leave-requests/${leaveRequestId}/review`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }, accessToken);
}

export function getConversationAttendanceMemberHistory(
  conversationId: string,
  memberUserId: string,
  accessToken: string
) {
  return apiRequest<ConversationAttendanceMemberHistory>(`/conversations/${conversationId}/tools/attendance/history/${memberUserId}`, {}, accessToken);
}

export function exportConversationAttendance(
  conversationId: string,
  accessToken: string,
  input?: {
    from?: string;
    to?: string;
    userId?: string;
  }
) {
  const params = new URLSearchParams();
  if (input?.from) {
    params.set("from", input.from);
  }
  if (input?.to) {
    params.set("to", input.to);
  }
  if (input?.userId) {
    params.set("userId", input.userId);
  }

  const query = params.toString();
  return apiRequest<ConversationAttendanceExportSummary>(`/conversations/${conversationId}/tools/attendance/export${query ? `?${query}` : ""}`, {}, accessToken);
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

export function getAdminToolRequests(
  accessToken: string,
  input?: {
    status?: ConversationToolRequestStatus;
  }
) {
  const params = new URLSearchParams();
  if (input?.status) {
    params.set("status", input.status);
  }

  const query = params.toString();
  return apiRequest<ConversationToolRequest[]>(`/admin/tool-requests${query ? `?${query}` : ""}`, {}, accessToken);
}

export function reviewAdminToolRequest(
  requestId: string,
  input: {
    status: Exclude<ConversationToolRequestStatus, "PENDING">;
    reviewNote?: string;
  },
  accessToken: string
) {
  return apiRequest<ConversationToolRequest>(`/admin/tool-requests/${requestId}/review`, {
    method: "POST",
    body: JSON.stringify(input)
  }, accessToken);
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
