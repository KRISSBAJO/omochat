import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CareRequestVisibility,
  CareRequestType,
  ConversationAnnouncementAudience,
  ConversationAttendanceAssignmentStatus,
  ConversationAttendanceAuditAction,
  ConversationAttendanceClockEventType,
  ConversationAttendanceClockMethod,
  ConversationAttendanceExportVariant,
  ConversationAttendanceExceptionFlag,
  ConversationAttendanceHolidayScope,
  ConversationAttendanceLeaveAccrualCadence,
  ConversationAttendanceLeaveBalanceEntryType,
  ConversationAttendanceLeaveStatus,
  ConversationAttendanceLeaveType,
  ConversationAttendanceRecordStatus,
  ConversationAttendanceRotaFrequency,
  ConversationAttendanceShiftStatus,
  ConversationBoardMemberRole,
  ConversationBoardSprintStatus,
  ConversationBoardTemplate,
  ConversationCategory,
  ConversationNoteKind,
  ConversationTaskPriority,
  ConversationTaskStatus,
  ConversationTaskType,
  ConversationToolPack,
  ConversationToolRequestStatus,
  ParticipantRole,
  Prisma,
  PrayerRequestStatus
} from "@omochat/db";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ConversationsService } from "../conversations/conversations.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdjustConversationAttendanceLeaveBalanceDto,
  AddConversationBoardMemberDto,
  ApplyConversationAttendanceAccrualDto,
  CreateConversationAttendanceAssignmentDto,
  CreateConversationAttendanceClockEventDto,
  CreateConversationAttendanceHolidayDto,
  CreateConversationAttendanceLeavePolicyDto,
  CreateConversationAttendanceLeaveRequestDto,
  CreateConversationAttendanceRotaRunDto,
  CreateConversationAttendanceShiftDto,
  CreateConversationAttendanceShiftTemplateDto,
  CreateConversationBoardColumnDto,
  CreateConversationBoardDto,
  CreateConversationBoardSprintDto,
  CreateConversationPrayerRequestDto,
  CreateConversationPrayerUpdateDto,
  CreateConversationToolTaskAttachmentDto,
  CreateConversationToolTaskCommentDto,
  CreateConversationToolNoteDto,
  CreateConversationToolPollDto,
  CreateConversationToolRequestDto,
  CreateConversationToolTaskDto,
  CreateConversationToolTaskFromMessageDto,
  ListConversationAttendanceExportQueryDto,
  ListAdminToolRequestsQueryDto,
  ReviewConversationAttendanceLeaveRequestDto,
  ReviewConversationAttendanceRecordDto,
  ReviewConversationToolRequestDto,
  UpdateConversationAttendanceHolidayDto,
  UpdateConversationAttendanceLeavePolicyDto,
  UpdateConversationAttendancePolicyDto,
  UpdateConversationAttendanceAssignmentDto,
  UpdateConversationAttendanceShiftDto,
  UpdateConversationAttendanceShiftTemplateDto,
  UpdateConversationBoardColumnDto,
  UpdateConversationBoardDto,
  UpdateConversationBoardMemberDto,
  UpdateConversationBoardSprintDto,
  UpdateConversationPrayerRequestDto,
  UpdateConversationToolNoteDto,
  UpdateConversationToolPollDto,
  UpdateConversationToolTaskDto,
  VoteConversationToolPollDto
} from "./tools.dto";
import {
  createBoardBlueprint,
  defaultBoardTemplateForCategory,
  formatToolPackLabel,
  listToolPackCatalog
} from "./tools.registry";

const toolUserSelect = {
  id: true,
  username: true,
  userCode: true,
  displayName: true,
  avatarUrl: true
} as const;

const toolRequestSelect = {
  id: true,
  conversationId: true,
  requestedByUserId: true,
  reviewedByUserId: true,
  pack: true,
  status: true,
  note: true,
  reviewNote: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  conversation: {
    select: {
      id: true,
      type: true,
      category: true,
      title: true
    }
  },
  requestedBy: {
    select: toolUserSelect
  },
  reviewedBy: {
    select: toolUserSelect
  }
} as const;

const toolActivationSelect = {
  id: true,
  conversationId: true,
  pack: true,
  activatedAt: true,
  activatedBy: {
    select: toolUserSelect
  }
} as const;

const toolNoteSelect = {
  id: true,
  conversationId: true,
  kind: true,
  audience: true,
  title: true,
  body: true,
  pinnedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: toolUserSelect
  },
  updatedBy: {
    select: toolUserSelect
  }
} as const;

const prayerUpdateSelect = {
  id: true,
  prayerRequestId: true,
  body: true,
  isPrivate: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: toolUserSelect
  }
} as const;

const boardSprintSelect = {
  id: true,
  boardId: true,
  title: true,
  goal: true,
  status: true,
  startsAt: true,
  endsAt: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: toolUserSelect
  }
} as const;

const toolTaskSelect = {
  id: true,
  conversationId: true,
  boardId: true,
  columnId: true,
  sprintId: true,
  taskNumber: true,
  taskCode: true,
  title: true,
  details: true,
  category: true,
  taskType: true,
  priority: true,
  storyPoints: true,
  score: true,
  sprintName: true,
  labels: true,
  pinned: true,
  status: true,
  sortOrder: true,
  dueAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  board: {
    select: {
      id: true,
      title: true,
      template: true,
      isDefault: true
    }
  },
  column: {
    select: {
      id: true,
      title: true,
      color: true,
      sortOrder: true,
      taskStatus: true
    }
  },
  sprint: {
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true
    }
  },
  createdBy: {
    select: toolUserSelect
  },
  assignedTo: {
    select: toolUserSelect
  },
  sourceMessage: {
    select: {
      id: true,
      body: true,
      type: true,
      createdAt: true,
      sender: {
        select: toolUserSelect
      }
    }
  },
  likes: {
    select: {
      userId: true
    }
  },
  watchers: {
    select: {
      userId: true
    }
  },
  _count: {
    select: {
      attachments: true,
      comments: true,
      likes: true,
      watchers: true
    }
  }
} as const;

const taskAttachmentSelect = {
  id: true,
  provider: true,
  bucket: true,
  storageKey: true,
  url: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  durationMs: true,
  checksum: true,
  createdAt: true,
  uploadedBy: {
    select: toolUserSelect
  }
} as const;

const taskCommentSelect = {
  id: true,
  taskId: true,
  parentId: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  author: {
    select: toolUserSelect
  }
} as const;

const taskDetailSelect = {
  ...toolTaskSelect,
  attachments: {
    select: taskAttachmentSelect,
    orderBy: { createdAt: "desc" as const }
  },
  comments: {
    select: taskCommentSelect,
    orderBy: { createdAt: "asc" as const }
  }
} satisfies Prisma.ConversationToolTaskSelect;

const toolPollSelect = {
  id: true,
  conversationId: true,
  question: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  createdBy: {
    select: toolUserSelect
  },
  options: {
    select: {
      id: true,
      label: true,
      sortOrder: true,
      votes: {
        select: {
          userId: true
        }
      }
    },
    orderBy: {
      sortOrder: "asc" as const
    }
  }
} as const;

const prayerRequestSelect = {
  id: true,
  conversationId: true,
  createdById: true,
  assignedToUserId: true,
  requestType: true,
  visibility: true,
  priority: true,
  subjectName: true,
  subjectContact: true,
  title: true,
  body: true,
  status: true,
  followUpAt: true,
  createdAt: true,
  updatedAt: true,
  answeredAt: true,
  resolvedAt: true,
  createdBy: {
    select: toolUserSelect
  },
  assignedTo: {
    select: toolUserSelect
  },
  supports: {
    select: {
      userId: true
    }
  },
  updates: {
    select: prayerUpdateSelect,
    orderBy: {
      createdAt: "desc" as const
    },
    take: 8
  }
} as const;

const attendanceClockEventOrderBy: Prisma.ConversationAttendanceClockEventOrderByWithRelationInput[] = [
  { occurredAt: "asc" },
  { createdAt: "asc" }
];

const attendanceAssignmentOrderBy: Prisma.ConversationAttendanceAssignmentOrderByWithRelationInput[] = [
  { createdAt: "asc" }
];

const attendanceRecordOrderBy: Prisma.ConversationAttendanceRecordOrderByWithRelationInput[] = [
  { updatedAt: "desc" }
];

const attendanceClockEventSelect = {
  id: true,
  recordId: true,
  eventType: true,
  method: true,
  occurredAt: true,
  latitude: true,
  longitude: true,
  accuracyMeters: true,
  proofUrl: true,
  proofProvider: true,
  qrValue: true,
  stationCode: true,
  deviceLabel: true,
  note: true,
  createdAt: true,
  actor: {
    select: toolUserSelect
  }
} satisfies Prisma.ConversationAttendanceClockEventSelect;

const attendanceRecordSelect = {
  id: true,
  conversationId: true,
  shiftId: true,
  assignmentId: true,
  userId: true,
  reviewedByUserId: true,
  status: true,
  flags: true,
  clockInAt: true,
  clockOutAt: true,
  breakMinutes: true,
  workedMinutes: true,
  overtimeMinutes: true,
  lateMinutes: true,
  earlyLeaveMinutes: true,
  reviewNote: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  user: {
    select: toolUserSelect
  },
  reviewedBy: {
    select: toolUserSelect
  },
  clockEvents: {
    select: attendanceClockEventSelect,
    orderBy: attendanceClockEventOrderBy
  }
} satisfies Prisma.ConversationAttendanceRecordSelect;

const attendanceAssignmentSelect = {
  id: true,
  shiftId: true,
  userId: true,
  assignedByUserId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: toolUserSelect
  },
  assignedBy: {
    select: toolUserSelect
  },
  record: {
    select: attendanceRecordSelect
  }
} satisfies Prisma.ConversationAttendanceAssignmentSelect;

const attendanceTemplateSelect = {
  id: true,
  conversationId: true,
  createdById: true,
  title: true,
  description: true,
  locationName: true,
  locationAddress: true,
  startsAtTime: true,
  endsAtTime: true,
  breakMinutes: true,
  gracePeriodMinutes: true,
  daysOfWeek: true,
  requiresLocation: true,
  requiresPhoto: true,
  requiresQr: true,
  requiresNfc: true,
  geofenceLatitude: true,
  geofenceLongitude: true,
  geofenceRadiusM: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: toolUserSelect
  }
} satisfies Prisma.ConversationAttendanceShiftTemplateSelect;

const attendanceShiftSelect = {
  id: true,
  conversationId: true,
  templateId: true,
  createdById: true,
  title: true,
  notes: true,
  locationName: true,
  locationAddress: true,
  startsAt: true,
  endsAt: true,
  breakMinutes: true,
  gracePeriodMinutes: true,
  approvalRequired: true,
  status: true,
  requiresLocation: true,
  requiresPhoto: true,
  requiresQr: true,
  requiresNfc: true,
  stationCode: true,
  geofenceLatitude: true,
  geofenceLongitude: true,
  geofenceRadiusM: true,
  createdAt: true,
  updatedAt: true,
  template: {
    select: {
      id: true,
      title: true,
      startsAtTime: true,
      endsAtTime: true
    }
  },
  createdBy: {
    select: toolUserSelect
  },
  assignments: {
    select: attendanceAssignmentSelect,
    orderBy: attendanceAssignmentOrderBy
  },
  records: {
    select: attendanceRecordSelect,
    orderBy: attendanceRecordOrderBy
  }
} satisfies Prisma.ConversationAttendanceShiftSelect;

const attendancePolicySelect = {
  id: true,
  conversationId: true,
  createdById: true,
  updatedById: true,
  timezone: true,
  standardHoursPerDay: true,
  standardHoursPerWeek: true,
  overtimeAfterMinutes: true,
  doubleTimeAfterMinutes: true,
  lateGraceMinutes: true,
  breakRequiredAfterMinutes: true,
  breakDurationMinutes: true,
  allowSelfClock: true,
  allowManualAdjustments: true,
  requireSupervisorApproval: true,
  requireLocation: true,
  requirePhoto: true,
  requireQr: true,
  requireNfc: true,
  stationLabel: true,
  stationCode: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: toolUserSelect
  },
  updatedBy: {
    select: toolUserSelect
  }
} satisfies Prisma.ConversationAttendancePolicySelect;

const attendanceHolidaySelect = {
  id: true,
  conversationId: true,
  policyId: true,
  createdById: true,
  title: true,
  description: true,
  scope: true,
  category: true,
  startsOn: true,
  endsOn: true,
  isPaid: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: toolUserSelect
  }
} satisfies Prisma.ConversationAttendanceHolidaySelect;

const attendanceLeaveRequestSelect = {
  id: true,
  conversationId: true,
  policyId: true,
  leavePolicyId: true,
  userId: true,
  reviewedByUserId: true,
  leaveType: true,
  status: true,
  title: true,
  reason: true,
  startsAt: true,
  endsAt: true,
  minutesRequested: true,
  isPartialDay: true,
  deductFromBalance: true,
  reviewNote: true,
  decidedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: toolUserSelect
  },
  reviewedBy: {
    select: toolUserSelect
  },
  leavePolicy: {
    select: {
      id: true,
      title: true,
      leaveType: true
    }
  }
} satisfies Prisma.ConversationAttendanceLeaveRequestSelect;

const attendanceLeavePolicySelect = {
  id: true,
  conversationId: true,
  attendancePolicyId: true,
  createdById: true,
  updatedById: true,
  title: true,
  leaveType: true,
  annualAllowanceMinutes: true,
  carryOverMinutes: true,
  accrualCadence: true,
  accrualAmountMinutes: true,
  allowNegativeBalance: true,
  requiresApproval: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: toolUserSelect
  },
  updatedBy: {
    select: toolUserSelect
  }
} satisfies Prisma.ConversationAttendanceLeavePolicySelect;

const attendanceLeaveBalanceEntrySelect = {
  id: true,
  leaveBalanceId: true,
  leavePolicyId: true,
  userId: true,
  actorUserId: true,
  leaveRequestId: true,
  entryType: true,
  minutesDelta: true,
  balanceAfterMinutes: true,
  note: true,
  effectiveAt: true,
  createdAt: true,
  actor: {
    select: toolUserSelect
  }
} satisfies Prisma.ConversationAttendanceLeaveBalanceEntrySelect;

const attendanceLeaveBalanceSelect = {
  id: true,
  conversationId: true,
  leavePolicyId: true,
  userId: true,
  availableMinutes: true,
  usedMinutes: true,
  pendingMinutes: true,
  accruedMinutes: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: toolUserSelect
  },
  leavePolicy: {
    select: attendanceLeavePolicySelect
  },
  entries: {
    select: attendanceLeaveBalanceEntrySelect,
    orderBy: [{ effectiveAt: "desc" as const }, { createdAt: "desc" as const }],
    take: 12
  }
} satisfies Prisma.ConversationAttendanceLeaveBalanceSelect;

const attendanceRotaRunSelect = {
  id: true,
  conversationId: true,
  templateId: true,
  createdById: true,
  title: true,
  frequency: true,
  startsOn: true,
  endsOn: true,
  participantUserIds: true,
  generatedShiftCount: true,
  isActive: true,
  lastGeneratedAt: true,
  createdAt: true,
  updatedAt: true,
  template: {
    select: {
      id: true,
      title: true,
      startsAtTime: true,
      endsAtTime: true,
      daysOfWeek: true
    }
  },
  createdBy: {
    select: toolUserSelect
  }
} satisfies Prisma.ConversationAttendanceRotaRunSelect;

const attendanceAuditLogSelect = {
  id: true,
  conversationId: true,
  actorUserId: true,
  action: true,
  targetType: true,
  targetId: true,
  summary: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: toolUserSelect
  }
} satisfies Prisma.ConversationAttendanceAuditLogSelect;

const boardMemberSelect = {
  id: true,
  userId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: toolUserSelect
  },
  addedBy: {
    select: toolUserSelect
  }
} as const;

const boardColumnSelect = {
  id: true,
  boardId: true,
  title: true,
  color: true,
  sortOrder: true,
  taskStatus: true,
  createdAt: true,
  updatedAt: true,
  tasks: {
    select: toolTaskSelect,
    orderBy: [{ sortOrder: "asc" as const }, { updatedAt: "desc" as const }]
  }
} satisfies Prisma.ConversationBoardColumnSelect;

const boardSelect = {
  id: true,
  conversationId: true,
  title: true,
  description: true,
  codePrefix: true,
  template: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: toolUserSelect
  },
  members: {
    select: boardMemberSelect,
    orderBy: [{ createdAt: "asc" as const }]
  },
  sprints: {
    select: boardSprintSelect,
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }]
  },
  columns: {
    select: boardColumnSelect,
    orderBy: [{ sortOrder: "asc" as const }]
  }
} satisfies Prisma.ConversationBoardSelect;

type ToolRequestRow = Prisma.ConversationToolRequestGetPayload<{ select: typeof toolRequestSelect }>;
type ToolActivationRow = Prisma.ConversationToolActivationGetPayload<{ select: typeof toolActivationSelect }>;
type ToolNoteRow = Prisma.ConversationToolNoteGetPayload<{ select: typeof toolNoteSelect }>;
type ToolTaskRow = Prisma.ConversationToolTaskGetPayload<{ select: typeof toolTaskSelect }>;
type ToolPollRow = Prisma.ConversationToolPollGetPayload<{ select: typeof toolPollSelect }>;
type PrayerRequestRow = Prisma.ConversationPrayerRequestGetPayload<{ select: typeof prayerRequestSelect }>;
type BoardRow = Prisma.ConversationBoardGetPayload<{ select: typeof boardSelect }>;
type AttendanceTemplateRow = Prisma.ConversationAttendanceShiftTemplateGetPayload<{ select: typeof attendanceTemplateSelect }>;
type AttendanceShiftRow = Prisma.ConversationAttendanceShiftGetPayload<{ select: typeof attendanceShiftSelect }>;
type AttendanceRecordRow = Prisma.ConversationAttendanceRecordGetPayload<{ select: typeof attendanceRecordSelect }>;
type AttendancePolicyRow = Prisma.ConversationAttendancePolicyGetPayload<{ select: typeof attendancePolicySelect }>;
type AttendanceHolidayRow = Prisma.ConversationAttendanceHolidayGetPayload<{ select: typeof attendanceHolidaySelect }>;
type AttendanceLeaveRequestRow = Prisma.ConversationAttendanceLeaveRequestGetPayload<{ select: typeof attendanceLeaveRequestSelect }>;
type AttendanceLeavePolicyRow = Prisma.ConversationAttendanceLeavePolicyGetPayload<{ select: typeof attendanceLeavePolicySelect }>;
type AttendanceLeaveBalanceRow = Prisma.ConversationAttendanceLeaveBalanceGetPayload<{ select: typeof attendanceLeaveBalanceSelect }>;
type AttendanceLeaveBalanceEntryRow = Prisma.ConversationAttendanceLeaveBalanceEntryGetPayload<{
  select: typeof attendanceLeaveBalanceEntrySelect;
}>;
type AttendanceRotaRunRow = Prisma.ConversationAttendanceRotaRunGetPayload<{ select: typeof attendanceRotaRunSelect }>;
type AttendanceAuditLogRow = Prisma.ConversationAttendanceAuditLogGetPayload<{ select: typeof attendanceAuditLogSelect }>;

type Membership = Awaited<ReturnType<ConversationsService["assertParticipantMembership"]>>;

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService
  ) {}

  async getWorkspace(conversationId: string, userId: string) {
    const membership = await this.conversations.assertParticipantMembership(conversationId, userId);
    const viewerCanManage = this.canManageConversation(membership);
    const [requests, activations] = await Promise.all([
      this.prisma.conversationToolRequest.findMany({
        where: { conversationId },
        select: toolRequestSelect,
        orderBy: [{ createdAt: "desc" }],
        take: 6
      }),
      this.prisma.conversationToolActivation.findMany({
        where: { conversationId },
        select: toolActivationSelect,
        orderBy: [{ activatedAt: "asc" }]
      })
    ]);

    const activePacks = new Set(activations.map((item) => item.pack));
    const taskPackEnabled =
      activePacks.has(ConversationToolPack.CORE_WORKSPACE) || activePacks.has(ConversationToolPack.BOARDS);
    const attendanceEnabled = activePacks.has(ConversationToolPack.ATTENDANCE);
    const [
      notes,
      tasks,
      polls,
      prayers,
      boards,
      attendancePolicy,
      attendanceLeavePolicies,
      attendanceLeaveBalances,
      attendanceRotaRuns,
      attendanceTemplates,
      attendanceShifts,
      attendanceRecords,
      attendanceHolidays,
      attendanceLeaveRequests,
      attendanceAuditLogs
    ] = await Promise.all([
      activePacks.has(ConversationToolPack.CORE_WORKSPACE) || activePacks.has(ConversationToolPack.COMMUNITY_CARE)
        ? this.prisma.conversationToolNote.findMany({
            where: {
              conversationId,
              OR: [
                { kind: ConversationNoteKind.NOTE },
                {
                  kind: ConversationNoteKind.ANNOUNCEMENT,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
                }
              ]
            },
            select: toolNoteSelect,
            orderBy: [{ pinnedAt: "desc" }, { updatedAt: "desc" }],
            take: 12
          })
        : Promise.resolve([]),
      taskPackEnabled
        ? this.prisma.conversationToolTask.findMany({
            where: { conversationId },
            select: toolTaskSelect,
            orderBy: [{ boardId: "asc" }, { status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
            take: 120
          })
        : Promise.resolve([]),
      activePacks.has(ConversationToolPack.CORE_WORKSPACE)
        ? this.prisma.conversationToolPoll.findMany({
            where: { conversationId },
            select: toolPollSelect,
            orderBy: [{ createdAt: "desc" }],
            take: 8
          })
        : Promise.resolve([]),
      activePacks.has(ConversationToolPack.COMMUNITY_CARE)
        ? this.prisma.conversationPrayerRequest.findMany({
            where: { conversationId },
            select: prayerRequestSelect,
            orderBy: [{ status: "asc" }, { followUpAt: "asc" }, { updatedAt: "desc" }],
            take: 24
          })
        : Promise.resolve([]),
      activePacks.has(ConversationToolPack.BOARDS)
        ? this.prisma.conversationBoard.findMany({
            where: { conversationId },
            select: boardSelect,
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendancePolicy.findUnique({
            where: { conversationId },
            select: attendancePolicySelect
          })
        : Promise.resolve(null),
      attendanceEnabled
        ? this.prisma.conversationAttendanceLeavePolicy.findMany({
            where: { conversationId },
            select: attendanceLeavePolicySelect,
            orderBy: [{ isDefault: "desc" }, { leaveType: "asc" }, { title: "asc" }]
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendanceLeaveBalance.findMany({
            where: { conversationId },
            select: attendanceLeaveBalanceSelect,
            orderBy: [{ userId: "asc" }, { leavePolicyId: "asc" }]
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendanceRotaRun.findMany({
            where: { conversationId },
            select: attendanceRotaRunSelect,
            orderBy: [{ createdAt: "desc" }]
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendanceShiftTemplate.findMany({
            where: { conversationId },
            select: attendanceTemplateSelect,
            orderBy: [{ isActive: "desc" }, { title: "asc" }]
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendanceShift.findMany({
            where: { conversationId },
            select: attendanceShiftSelect,
            orderBy: [{ startsAt: "asc" }]
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendanceRecord.findMany({
            where: { conversationId },
            select: attendanceRecordSelect,
            orderBy: [{ updatedAt: "desc" }],
            take: 120
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendanceHoliday.findMany({
            where: {
              OR: [
                { conversationId },
                { scope: ConversationAttendanceHolidayScope.GLOBAL },
                {
                  scope: ConversationAttendanceHolidayScope.CATEGORY,
                  category: membership.conversation.category
                }
              ]
            },
            select: attendanceHolidaySelect,
            orderBy: [{ startsOn: "asc" }, { createdAt: "asc" }]
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendanceLeaveRequest.findMany({
            where: { conversationId },
            select: attendanceLeaveRequestSelect,
            orderBy: [{ status: "asc" }, { startsAt: "asc" }, { createdAt: "desc" }],
            take: 60
          })
        : Promise.resolve([]),
      attendanceEnabled
        ? this.prisma.conversationAttendanceAuditLog.findMany({
            where: { conversationId },
            select: attendanceAuditLogSelect,
            orderBy: [{ createdAt: "desc" }],
            take: 60
          })
        : Promise.resolve([])
    ]);

    const visiblePrayers = prayers.filter((prayer) => this.canViewCareRequest(prayer, userId, membership));
    const announcement = notes.find((note) => note.kind === ConversationNoteKind.ANNOUNCEMENT) ?? null;
    const activePoll = polls.find((poll) => !poll.closedAt) ?? null;
    const nextTask = tasks.find((task) => task.status !== ConversationTaskStatus.DONE) ?? null;
    const latestPrayer = visiblePrayers.find((prayer) => prayer.status === PrayerRequestStatus.OPEN) ?? null;
    const defaultBoard = boards.find((board) => board.isDefault) ?? boards[0] ?? null;
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const nextShift =
      attendanceShifts.find((shift) => shift.endsAt.getTime() >= now) ?? attendanceShifts[0] ?? null;
    const attendanceApprovals = attendanceRecords.filter(
      (record) => record.status === ConversationAttendanceRecordStatus.PENDING_APPROVAL
    ).length;
    const pendingLeaveApprovals = attendanceLeaveRequests.filter(
      (item) => item.status === ConversationAttendanceLeaveStatus.PENDING
    ).length;
    const onClockCount = attendanceRecords.filter(
      (record) =>
        record.status === ConversationAttendanceRecordStatus.ON_CLOCK ||
        record.status === ConversationAttendanceRecordStatus.ON_BREAK
    ).length;
    const exceptionCount = attendanceRecords.filter((record) => record.flags.length > 0).length;
    const scheduledTodayCount = attendanceShifts.filter(
      (shift) => shift.startsAt >= startOfToday && shift.startsAt < endOfToday
    ).length;

    return {
      conversation: {
        id: membership.conversation.id,
        type: membership.conversation.type,
        category: membership.conversation.category,
        title: membership.conversation.title,
        participantCount: membership.conversation.participants.length,
        participants: membership.conversation.participants.map((participant) => ({
          id: participant.id,
          userId: participant.userId,
          role: participant.role,
          user: {
            id: participant.user.id,
            username: participant.user.username,
            userCode: participant.user.userCode,
            displayName: participant.user.displayName,
            avatarUrl: participant.user.avatarUrl,
            lastSeenAt: participant.user.lastSeenAt
          }
        }))
      },
      access: {
        canManage: viewerCanManage,
        canRequest: true
      },
      packCatalog: listToolPackCatalog(),
      activePacks: activations.map((item) => this.toActivation(item)),
      requests: requests.map((item) => this.toRequest(item)),
      dashboard: {
        boardCount: boards.length,
        openTasks: tasks.filter((task) => task.status === ConversationTaskStatus.TODO).length,
        inProgressTasks: tasks.filter((task) => task.status === ConversationTaskStatus.IN_PROGRESS).length,
        completedTasks: tasks.filter((task) => task.status === ConversationTaskStatus.DONE).length,
        noteCount: notes.filter((note) => note.kind === ConversationNoteKind.NOTE).length,
        announcementCount: notes.filter((note) => note.kind === ConversationNoteKind.ANNOUNCEMENT).length,
        livePollCount: polls.filter((poll) => !poll.closedAt).length,
        prayerCount: visiblePrayers.filter((prayer) => prayer.status === PrayerRequestStatus.OPEN).length,
        careAssignedCount: visiblePrayers.filter((prayer) => prayer.assignedToUserId).length,
        urgentCareCount: visiblePrayers.filter((prayer) => prayer.priority === ConversationTaskPriority.CRITICAL).length,
        attendanceTemplateCount: attendanceTemplates.length,
        attendanceLeavePolicyCount: attendanceLeavePolicies.length,
        attendanceLeaveBalanceCount: attendanceLeaveBalances.length,
        rotaRunCount: attendanceRotaRuns.length,
        scheduledShiftCount: scheduledTodayCount,
        onClockCount,
        pendingAttendanceApprovals: attendanceApprovals,
        holidayCount: attendanceHolidays.length,
        pendingLeaveApprovals,
        approvedLeaveCount: attendanceLeaveRequests.filter((item) => item.status === ConversationAttendanceLeaveStatus.APPROVED).length,
        attendanceExceptionCount: exceptionCount,
        dueFollowUpCount: visiblePrayers.filter(
          (prayer) =>
            prayer.status === PrayerRequestStatus.OPEN &&
            prayer.followUpAt &&
            prayer.followUpAt.getTime() <= Date.now()
        ).length,
        defaultBoard: defaultBoard ? this.toBoardSummary(defaultBoard) : null,
        latestAnnouncement: announcement ? this.toNote(announcement) : null,
        nextTask: nextTask ? this.toTask(nextTask, userId) : null,
        activePoll: activePoll ? this.toPoll(activePoll, userId) : null,
        latestPrayer: latestPrayer ? this.toPrayerRequest(latestPrayer, userId) : null,
        nextShift: nextShift ? this.toAttendanceShiftSummary(nextShift) : null
      },
      notes: notes.map((item) => this.toNote(item)),
      tasks: tasks.map((item) => this.toTask(item, userId)),
      boards: boards.map((item) => this.toBoard(item, userId, membership)),
      polls: polls.map((item) => this.toPoll(item, userId)),
      prayerRequests: visiblePrayers.map((item) => this.toPrayerRequest(item, userId)),
      attendancePolicy: attendancePolicy ? this.toAttendancePolicy(attendancePolicy) : null,
      attendanceLeavePolicies: attendanceLeavePolicies.map((item) => this.toAttendanceLeavePolicy(item)),
      attendanceLeaveBalances: attendanceLeaveBalances.map((item) => this.toAttendanceLeaveBalance(item)),
      attendanceRotaRuns: attendanceRotaRuns.map((item) => this.toAttendanceRotaRun(item)),
      attendanceTemplates: attendanceTemplates.map((item) => this.toAttendanceTemplate(item)),
      attendanceShifts: attendanceShifts.map((item) => this.toAttendanceShift(item)),
      attendanceRecords: attendanceRecords.map((item) => this.toAttendanceRecord(item)),
      attendanceHolidays: attendanceHolidays.map((item) => this.toAttendanceHoliday(item)),
      attendanceLeaveRequests: attendanceLeaveRequests.map((item) => this.toAttendanceLeaveRequest(item)),
      attendanceAuditLogs: attendanceAuditLogs.map((item) => this.toAttendanceAuditLog(item))
    };
  }

  async requestPack(conversationId: string, userId: string, input: CreateConversationToolRequestDto) {
    await this.conversations.assertParticipantMembership(conversationId, userId);
    await this.assertPackNotActive(conversationId, input.pack);

    const existing = await this.prisma.conversationToolRequest.findFirst({
      where: {
        conversationId,
        pack: input.pack,
        status: ConversationToolRequestStatus.PENDING
      },
      select: toolRequestSelect
    });

    if (existing) {
      return this.toRequest(existing);
    }

    const created = await this.prisma.conversationToolRequest.create({
      data: {
        conversationId,
        requestedByUserId: userId,
        pack: input.pack,
        note: this.normalizeOptionalText(input.note)
      },
      select: toolRequestSelect
    });

    return this.toRequest(created);
  }

  async createBoard(conversationId: string, userId: string, input: CreateConversationBoardDto) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.BOARDS);
    if (!context.canManage) {
      throw new ForbiddenException("Only room leads can create boards in this room.");
    }

    const existingCount = await this.prisma.conversationBoard.count({
      where: { conversationId }
    });
    const template = input.template ?? defaultBoardTemplateForCategory(context.membership.conversation.category);
    const columns = this.normalizeBoardColumns(input.columns, template);

    const title = this.normalizeRequiredText(input.title, "Give the board a title.");
    const created = await this.prisma.$transaction(async (tx) => {
      const board = await tx.conversationBoard.create({
        data: {
          conversationId,
          createdById: userId,
          title,
          description: this.normalizeOptionalText(input.description),
          codePrefix: this.buildBoardCodePrefix(title),
          template,
          isDefault: existingCount === 0,
          columns: {
            create: columns.map((column, index) => ({
              title: column.title,
              color: column.color,
              taskStatus: column.taskStatus,
              sortOrder: column.sortOrder ?? index
            }))
          }
        },
        select: boardSelect
      });

      await tx.conversationBoardMember.upsert({
        where: {
          boardId_userId: {
            boardId: board.id,
            userId
          }
        },
        create: {
          boardId: board.id,
          userId,
          addedByUserId: userId,
          role: ConversationBoardMemberRole.MANAGER
        },
        update: {
          role: ConversationBoardMemberRole.MANAGER,
          addedByUserId: userId
        }
      });

      return tx.conversationBoard.findUniqueOrThrow({
        where: { id: board.id },
        select: boardSelect
      });
    });

    return this.toBoard(created, userId, context.membership);
  }

  async updateBoard(conversationId: string, boardId: string, userId: string, input: UpdateConversationBoardDto) {
    const boardContext = await this.assertBoardWriteAccess(conversationId, boardId, userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.conversationBoard.updateMany({
          where: { conversationId },
          data: { isDefault: false }
        });
      }

      await tx.conversationBoard.update({
        where: { id: boardId },
        data: {
          title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give the board a title.") : undefined,
          description: input.description !== undefined ? this.normalizeOptionalText(input.description) : undefined,
          template: input.template,
          isDefault: input.isDefault
        }
      });

      return tx.conversationBoard.findUniqueOrThrow({
        where: { id: boardId },
        select: boardSelect
      });
    });

    return this.toBoard(updated, userId, boardContext.membership);
  }

  async deleteBoard(conversationId: string, boardId: string, userId: string) {
    const boardContext = await this.assertBoardWriteAccess(conversationId, boardId, userId, true);

    await this.prisma.$transaction(async (tx) => {
      await tx.conversationToolTask.updateMany({
        where: { boardId },
        data: {
          boardId: null,
          columnId: null
        }
      });

      await tx.conversationBoard.delete({
        where: { id: boardId }
      });

      if (boardContext.board.isDefault) {
        const replacement = await tx.conversationBoard.findFirst({
          where: { conversationId },
          orderBy: [{ createdAt: "asc" }],
          select: { id: true }
        });

        if (replacement) {
          await tx.conversationBoard.update({
            where: { id: replacement.id },
            data: { isDefault: true }
          });
        }
      }
    });

    return { ok: true };
  }

  async addBoardMember(conversationId: string, boardId: string, userId: string, input: AddConversationBoardMemberDto) {
    const boardContext = await this.assertBoardWriteAccess(conversationId, boardId, userId, true);
    const targetParticipant = boardContext.membership.conversation.participants.find(
      (participant) => participant.userId === input.userId
    );

    if (!targetParticipant) {
      throw new BadRequestException("That person is not active in this room yet.");
    }

    await this.prisma.conversationBoardMember.upsert({
      where: {
        boardId_userId: {
          boardId,
          userId: input.userId
        }
      },
      create: {
        boardId,
        userId: input.userId,
        addedByUserId: userId,
        role: input.role ?? ConversationBoardMemberRole.CONTRIBUTOR
      },
      update: {
        role: input.role ?? ConversationBoardMemberRole.CONTRIBUTOR,
        addedByUserId: userId
      }
    });

    const board = await this.prisma.conversationBoard.findUniqueOrThrow({
      where: { id: boardId },
      select: boardSelect
    });

    return this.toBoard(board, userId, boardContext.membership);
  }

  async updateBoardMember(
    conversationId: string,
    boardId: string,
    memberUserId: string,
    userId: string,
    input: UpdateConversationBoardMemberDto
  ) {
    const boardContext = await this.assertBoardWriteAccess(conversationId, boardId, userId, true);
    const existing = await this.prisma.conversationBoardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: memberUserId
        }
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That board member is not in this board yet.");
    }

    if (input.role !== ConversationBoardMemberRole.MANAGER) {
      await this.assertBoardWillKeepManager(boardId, memberUserId);
    }

    await this.prisma.conversationBoardMember.update({
      where: { id: existing.id },
      data: {
        role: input.role
      }
    });

    const board = await this.prisma.conversationBoard.findUniqueOrThrow({
      where: { id: boardId },
      select: boardSelect
    });

    return this.toBoard(board, userId, boardContext.membership);
  }

  async removeBoardMember(conversationId: string, boardId: string, memberUserId: string, userId: string) {
    await this.assertBoardWriteAccess(conversationId, boardId, userId, true);
    const existing = await this.prisma.conversationBoardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: memberUserId
        }
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That board member is not in this board yet.");
    }

    await this.assertBoardWillKeepManager(boardId, memberUserId);

    await this.prisma.conversationBoardMember.delete({
      where: { id: existing.id }
    });

    return { ok: true };
  }

  async createBoardColumn(conversationId: string, boardId: string, userId: string, input: CreateConversationBoardColumnDto) {
    await this.assertBoardWriteAccess(conversationId, boardId, userId);
    await this.prisma.$transaction(async (tx) => {
      const columnCount = await tx.conversationBoardColumn.count({
        where: { boardId }
      });

      const created = await tx.conversationBoardColumn.create({
        data: {
          boardId,
          title: this.normalizeRequiredText(input.title, "Give the column a title."),
          color: this.normalizeOptionalText(input.color),
          taskStatus: input.taskStatus ?? ConversationTaskStatus.TODO,
          sortOrder: columnCount
        },
        select: { id: true }
      });

      await this.resequenceBoardColumns(
        tx,
        boardId,
        created.id,
        input.sortOrder ?? columnCount
      );
    });

    const board = await this.prisma.conversationBoard.findUniqueOrThrow({
      where: { id: boardId },
      select: boardSelect
    });

    return this.toBoard(board, userId, await this.conversations.assertParticipantMembership(conversationId, userId));
  }

  async updateBoardColumn(
    conversationId: string,
    boardId: string,
    columnId: string,
    userId: string,
    input: UpdateConversationBoardColumnDto
  ) {
    await this.assertBoardWriteAccess(conversationId, boardId, userId);
    const existing = await this.prisma.conversationBoardColumn.findFirst({
      where: { id: columnId, boardId },
      select: { id: true, taskStatus: true }
    });

    if (!existing) {
      throw new NotFoundException("That board column is missing.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.conversationBoardColumn.update({
        where: { id: columnId },
        data: {
          title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give the column a title.") : undefined,
          color: input.color !== undefined ? this.normalizeOptionalText(input.color) : undefined,
          taskStatus: input.taskStatus
        }
      });

      if (input.sortOrder !== undefined) {
        await this.resequenceBoardColumns(tx, boardId, columnId, input.sortOrder);
      }

      if (input.taskStatus && input.taskStatus !== existing.taskStatus) {
        await tx.conversationToolTask.updateMany({
          where: { columnId },
          data: {
            status: input.taskStatus,
            completedAt: input.taskStatus === ConversationTaskStatus.DONE ? new Date() : null
          }
        });
      }
    });

    const board = await this.prisma.conversationBoard.findUniqueOrThrow({
      where: { id: boardId },
      select: boardSelect
    });

    return this.toBoard(board, userId, await this.conversations.assertParticipantMembership(conversationId, userId));
  }

  async deleteBoardColumn(conversationId: string, boardId: string, columnId: string, userId: string) {
    await this.assertBoardWriteAccess(conversationId, boardId, userId);
    const existing = await this.prisma.conversationBoardColumn.findFirst({
      where: { id: columnId, boardId },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException("That board column is missing.");
    }

    const columnCount = await this.prisma.conversationBoardColumn.count({
      where: { boardId }
    });

    if (columnCount <= 1) {
      throw new BadRequestException("Every board needs at least one lane.");
    }

    const taskCount = await this.prisma.conversationToolTask.count({
      where: { columnId }
    });

    if (taskCount > 0) {
      throw new BadRequestException("Move the tasks out of this lane before removing it.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.conversationBoardColumn.delete({
        where: { id: columnId }
      });

      await this.resequenceBoardColumns(tx, boardId);
    });

    return { ok: true };
  }

  async createBoardSprint(
    conversationId: string,
    boardId: string,
    userId: string,
    input: CreateConversationBoardSprintDto
  ) {
    await this.assertBoardWriteAccess(conversationId, boardId, userId);
    const sortOrder =
      input.sortOrder ??
      (await this.prisma.conversationBoardSprint.count({
        where: { boardId }
      }));

    await this.prisma.conversationBoardSprint.create({
      data: {
        boardId,
        createdById: userId,
        title: this.normalizeRequiredText(input.title, "Give the sprint a title."),
        goal: this.normalizeOptionalText(input.goal),
        status: input.status ?? ConversationBoardSprintStatus.PLANNED,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        sortOrder
      }
    });

    const board = await this.prisma.conversationBoard.findUniqueOrThrow({
      where: { id: boardId },
      select: boardSelect
    });

    return this.toBoard(board, userId, await this.conversations.assertParticipantMembership(conversationId, userId));
  }

  async updateBoardSprint(
    conversationId: string,
    boardId: string,
    sprintId: string,
    userId: string,
    input: UpdateConversationBoardSprintDto
  ) {
    await this.assertBoardWriteAccess(conversationId, boardId, userId);
    const existing = await this.prisma.conversationBoardSprint.findFirst({
      where: {
        id: sprintId,
        boardId
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That sprint is missing.");
    }

    await this.prisma.conversationBoardSprint.update({
      where: { id: sprintId },
      data: {
        title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give the sprint a title.") : undefined,
        goal: input.goal !== undefined ? this.normalizeOptionalText(input.goal) : undefined,
        status: input.status,
        startsAt: input.startsAt !== undefined ? (input.startsAt ? new Date(input.startsAt) : null) : undefined,
        endsAt: input.endsAt !== undefined ? (input.endsAt ? new Date(input.endsAt) : null) : undefined,
        sortOrder: input.sortOrder
      }
    });

    const board = await this.prisma.conversationBoard.findUniqueOrThrow({
      where: { id: boardId },
      select: boardSelect
    });

    return this.toBoard(board, userId, await this.conversations.assertParticipantMembership(conversationId, userId));
  }

  async deleteBoardSprint(conversationId: string, boardId: string, sprintId: string, userId: string) {
    await this.assertBoardWriteAccess(conversationId, boardId, userId);
    const existing = await this.prisma.conversationBoardSprint.findFirst({
      where: {
        id: sprintId,
        boardId
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That sprint is missing.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.conversationToolTask.updateMany({
        where: { sprintId },
        data: {
          sprintId: null,
          sprintName: null
        }
      });

      await tx.conversationBoardSprint.delete({
        where: { id: sprintId }
      });
    });

    return { ok: true };
  }

  async createAttendanceTemplate(
    conversationId: string,
    userId: string,
    input: CreateConversationAttendanceShiftTemplateDto
  ) {
    const context = await this.assertAttendanceManagement(conversationId, userId);
    const created = await this.prisma.conversationAttendanceShiftTemplate.create({
      data: {
        conversationId,
        createdById: userId,
        title: this.normalizeRequiredText(input.title, "Give the shift template a title."),
        description: this.normalizeOptionalText(input.description),
        locationName: this.normalizeOptionalText(input.locationName),
        locationAddress: this.normalizeOptionalText(input.locationAddress),
        startsAtTime: this.normalizeRequiredText(input.startsAtTime, "Choose the shift start time."),
        endsAtTime: this.normalizeRequiredText(input.endsAtTime, "Choose the shift end time."),
        breakMinutes: input.breakMinutes ?? 0,
        gracePeriodMinutes: input.gracePeriodMinutes ?? 10,
        daysOfWeek: this.normalizeAttendanceDays(input.daysOfWeek),
        requiresLocation: Boolean(input.requiresLocation),
        requiresPhoto: Boolean(input.requiresPhoto),
        requiresQr: Boolean(input.requiresQr),
        requiresNfc: Boolean(input.requiresNfc),
        geofenceLatitude: input.geofenceLatitude ?? null,
        geofenceLongitude: input.geofenceLongitude ?? null,
        geofenceRadiusM: input.geofenceRadiusM ?? null,
        isActive: input.isActive ?? true
      },
      select: attendanceTemplateSelect
    });

    return this.toAttendanceTemplate(created);
  }

  async updateAttendanceTemplate(
    conversationId: string,
    templateId: string,
    userId: string,
    input: UpdateConversationAttendanceShiftTemplateDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const existing = await this.prisma.conversationAttendanceShiftTemplate.findFirst({
      where: { id: templateId, conversationId },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException("That attendance template is missing.");
    }

    const updated = await this.prisma.conversationAttendanceShiftTemplate.update({
      where: { id: templateId },
      data: {
        title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give the shift template a title.") : undefined,
        description: input.description !== undefined ? this.normalizeOptionalText(input.description) : undefined,
        locationName: input.locationName !== undefined ? this.normalizeOptionalText(input.locationName) : undefined,
        locationAddress: input.locationAddress !== undefined ? this.normalizeOptionalText(input.locationAddress) : undefined,
        startsAtTime: input.startsAtTime !== undefined ? this.normalizeRequiredText(input.startsAtTime, "Choose the shift start time.") : undefined,
        endsAtTime: input.endsAtTime !== undefined ? this.normalizeRequiredText(input.endsAtTime, "Choose the shift end time.") : undefined,
        breakMinutes: input.breakMinutes,
        gracePeriodMinutes: input.gracePeriodMinutes,
        daysOfWeek: input.daysOfWeek !== undefined ? this.normalizeAttendanceDays(input.daysOfWeek) : undefined,
        requiresLocation: input.requiresLocation,
        requiresPhoto: input.requiresPhoto,
        requiresQr: input.requiresQr,
        requiresNfc: input.requiresNfc,
        geofenceLatitude: input.geofenceLatitude !== undefined ? input.geofenceLatitude : undefined,
        geofenceLongitude: input.geofenceLongitude !== undefined ? input.geofenceLongitude : undefined,
        geofenceRadiusM: input.geofenceRadiusM !== undefined ? input.geofenceRadiusM : undefined,
        isActive: input.isActive
      },
      select: attendanceTemplateSelect
    });

    return this.toAttendanceTemplate(updated);
  }

  async createAttendanceShift(
    conversationId: string,
    userId: string,
    input: CreateConversationAttendanceShiftDto
  ) {
    const context = await this.assertAttendanceManagement(conversationId, userId);
    const policy = await this.prisma.conversationAttendancePolicy.findUnique({
      where: { conversationId },
      select: attendancePolicySelect
    });
    const template = input.templateId
      ? await this.prisma.conversationAttendanceShiftTemplate.findFirst({
          where: { id: input.templateId, conversationId },
          select: attendanceTemplateSelect
        })
      : null;

    if (input.templateId && !template) {
      throw new NotFoundException("That attendance template is missing.");
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException("Choose a valid attendance shift window.");
    }

    const created = await this.prisma.conversationAttendanceShift.create({
      data: {
        conversationId,
        templateId: template?.id ?? null,
        createdById: userId,
        title: this.normalizeRequiredText(input.title, "Give the shift a title."),
        notes: this.normalizeOptionalText(input.notes),
        locationName: this.normalizeOptionalText(input.locationName) ?? template?.locationName ?? null,
        locationAddress: this.normalizeOptionalText(input.locationAddress) ?? template?.locationAddress ?? null,
        startsAt,
        endsAt,
        breakMinutes: input.breakMinutes ?? template?.breakMinutes ?? 0,
        gracePeriodMinutes: input.gracePeriodMinutes ?? template?.gracePeriodMinutes ?? policy?.lateGraceMinutes ?? 10,
        approvalRequired: input.approvalRequired ?? policy?.requireSupervisorApproval ?? true,
        status: input.status ?? ConversationAttendanceShiftStatus.PUBLISHED,
        requiresLocation: input.requiresLocation ?? template?.requiresLocation ?? policy?.requireLocation ?? false,
        requiresPhoto: input.requiresPhoto ?? template?.requiresPhoto ?? policy?.requirePhoto ?? false,
        requiresQr: input.requiresQr ?? template?.requiresQr ?? policy?.requireQr ?? false,
        requiresNfc: input.requiresNfc ?? template?.requiresNfc ?? policy?.requireNfc ?? false,
        stationCode: this.normalizeStationCode(input.stationCode) ?? policy?.stationCode ?? null,
        geofenceLatitude: input.geofenceLatitude ?? template?.geofenceLatitude ?? null,
        geofenceLongitude: input.geofenceLongitude ?? template?.geofenceLongitude ?? null,
        geofenceRadiusM: input.geofenceRadiusM ?? template?.geofenceRadiusM ?? null
      },
      select: attendanceShiftSelect
    });

    return this.toAttendanceShift(created);
  }

  async updateAttendanceShift(
    conversationId: string,
    shiftId: string,
    userId: string,
    input: UpdateConversationAttendanceShiftDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const existing = await this.prisma.conversationAttendanceShift.findFirst({
      where: { id: shiftId, conversationId },
      select: { id: true, startsAt: true, endsAt: true }
    });

    if (!existing) {
      throw new NotFoundException("That attendance shift is missing.");
    }

    const nextStartsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
    const nextEndsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
    if (nextEndsAt <= nextStartsAt) {
      throw new BadRequestException("Choose a valid attendance shift window.");
    }

    const template = input.templateId
      ? await this.prisma.conversationAttendanceShiftTemplate.findFirst({
          where: { id: input.templateId, conversationId },
          select: { id: true }
        })
      : undefined;

    if (input.templateId && !template) {
      throw new NotFoundException("That attendance template is missing.");
    }

    const updated = await this.prisma.conversationAttendanceShift.update({
      where: { id: shiftId },
      data: {
        templateId: input.templateId !== undefined ? input.templateId : undefined,
        title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give the shift a title.") : undefined,
        notes: input.notes !== undefined ? this.normalizeOptionalText(input.notes) : undefined,
        locationName: input.locationName !== undefined ? this.normalizeOptionalText(input.locationName) : undefined,
        locationAddress: input.locationAddress !== undefined ? this.normalizeOptionalText(input.locationAddress) : undefined,
        startsAt: input.startsAt !== undefined ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt !== undefined ? new Date(input.endsAt) : undefined,
        breakMinutes: input.breakMinutes,
        gracePeriodMinutes: input.gracePeriodMinutes,
        approvalRequired: input.approvalRequired,
        status: input.status,
        requiresLocation: input.requiresLocation,
        requiresPhoto: input.requiresPhoto,
        requiresQr: input.requiresQr,
        requiresNfc: input.requiresNfc,
        stationCode: input.stationCode !== undefined ? this.normalizeStationCode(input.stationCode) : undefined,
        geofenceLatitude: input.geofenceLatitude !== undefined ? input.geofenceLatitude : undefined,
        geofenceLongitude: input.geofenceLongitude !== undefined ? input.geofenceLongitude : undefined,
        geofenceRadiusM: input.geofenceRadiusM !== undefined ? input.geofenceRadiusM : undefined
      },
      select: attendanceShiftSelect
    });

    return this.toAttendanceShift(updated);
  }

  async createAttendanceAssignment(
    conversationId: string,
    shiftId: string,
    userId: string,
    input: CreateConversationAttendanceAssignmentDto
  ) {
    const context = await this.assertAttendanceManagement(conversationId, userId);
    const shift = await this.prisma.conversationAttendanceShift.findFirst({
      where: { id: shiftId, conversationId },
      select: { id: true }
    });

    if (!shift) {
      throw new NotFoundException("That attendance shift is missing.");
    }

    const targetParticipant = context.membership.conversation.participants.find(
      (participant) => participant.userId === input.userId
    );
    if (!targetParticipant) {
      throw new BadRequestException("That person is not active in this room.");
    }

    await this.prisma.conversationAttendanceAssignment.upsert({
      where: {
        shiftId_userId: {
          shiftId,
          userId: input.userId
        }
      },
      create: {
        shiftId,
        userId: input.userId,
        assignedByUserId: userId,
        status: input.status ?? ConversationAttendanceAssignmentStatus.ASSIGNED
      },
      update: {
        assignedByUserId: userId,
        status: input.status ?? ConversationAttendanceAssignmentStatus.ASSIGNED
      }
    });

    const refreshed = await this.prisma.conversationAttendanceShift.findUniqueOrThrow({
      where: { id: shiftId },
      select: attendanceShiftSelect
    });

    return this.toAttendanceShift(refreshed);
  }

  async updateAttendanceAssignment(
    conversationId: string,
    shiftId: string,
    assignmentId: string,
    userId: string,
    input: UpdateConversationAttendanceAssignmentDto
  ) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.ATTENDANCE);
    const assignment = await this.prisma.conversationAttendanceAssignment.findFirst({
      where: {
        id: assignmentId,
        shiftId,
        shift: { conversationId }
      },
      select: {
        id: true,
        userId: true
      }
    });

    if (!assignment) {
      throw new NotFoundException("That attendance assignment is missing.");
    }

    if (!context.canManage && assignment.userId !== userId) {
      throw new ForbiddenException("Only room leads or the assigned member can update this roster entry.");
    }

    if (
      !context.canManage &&
      input.status !== ConversationAttendanceAssignmentStatus.CONFIRMED &&
      input.status !== ConversationAttendanceAssignmentStatus.DECLINED
    ) {
      throw new ForbiddenException("Only room leads can set that assignment status.");
    }

    await this.prisma.conversationAttendanceAssignment.update({
      where: { id: assignmentId },
      data: { status: input.status }
    });

    const refreshed = await this.prisma.conversationAttendanceShift.findUniqueOrThrow({
      where: { id: shiftId },
      select: attendanceShiftSelect
    });

    return this.toAttendanceShift(refreshed);
  }

  async createAttendanceClockEvent(
    conversationId: string,
    shiftId: string,
    userId: string,
    input: CreateConversationAttendanceClockEventDto
  ) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.ATTENDANCE);
    const policy = await this.prisma.conversationAttendancePolicy.findUnique({
      where: { conversationId },
      select: attendancePolicySelect
    });
    const shift = await this.prisma.conversationAttendanceShift.findFirst({
      where: { id: shiftId, conversationId },
      select: attendanceShiftSelect
    });

    if (!shift) {
      throw new NotFoundException("That attendance shift is missing.");
    }

    if (shift.status === ConversationAttendanceShiftStatus.CANCELLED) {
      throw new BadRequestException("Cancelled shifts cannot receive clock events.");
    }

    const assignment = shift.assignments.find((item) => item.userId === userId) ?? null;
    const hasAssignments = shift.assignments.length > 0;
    if (hasAssignments && !assignment && !context.canManage) {
      throw new ForbiddenException("Only assigned team members can clock into this shift.");
    }

    if (!context.canManage && policy && !policy.allowSelfClock) {
      throw new ForbiddenException("Self clock-in is disabled for this room. Use a supervisor station.");
    }

    this.assertAttendanceEvidenceRequirements(shift, input);

    const existingRecord = await this.prisma.conversationAttendanceRecord.findFirst({
      where: {
        conversationId,
        shiftId,
        userId
      },
      select: attendanceRecordSelect
    });

    const refreshed = await this.prisma.$transaction(async (tx) => {
      const record =
        existingRecord ??
        (await tx.conversationAttendanceRecord.create({
          data: {
            conversationId,
            shiftId,
            assignmentId: assignment?.id ?? null,
            userId,
            status: ConversationAttendanceRecordStatus.ON_CLOCK
          },
          select: attendanceRecordSelect
        }));

      await tx.conversationAttendanceClockEvent.create({
        data: {
          recordId: record.id,
          actorUserId: userId,
          eventType: input.eventType,
          method: input.method ?? ConversationAttendanceClockMethod.WEB,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyMeters: input.accuracyMeters,
          proofUrl: this.normalizeOptionalText(input.proofUrl),
          proofProvider: input.proofProvider ?? null,
          qrValue: this.normalizeOptionalText(input.qrValue),
          stationCode: this.normalizeStationCode(input.stationCode ?? input.qrValue),
          deviceLabel: this.normalizeOptionalText(input.deviceLabel),
          note: this.normalizeOptionalText(input.note)
        }
      });

      const nextRecord = await tx.conversationAttendanceRecord.findUniqueOrThrow({
        where: { id: record.id },
        select: attendanceRecordSelect
      });
      const nextShift = await tx.conversationAttendanceShift.findUniqueOrThrow({
        where: { id: shiftId },
        select: attendanceShiftSelect
      });
      const metrics = this.buildAttendanceMetrics(nextShift, nextRecord.clockEvents);

      await tx.conversationAttendanceRecord.update({
        where: { id: record.id },
        data: {
          status: metrics.status,
          flags: metrics.flags,
          clockInAt: metrics.clockInAt,
          clockOutAt: metrics.clockOutAt,
          breakMinutes: metrics.breakMinutes,
          workedMinutes: metrics.workedMinutes,
          overtimeMinutes: metrics.overtimeMinutes,
          lateMinutes: metrics.lateMinutes,
          earlyLeaveMinutes: metrics.earlyLeaveMinutes,
          reviewNote: metrics.reviewNote
        }
      });

      if (input.eventType === ConversationAttendanceClockEventType.CLOCK_IN && nextShift.status === ConversationAttendanceShiftStatus.PUBLISHED) {
        await tx.conversationAttendanceShift.update({
          where: { id: shiftId },
          data: { status: ConversationAttendanceShiftStatus.IN_PROGRESS }
        });
      }

      return tx.conversationAttendanceRecord.findUniqueOrThrow({
        where: { id: record.id },
        select: attendanceRecordSelect
      });
    });

    return this.toAttendanceRecord(refreshed);
  }

  async reviewAttendanceRecord(
    conversationId: string,
    recordId: string,
    userId: string,
    input: ReviewConversationAttendanceRecordDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const record = await this.prisma.conversationAttendanceRecord.findFirst({
      where: { id: recordId, conversationId },
      select: { id: true }
    });

    if (!record) {
      throw new NotFoundException("That attendance record is missing.");
    }

    const updated = await this.prisma.conversationAttendanceRecord.update({
      where: { id: recordId },
      data: {
        status: input.status,
        reviewNote: this.normalizeOptionalText(input.reviewNote),
        reviewedByUserId: userId,
        approvedAt: input.status === ConversationAttendanceRecordStatus.APPROVED ? new Date() : null
      },
      select: attendanceRecordSelect
    });

    return this.toAttendanceRecord(updated);
  }

  async upsertAttendancePolicy(
    conversationId: string,
    userId: string,
    input: UpdateConversationAttendancePolicyDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);

    const updated = await this.prisma.conversationAttendancePolicy.upsert({
      where: { conversationId },
      create: {
        conversationId,
        createdById: userId,
        updatedById: userId,
        timezone: this.normalizeAttendanceTimezone(input.timezone) ?? "UTC",
        standardHoursPerDay: input.standardHoursPerDay ?? 8,
        standardHoursPerWeek: input.standardHoursPerWeek ?? 40,
        overtimeAfterMinutes: input.overtimeAfterMinutes ?? 480,
        doubleTimeAfterMinutes: input.doubleTimeAfterMinutes ?? 720,
        lateGraceMinutes: input.lateGraceMinutes ?? 10,
        breakRequiredAfterMinutes: input.breakRequiredAfterMinutes ?? 360,
        breakDurationMinutes: input.breakDurationMinutes ?? 30,
        allowSelfClock: input.allowSelfClock ?? true,
        allowManualAdjustments: input.allowManualAdjustments ?? true,
        requireSupervisorApproval: input.requireSupervisorApproval ?? true,
        requireLocation: input.requireLocation ?? false,
        requirePhoto: input.requirePhoto ?? false,
        requireQr: input.requireQr ?? false,
        requireNfc: input.requireNfc ?? false,
        stationLabel: this.normalizeOptionalText(input.stationLabel),
        stationCode: this.normalizeStationCode(input.stationCode)
      },
      update: {
        updatedById: userId,
        timezone: input.timezone !== undefined ? this.normalizeAttendanceTimezone(input.timezone) : undefined,
        standardHoursPerDay: input.standardHoursPerDay,
        standardHoursPerWeek: input.standardHoursPerWeek,
        overtimeAfterMinutes: input.overtimeAfterMinutes,
        doubleTimeAfterMinutes: input.doubleTimeAfterMinutes,
        lateGraceMinutes: input.lateGraceMinutes,
        breakRequiredAfterMinutes: input.breakRequiredAfterMinutes,
        breakDurationMinutes: input.breakDurationMinutes,
        allowSelfClock: input.allowSelfClock,
        allowManualAdjustments: input.allowManualAdjustments,
        requireSupervisorApproval: input.requireSupervisorApproval,
        requireLocation: input.requireLocation,
        requirePhoto: input.requirePhoto,
        requireQr: input.requireQr,
        requireNfc: input.requireNfc,
        stationLabel: input.stationLabel !== undefined ? this.normalizeOptionalText(input.stationLabel) : undefined,
        stationCode: input.stationCode !== undefined ? this.normalizeStationCode(input.stationCode) : undefined
      },
      select: attendancePolicySelect
    });

    return this.toAttendancePolicy(updated);
  }

  async createAttendanceHoliday(
    conversationId: string,
    userId: string,
    input: CreateConversationAttendanceHolidayDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const startsOn = new Date(input.startsOn);
    const endsOn = new Date(input.endsOn);
    this.assertAttendanceWindow(startsOn, endsOn, "Choose a valid holiday window.");

    const policy = await this.prisma.conversationAttendancePolicy.findUnique({
      where: { conversationId },
      select: { id: true }
    });

    const created = await this.prisma.conversationAttendanceHoliday.create({
      data: {
        conversationId,
        policyId: policy?.id ?? null,
        createdById: userId,
        title: this.normalizeRequiredText(input.title, "Give this holiday a title."),
        description: this.normalizeOptionalText(input.description),
        scope: input.scope ?? ConversationAttendanceHolidayScope.ROOM,
        category:
          (input.scope ?? ConversationAttendanceHolidayScope.ROOM) === ConversationAttendanceHolidayScope.CATEGORY
            ? input.category ?? null
            : null,
        startsOn,
        endsOn,
        isPaid: input.isPaid ?? true
      },
      select: attendanceHolidaySelect
    });

    return this.toAttendanceHoliday(created);
  }

  async updateAttendanceHoliday(
    conversationId: string,
    holidayId: string,
    userId: string,
    input: UpdateConversationAttendanceHolidayDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const existing = await this.prisma.conversationAttendanceHoliday.findFirst({
      where: { id: holidayId, conversationId },
      select: {
        id: true,
        startsOn: true,
        endsOn: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That holiday is missing.");
    }

    const startsOn = input.startsOn ? new Date(input.startsOn) : existing.startsOn;
    const endsOn = input.endsOn ? new Date(input.endsOn) : existing.endsOn;
    this.assertAttendanceWindow(startsOn, endsOn, "Choose a valid holiday window.");

    const updated = await this.prisma.conversationAttendanceHoliday.update({
      where: { id: holidayId },
      data: {
        title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give this holiday a title.") : undefined,
        description: input.description !== undefined ? this.normalizeOptionalText(input.description) : undefined,
        scope: input.scope,
        category:
          input.scope === ConversationAttendanceHolidayScope.CATEGORY
            ? input.category ?? null
            : input.scope !== undefined
              ? null
              : input.category,
        startsOn: input.startsOn ? startsOn : undefined,
        endsOn: input.endsOn ? endsOn : undefined,
        isPaid: input.isPaid
      },
      select: attendanceHolidaySelect
    });

    return this.toAttendanceHoliday(updated);
  }

  async createAttendanceLeaveRequest(
    conversationId: string,
    userId: string,
    input: CreateConversationAttendanceLeaveRequestDto
  ) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.ATTENDANCE);
    const targetUserId = input.userId ?? userId;
    const isRoomMember = context.membership.conversation.participants.some((participant) => participant.userId === targetUserId);

    if (!isRoomMember) {
      throw new BadRequestException("That person is not active in this room.");
    }

    if (targetUserId !== userId && !context.canManage) {
      throw new ForbiddenException("Only room leads can file leave on behalf of another member.");
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    this.assertAttendanceWindow(startsAt, endsAt, "Choose a valid leave request window.");
    const policy = await this.prisma.conversationAttendancePolicy.findUnique({
      where: { conversationId },
      select: { id: true }
    });

    const created = await this.prisma.conversationAttendanceLeaveRequest.create({
      data: {
        conversationId,
        policyId: policy?.id ?? null,
        leavePolicyId: input.leavePolicyId ?? null,
        userId: targetUserId,
        leaveType: input.leaveType ?? ConversationAttendanceLeaveType.PERSONAL,
        status: ConversationAttendanceLeaveStatus.PENDING,
        title: this.normalizeRequiredText(input.title, "Give this leave request a title."),
        reason: this.normalizeOptionalText(input.reason),
        startsAt,
        endsAt,
        minutesRequested: this.diffMinutes(startsAt, endsAt),
        isPartialDay: input.isPartialDay ?? false,
        deductFromBalance: input.deductFromBalance ?? true
      },
      select: attendanceLeaveRequestSelect
    });

    return this.toAttendanceLeaveRequest(created);
  }

  async reviewAttendanceLeaveRequest(
    conversationId: string,
    leaveRequestId: string,
    userId: string,
    input: ReviewConversationAttendanceLeaveRequestDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const leaveRequest = await this.prisma.conversationAttendanceLeaveRequest.findFirst({
      where: { id: leaveRequestId, conversationId },
      select: { id: true }
    });

    if (!leaveRequest) {
      throw new NotFoundException("That leave request is missing.");
    }

    const updated = await this.prisma.conversationAttendanceLeaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: input.status,
        reviewNote: this.normalizeOptionalText(input.reviewNote),
        reviewedByUserId: userId,
        decidedAt: new Date()
      },
      select: attendanceLeaveRequestSelect
    });

    return this.toAttendanceLeaveRequest(updated);
  }

  async createAttendanceLeavePolicy(
    conversationId: string,
    userId: string,
    input: CreateConversationAttendanceLeavePolicyDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const attendancePolicy = await this.prisma.conversationAttendancePolicy.findUnique({
      where: { conversationId },
      select: { id: true }
    });

    const created = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.conversationAttendanceLeavePolicy.updateMany({
          where: { conversationId, isDefault: true },
          data: { isDefault: false, updatedById: userId }
        });
      }

      const leavePolicy = await tx.conversationAttendanceLeavePolicy.create({
        data: {
          conversationId,
          attendancePolicyId: attendancePolicy?.id ?? null,
          createdById: userId,
          updatedById: userId,
          title: this.normalizeRequiredText(input.title, "Give this leave policy a title."),
          leaveType: input.leaveType,
          annualAllowanceMinutes: input.annualAllowanceMinutes ?? 0,
          carryOverMinutes: input.carryOverMinutes ?? 0,
          accrualCadence: input.accrualCadence ?? ConversationAttendanceLeaveAccrualCadence.MONTHLY,
          accrualAmountMinutes: input.accrualAmountMinutes ?? 0,
          allowNegativeBalance: input.allowNegativeBalance ?? false,
          requiresApproval: input.requiresApproval ?? true,
          isDefault: input.isDefault ?? false,
          isActive: input.isActive ?? true
        },
        select: attendanceLeavePolicySelect
      });

      await this.writeAttendanceAuditLog(tx, {
        conversationId,
        actorUserId: userId,
        action: ConversationAttendanceAuditAction.LEAVE_POLICY_CREATED,
        targetType: "attendance_leave_policy",
        targetId: leavePolicy.id,
        summary: `Created leave policy ${leavePolicy.title}.`,
        metadata: {
          leaveType: leavePolicy.leaveType,
          isDefault: leavePolicy.isDefault
        }
      });

      return leavePolicy;
    });

    return this.toAttendanceLeavePolicy(created);
  }

  async updateAttendanceLeavePolicy(
    conversationId: string,
    leavePolicyId: string,
    userId: string,
    input: UpdateConversationAttendanceLeavePolicyDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const existing = await this.prisma.conversationAttendanceLeavePolicy.findFirst({
      where: { id: leavePolicyId, conversationId },
      select: attendanceLeavePolicySelect
    });

    if (!existing) {
      throw new NotFoundException("That leave policy is missing.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.conversationAttendanceLeavePolicy.updateMany({
          where: {
            conversationId,
            isDefault: true,
            NOT: { id: leavePolicyId }
          },
          data: { isDefault: false, updatedById: userId }
        });
      }

      const leavePolicy = await tx.conversationAttendanceLeavePolicy.update({
        where: { id: leavePolicyId },
        data: {
          updatedById: userId,
          title:
            input.title !== undefined
              ? this.normalizeRequiredText(input.title, "Give this leave policy a title.")
              : undefined,
          leaveType: input.leaveType,
          annualAllowanceMinutes: input.annualAllowanceMinutes,
          carryOverMinutes: input.carryOverMinutes,
          accrualCadence: input.accrualCadence,
          accrualAmountMinutes: input.accrualAmountMinutes,
          allowNegativeBalance: input.allowNegativeBalance,
          requiresApproval: input.requiresApproval,
          isDefault: input.isDefault,
          isActive: input.isActive
        },
        select: attendanceLeavePolicySelect
      });

      await this.writeAttendanceAuditLog(tx, {
        conversationId,
        actorUserId: userId,
        action: ConversationAttendanceAuditAction.LEAVE_POLICY_UPDATED,
        targetType: "attendance_leave_policy",
        targetId: leavePolicy.id,
        summary: `Updated leave policy ${leavePolicy.title}.`,
        metadata: {
          previousDefault: existing.isDefault,
          currentDefault: leavePolicy.isDefault
        }
      });

      return leavePolicy;
    });

    return this.toAttendanceLeavePolicy(updated);
  }

  async adjustAttendanceLeaveBalance(
    conversationId: string,
    leavePolicyId: string,
    userId: string,
    input: AdjustConversationAttendanceLeaveBalanceDto
  ) {
    const context = await this.assertAttendanceManagement(conversationId, userId);
    const leavePolicy = await this.prisma.conversationAttendanceLeavePolicy.findFirst({
      where: { id: leavePolicyId, conversationId },
      select: attendanceLeavePolicySelect
    });

    if (!leavePolicy) {
      throw new NotFoundException("That leave policy is missing.");
    }

    const memberExists = context.membership.conversation.participants.some((participant) => participant.userId === input.userId);
    if (!memberExists) {
      throw new BadRequestException("That person is not active in this room.");
    }

    const entryType = input.entryType ?? ConversationAttendanceLeaveBalanceEntryType.ADJUSTMENT;
    const effectiveAt = this.normalizeOptionalDate(input.effectiveAt) ?? new Date();

    const updatedBalance = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.conversationAttendanceLeaveBalance.findUnique({
        where: {
          leavePolicyId_userId: {
            leavePolicyId,
            userId: input.userId
          }
        },
        select: {
          id: true,
          availableMinutes: true,
          usedMinutes: true,
          pendingMinutes: true,
          accruedMinutes: true
        }
      });

      const nextAvailable = (existing?.availableMinutes ?? 0) + input.minutesDelta;
      if (!leavePolicy.allowNegativeBalance && nextAvailable < 0) {
        throw new BadRequestException("This leave policy does not allow a negative balance.");
      }

      const nextAccrued =
        entryType === ConversationAttendanceLeaveBalanceEntryType.ACCRUAL ||
        entryType === ConversationAttendanceLeaveBalanceEntryType.CARRY_OVER ||
        entryType === ConversationAttendanceLeaveBalanceEntryType.OPENING
          ? (existing?.accruedMinutes ?? 0) + input.minutesDelta
          : existing?.accruedMinutes ?? 0;

      const balance = await tx.conversationAttendanceLeaveBalance.upsert({
        where: {
          leavePolicyId_userId: {
            leavePolicyId,
            userId: input.userId
          }
        },
        create: {
          conversationId,
          leavePolicyId,
          userId: input.userId,
          availableMinutes: nextAvailable,
          usedMinutes: 0,
          pendingMinutes: 0,
          accruedMinutes: nextAccrued
        },
        update: {
          availableMinutes: nextAvailable,
          accruedMinutes: nextAccrued
        },
        select: { id: true }
      });

      await tx.conversationAttendanceLeaveBalanceEntry.create({
        data: {
          conversationId,
          leaveBalanceId: balance.id,
          leavePolicyId,
          userId: input.userId,
          actorUserId: userId,
          entryType,
          minutesDelta: input.minutesDelta,
          balanceAfterMinutes: nextAvailable,
          note: this.normalizeOptionalText(input.note),
          effectiveAt
        }
      });

      await this.writeAttendanceAuditLog(tx, {
        conversationId,
        actorUserId: userId,
        action: ConversationAttendanceAuditAction.LEAVE_BALANCE_ADJUSTED,
        targetType: "attendance_leave_balance",
        targetId: balance.id,
        summary: `Adjusted leave balance for ${leavePolicy.title}.`,
        metadata: {
          leavePolicyId,
          subjectUserId: input.userId,
          minutesDelta: input.minutesDelta,
          entryType
        }
      });

      return tx.conversationAttendanceLeaveBalance.findUniqueOrThrow({
        where: { id: balance.id },
        select: attendanceLeaveBalanceSelect
      });
    });

    return this.toAttendanceLeaveBalance(updatedBalance);
  }

  async applyAttendanceLeaveAccrual(
    conversationId: string,
    leavePolicyId: string,
    userId: string,
    input: ApplyConversationAttendanceAccrualDto
  ) {
    const context = await this.assertAttendanceManagement(conversationId, userId);
    const leavePolicy = await this.prisma.conversationAttendanceLeavePolicy.findFirst({
      where: { id: leavePolicyId, conversationId },
      select: attendanceLeavePolicySelect
    });

    if (!leavePolicy) {
      throw new NotFoundException("That leave policy is missing.");
    }

    const minutes = input.minutes ?? leavePolicy.accrualAmountMinutes;
    if (minutes <= 0) {
      throw new BadRequestException("Set an accrual amount greater than zero.");
    }

    const roomUserIds = new Set(context.membership.conversation.participants.map((participant) => participant.userId));
    const participantUserIds =
      input.userId
        ? [input.userId]
        : input.participantUserIds?.length
          ? Array.from(new Set(input.participantUserIds))
          : Array.from(roomUserIds);

    const invalidTarget = participantUserIds.find((participantUserId) => !roomUserIds.has(participantUserId));
    if (invalidTarget) {
      throw new BadRequestException("Every accrual target must already be active in this room.");
    }

    const effectiveAt = this.normalizeOptionalDate(input.effectiveAt) ?? new Date();

    const balances = await this.prisma.$transaction(async (tx) => {
      const updated: AttendanceLeaveBalanceRow[] = [];

      for (const participantUserId of participantUserIds) {
        const existing = await tx.conversationAttendanceLeaveBalance.findUnique({
          where: {
            leavePolicyId_userId: {
              leavePolicyId,
              userId: participantUserId
            }
          },
          select: {
            id: true,
            availableMinutes: true,
            usedMinutes: true,
            pendingMinutes: true,
            accruedMinutes: true
          }
        });

        const nextAvailable = (existing?.availableMinutes ?? 0) + minutes;
        const nextAccrued = (existing?.accruedMinutes ?? 0) + minutes;

        const balance = await tx.conversationAttendanceLeaveBalance.upsert({
          where: {
            leavePolicyId_userId: {
              leavePolicyId,
              userId: participantUserId
            }
          },
          create: {
            conversationId,
            leavePolicyId,
            userId: participantUserId,
            availableMinutes: nextAvailable,
            usedMinutes: 0,
            pendingMinutes: 0,
            accruedMinutes: nextAccrued
          },
          update: {
            availableMinutes: nextAvailable,
            accruedMinutes: nextAccrued
          },
          select: { id: true }
        });

        await tx.conversationAttendanceLeaveBalanceEntry.create({
          data: {
            conversationId,
            leaveBalanceId: balance.id,
            leavePolicyId,
            userId: participantUserId,
            actorUserId: userId,
            entryType: ConversationAttendanceLeaveBalanceEntryType.ACCRUAL,
            minutesDelta: minutes,
            balanceAfterMinutes: nextAvailable,
            note: this.normalizeOptionalText(input.note) ?? "Leave accrual applied.",
            effectiveAt
          }
        });

        updated.push(
          await tx.conversationAttendanceLeaveBalance.findUniqueOrThrow({
            where: { id: balance.id },
            select: attendanceLeaveBalanceSelect
          })
        );
      }

      await this.writeAttendanceAuditLog(tx, {
        conversationId,
        actorUserId: userId,
        action: ConversationAttendanceAuditAction.LEAVE_ACCRUAL_APPLIED,
        targetType: "attendance_leave_policy",
        targetId: leavePolicyId,
        summary: `Applied leave accrual to ${participantUserIds.length} member(s).`,
        metadata: {
          leavePolicyId,
          minutes,
          participantUserIds
        }
      });

      return updated;
    });

    return {
      leavePolicy: this.toAttendanceLeavePolicy(leavePolicy),
      balances: balances.map((item) => this.toAttendanceLeaveBalance(item)),
      updatedCount: balances.length,
      effectiveAt
    };
  }

  async createAttendanceRotaRun(
    conversationId: string,
    userId: string,
    input: CreateConversationAttendanceRotaRunDto
  ) {
    const context = await this.assertAttendanceManagement(conversationId, userId);
    const template = await this.prisma.conversationAttendanceShiftTemplate.findFirst({
      where: { id: input.templateId, conversationId },
      select: attendanceTemplateSelect
    });

    if (!template) {
      throw new NotFoundException("That attendance template is missing.");
    }

    const startsOn = new Date(input.startsOn);
    const endsOn = new Date(input.endsOn);
    this.assertAttendanceWindow(startsOn, endsOn, "Choose a valid rota window.");

    const roomUserIds = new Set(context.membership.conversation.participants.map((participant) => participant.userId));
    const participantUserIds =
      input.participantUserIds?.length
        ? Array.from(new Set(input.participantUserIds))
        : Array.from(roomUserIds);

    const invalidTarget = participantUserIds.find((participantUserId) => !roomUserIds.has(participantUserId));
    if (invalidTarget) {
      throw new BadRequestException("Every rota participant must already be active in this room.");
    }

    const shiftDates = this.generateAttendanceRotaDates(
      startsOn,
      endsOn,
      template.daysOfWeek,
      input.frequency
    );

    const rotaRun = await this.prisma.$transaction(async (tx) => {
      const createdRun = await tx.conversationAttendanceRotaRun.create({
        data: {
          conversationId,
          templateId: template.id,
          createdById: userId,
          title: this.normalizeRequiredText(input.title, "Give this rota run a title."),
          frequency: input.frequency,
          startsOn,
          endsOn,
          participantUserIds,
          isActive: input.isActive ?? true
        },
        select: { id: true }
      });

      let generatedShiftCount = 0;
      for (const shiftDate of shiftDates) {
        const shiftStartsAt = this.applyTemplateTimeToDate(shiftDate, template.startsAtTime);
        let shiftEndsAt = this.applyTemplateTimeToDate(shiftDate, template.endsAtTime);
        if (shiftEndsAt.getTime() <= shiftStartsAt.getTime()) {
          shiftEndsAt = new Date(shiftEndsAt);
          shiftEndsAt.setDate(shiftEndsAt.getDate() + 1);
        }

        const shift = await tx.conversationAttendanceShift.create({
          data: {
            conversationId,
            templateId: template.id,
            createdById: userId,
            rotaRunId: createdRun.id,
            title: template.title,
            notes: template.description,
            locationName: template.locationName,
            locationAddress: template.locationAddress,
            startsAt: shiftStartsAt,
            endsAt: shiftEndsAt,
            breakMinutes: template.breakMinutes,
            gracePeriodMinutes: template.gracePeriodMinutes,
            approvalRequired: true,
            status: ConversationAttendanceShiftStatus.PUBLISHED,
            requiresLocation: template.requiresLocation,
            requiresPhoto: template.requiresPhoto,
            requiresQr: template.requiresQr,
            requiresNfc: template.requiresNfc,
            geofenceLatitude: template.geofenceLatitude,
            geofenceLongitude: template.geofenceLongitude,
            geofenceRadiusM: template.geofenceRadiusM,
            stationCode: null
          },
          select: { id: true }
        });

        if (participantUserIds.length > 0) {
          await tx.conversationAttendanceAssignment.createMany({
            data: participantUserIds.map((participantUserId) => ({
              shiftId: shift.id,
              userId: participantUserId,
              assignedByUserId: userId,
              status: ConversationAttendanceAssignmentStatus.ASSIGNED
            }))
          });
        }

        generatedShiftCount += 1;
      }

      await tx.conversationAttendanceRotaRun.update({
        where: { id: createdRun.id },
        data: {
          generatedShiftCount,
          lastGeneratedAt: generatedShiftCount > 0 ? new Date() : null
        }
      });

      await this.writeAttendanceAuditLog(tx, {
        conversationId,
        actorUserId: userId,
        action: ConversationAttendanceAuditAction.ROTA_GENERATED,
        targetType: "attendance_rota_run",
        targetId: createdRun.id,
        summary: `Generated rota run ${input.title}.`,
        metadata: {
          templateId: template.id,
          generatedShiftCount,
          participantCount: participantUserIds.length
        }
      });

      return tx.conversationAttendanceRotaRun.findUniqueOrThrow({
        where: { id: createdRun.id },
        select: attendanceRotaRunSelect
      });
    });

    return this.toAttendanceRotaRun(rotaRun);
  }

  async getAttendanceMemberHistory(conversationId: string, memberUserId: string, viewerUserId: string) {
    const context = await this.getConversationContext(conversationId, viewerUserId, ConversationToolPack.ATTENDANCE);
    if (!context.canManage && memberUserId !== viewerUserId) {
      throw new ForbiddenException("Only supervisors can open another member's attendance history.");
    }

    const participant = context.membership.conversation.participants.find((item) => item.userId === memberUserId);
    if (!participant) {
      throw new NotFoundException("That room member is missing.");
    }

    const [records, leaveRequests, upcomingAssignments] = await Promise.all([
      this.prisma.conversationAttendanceRecord.findMany({
        where: { conversationId, userId: memberUserId },
        select: attendanceRecordSelect,
        orderBy: [{ updatedAt: "desc" }],
        take: 40
      }),
      this.prisma.conversationAttendanceLeaveRequest.findMany({
        where: { conversationId, userId: memberUserId },
        select: attendanceLeaveRequestSelect,
        orderBy: [{ startsAt: "desc" }],
        take: 20
      }),
      this.prisma.conversationAttendanceShift.findMany({
        where: {
          conversationId,
          startsAt: { gte: new Date() },
          assignments: {
            some: {
              userId: memberUserId,
              status: {
                in: [ConversationAttendanceAssignmentStatus.ASSIGNED, ConversationAttendanceAssignmentStatus.CONFIRMED]
              }
            }
          }
        },
        select: attendanceShiftSelect,
        orderBy: [{ startsAt: "asc" }],
        take: 8
      })
    ]);

    const summary = {
      scheduledShifts: upcomingAssignments.length,
      completedShifts: records.filter((record) => record.clockOutAt).length,
      workedMinutes: records.reduce((sum, record) => sum + record.workedMinutes, 0),
      overtimeMinutes: records.reduce((sum, record) => sum + record.overtimeMinutes, 0),
      lateCount: records.filter((record) => record.lateMinutes > 0).length,
      exceptionCount: records.filter((record) => record.flags.length > 0).length,
      approvedLeaveCount: leaveRequests.filter((item) => item.status === ConversationAttendanceLeaveStatus.APPROVED).length,
      pendingLeaveCount: leaveRequests.filter((item) => item.status === ConversationAttendanceLeaveStatus.PENDING).length
    };

    return {
      member: {
        id: participant.user.id,
        username: participant.user.username,
        userCode: participant.user.userCode,
        displayName: participant.user.displayName,
        avatarUrl: participant.user.avatarUrl
      },
      summary,
      recentRecords: records.map((item) => this.toAttendanceRecord(item)),
      leaveRequests: leaveRequests.map((item) => this.toAttendanceLeaveRequest(item)),
      upcomingAssignments: upcomingAssignments.map((item) => this.toAttendanceShiftSummary(item))
    };
  }

  async exportAttendance(
    conversationId: string,
    userId: string,
    query: ListConversationAttendanceExportQueryDto
  ) {
    await this.assertAttendanceManagement(conversationId, userId);
    const from = query.from ? new Date(query.from) : this.startOfCurrentMonth();
    const to = query.to ? new Date(query.to) : new Date();
    this.assertAttendanceWindow(from, to, "Choose a valid export range.");

    const recordWhere: Prisma.ConversationAttendanceRecordWhereInput = {
      conversationId,
      shift: {
        startsAt: {
          gte: from,
          lte: to
        }
      }
    };
    if (query.userId) {
      recordWhere.userId = query.userId;
    }

    const leaveWhere: Prisma.ConversationAttendanceLeaveRequestWhereInput = {
      conversationId,
      startsAt: {
        gte: from,
        lte: to
      }
    };
    if (query.userId) {
      leaveWhere.userId = query.userId;
    }

    const [records, leaveRequests] = await Promise.all([
      this.prisma.conversationAttendanceRecord.findMany({
        where: recordWhere,
        select: attendanceRecordSelect,
        orderBy: [{ userId: "asc" }, { updatedAt: "desc" }]
      }),
      this.prisma.conversationAttendanceLeaveRequest.findMany({
        where: leaveWhere,
        select: attendanceLeaveRequestSelect,
        orderBy: [{ userId: "asc" }, { startsAt: "asc" }]
      })
    ]);

    const rows = new Map<
      string,
      {
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
        shiftsWorked: number;
      }
    >();

    for (const record of records) {
      const row =
        rows.get(record.userId) ??
        {
          userId: record.userId,
          member: record.user.displayName,
          code: record.user.userCode ?? record.user.username,
          workedMinutes: 0,
          breakMinutes: 0,
          overtimeMinutes: 0,
          lateCount: 0,
          exceptionCount: 0,
          approvedLeaveMinutes: 0,
          pendingLeaveMinutes: 0,
          shiftsWorked: 0
        };
      row.workedMinutes += record.workedMinutes;
      row.breakMinutes += record.breakMinutes;
      row.overtimeMinutes += record.overtimeMinutes;
      row.lateCount += record.lateMinutes > 0 ? 1 : 0;
      row.exceptionCount += record.flags.length > 0 ? 1 : 0;
      row.shiftsWorked += record.clockOutAt ? 1 : 0;
      rows.set(record.userId, row);
    }

    for (const leave of leaveRequests) {
      const row =
        rows.get(leave.userId) ??
        {
          userId: leave.userId,
          member: leave.user.displayName,
          code: leave.user.userCode ?? leave.user.username,
          workedMinutes: 0,
          breakMinutes: 0,
          overtimeMinutes: 0,
          lateCount: 0,
          exceptionCount: 0,
          approvedLeaveMinutes: 0,
          pendingLeaveMinutes: 0,
          shiftsWorked: 0
        };
      if (leave.status === ConversationAttendanceLeaveStatus.APPROVED) {
        row.approvedLeaveMinutes += leave.minutesRequested;
      }
      if (leave.status === ConversationAttendanceLeaveStatus.PENDING) {
        row.pendingLeaveMinutes += leave.minutesRequested;
      }
      rows.set(leave.userId, row);
    }

    const summaryRows = Array.from(rows.values()).sort((left, right) => left.member.localeCompare(right.member));
    const csvLines = [
      "member,code,worked_minutes,break_minutes,overtime_minutes,late_count,exception_count,approved_leave_minutes,pending_leave_minutes,shifts_worked",
      ...summaryRows.map((row) =>
        [
          this.csvEscape(row.member),
          this.csvEscape(row.code),
          row.workedMinutes,
          row.breakMinutes,
          row.overtimeMinutes,
          row.lateCount,
          row.exceptionCount,
          row.approvedLeaveMinutes,
          row.pendingLeaveMinutes,
          row.shiftsWorked
        ].join(",")
      )
    ];

    return {
      generatedAt: new Date(),
      range: {
        from,
        to
      },
      totals: {
        members: summaryRows.length,
        workedMinutes: summaryRows.reduce((sum, row) => sum + row.workedMinutes, 0),
        overtimeMinutes: summaryRows.reduce((sum, row) => sum + row.overtimeMinutes, 0),
        approvedLeaveMinutes: summaryRows.reduce((sum, row) => sum + row.approvedLeaveMinutes, 0),
        pendingLeaveMinutes: summaryRows.reduce((sum, row) => sum + row.pendingLeaveMinutes, 0),
        pendingApprovals: records.filter((record) => record.status === ConversationAttendanceRecordStatus.PENDING_APPROVAL).length
      },
      rows: summaryRows,
      csv: csvLines.join("\n")
    };
  }

  async createNote(conversationId: string, userId: string, input: CreateConversationToolNoteDto) {
    const context = await this.getConversationContext(
      conversationId,
      userId,
      input.kind === ConversationNoteKind.ANNOUNCEMENT ? ConversationToolPack.COMMUNITY_CARE : ConversationToolPack.CORE_WORKSPACE
    );

    if (input.kind === ConversationNoteKind.ANNOUNCEMENT && !context.canManage) {
      throw new ForbiddenException("Only room leads can publish announcements here.");
    }

    const created = await this.prisma.conversationToolNote.create({
      data: {
        conversationId,
        createdById: userId,
        updatedById: userId,
        kind: input.kind,
        audience:
          input.kind === ConversationNoteKind.ANNOUNCEMENT
            ? input.audience ?? ConversationAnnouncementAudience.ROOM
            : ConversationAnnouncementAudience.ROOM,
        title: this.normalizeRequiredText(input.title, "Give this note a title."),
        body: this.normalizeRequiredText(input.body, "Write something in the note body."),
        pinnedAt: input.pinned ? new Date() : null,
        expiresAt:
          input.kind === ConversationNoteKind.ANNOUNCEMENT
            ? this.normalizeOptionalDate(input.expiresAt)
            : null
      },
      select: toolNoteSelect
    });

    return this.toNote(created);
  }

  async updateNote(conversationId: string, noteId: string, userId: string, input: UpdateConversationToolNoteDto) {
    const existing = await this.prisma.conversationToolNote.findFirst({
      where: { id: noteId, conversationId },
      select: {
        id: true,
        kind: true,
        createdById: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That note is missing.");
    }

    const nextKind = input.kind ?? existing.kind;
    const context = await this.getConversationContext(
      conversationId,
      userId,
      nextKind === ConversationNoteKind.ANNOUNCEMENT ? ConversationToolPack.COMMUNITY_CARE : ConversationToolPack.CORE_WORKSPACE
    );

    if (nextKind === ConversationNoteKind.ANNOUNCEMENT && !context.canManage) {
      throw new ForbiddenException("Only room leads can publish announcements here.");
    }

    if (!context.canManage && existing.createdById !== userId) {
      throw new ForbiddenException("You can only edit notes you created.");
    }

    const updated = await this.prisma.conversationToolNote.update({
      where: { id: noteId },
      data: {
        kind: nextKind,
        audience:
          input.audience !== undefined
            ? input.audience
            : nextKind === ConversationNoteKind.ANNOUNCEMENT
              ? undefined
              : ConversationAnnouncementAudience.ROOM,
        title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give this note a title.") : undefined,
        body: input.body !== undefined ? this.normalizeRequiredText(input.body, "Write something in the note body.") : undefined,
        pinnedAt: input.pinned === undefined ? undefined : input.pinned ? new Date() : null,
        expiresAt:
          input.expiresAt !== undefined
            ? this.normalizeOptionalDate(input.expiresAt)
            : nextKind === ConversationNoteKind.ANNOUNCEMENT
              ? undefined
              : null,
        updatedById: userId
      },
      select: toolNoteSelect
    });

    return this.toNote(updated);
  }

  async deleteNote(conversationId: string, noteId: string, userId: string) {
    const existing = await this.prisma.conversationToolNote.findFirst({
      where: { id: noteId, conversationId },
      select: {
        id: true,
        kind: true,
        createdById: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That note is missing.");
    }

    const context = await this.getConversationContext(
      conversationId,
      userId,
      existing.kind === ConversationNoteKind.ANNOUNCEMENT ? ConversationToolPack.COMMUNITY_CARE : ConversationToolPack.CORE_WORKSPACE
    );

    if (!context.canManage && existing.createdById !== userId) {
      throw new ForbiddenException("You can only remove notes you created.");
    }

    await this.prisma.conversationToolNote.delete({
      where: { id: noteId }
    });

    return { ok: true };
  }

  async createTask(conversationId: string, userId: string, input: CreateConversationToolTaskDto) {
    const context = await this.getConversationContext(conversationId, userId, [
      ConversationToolPack.CORE_WORKSPACE,
      ConversationToolPack.BOARDS
    ]);
    const assignedToUserId = this.normalizeAssignee(context.membership, input.assignedToUserId);
    const placement = await this.resolveTaskPlacement(context, {
      boardId: input.boardId,
      columnId: input.columnId,
      sortOrder: input.sortOrder
    });
    const sprint = await this.resolveTaskSprint(
      conversationId,
      placement?.boardId ?? input.boardId ?? null,
      input.sprintId,
      input.sprintName
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const identity = await this.allocateTaskIdentity(tx, placement?.boardId ?? null);
      return tx.conversationToolTask.create({
        data: {
          conversationId,
          createdById: userId,
          assignedToUserId,
          boardId: placement?.boardId ?? null,
          columnId: placement?.columnId ?? null,
          sprintId: sprint?.id ?? null,
          taskNumber: identity?.taskNumber ?? null,
          taskCode: identity?.taskCode ?? null,
          title: this.normalizeRequiredText(input.title, "Give the task a title."),
          details: this.normalizeOptionalText(input.details),
          category: this.normalizeOptionalText(input.category),
          taskType: input.taskType ?? ConversationTaskType.TASK,
          priority: input.priority ?? ConversationTaskPriority.MEDIUM,
          storyPoints: input.storyPoints ?? null,
          score: input.score ?? null,
          sprintName: sprint?.title ?? this.normalizeOptionalText(input.sprintName),
          labels: this.normalizeLabels(input.labels),
          pinned: input.pinned ?? false,
          sortOrder: placement?.sortOrder ?? input.sortOrder ?? 0,
          status: placement?.status ?? ConversationTaskStatus.TODO,
          dueAt: input.dueAt ? new Date(input.dueAt) : null
        },
        select: toolTaskSelect
      });
    });

    return this.toTask(created, userId);
  }

  async createTaskFromMessage(conversationId: string, userId: string, input: CreateConversationToolTaskFromMessageDto) {
    const context = await this.getConversationContext(conversationId, userId, [
      ConversationToolPack.CORE_WORKSPACE,
      ConversationToolPack.BOARDS
    ]);
    const sourceMessage = await this.prisma.message.findFirst({
      where: {
        id: input.messageId,
        conversationId,
        deletedAt: null
      },
      select: {
        id: true,
        body: true,
        type: true,
        createdAt: true,
        sender: {
          select: toolUserSelect
        }
      }
    });

    if (!sourceMessage) {
      throw new NotFoundException("That message is not available for task conversion.");
    }

    const assignedToUserId = this.normalizeAssignee(context.membership, input.assignedToUserId);
    const placement = await this.resolveTaskPlacement(context, {
      boardId: input.boardId,
      columnId: input.columnId,
      sortOrder: input.sortOrder
    });
    const fallbackTitle = sourceMessage.body?.trim()
      ? sourceMessage.body.trim().slice(0, 120)
      : `Follow up on ${sourceMessage.type.toLowerCase()} from ${sourceMessage.sender?.displayName ?? "this message"}`;

    const sprint = await this.resolveTaskSprint(
      conversationId,
      placement?.boardId ?? input.boardId ?? null,
      input.sprintId,
      input.sprintName
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const identity = await this.allocateTaskIdentity(tx, placement?.boardId ?? null);
      return tx.conversationToolTask.create({
        data: {
          conversationId,
          createdById: userId,
          assignedToUserId,
          sourceMessageId: sourceMessage.id,
          boardId: placement?.boardId ?? null,
          columnId: placement?.columnId ?? null,
          sprintId: sprint?.id ?? null,
          taskNumber: identity?.taskNumber ?? null,
          taskCode: identity?.taskCode ?? null,
          title: this.normalizeRequiredText(input.title ?? fallbackTitle, "Give the task a title."),
          details: sourceMessage.body?.trim() || null,
          category: this.normalizeOptionalText(input.category),
          taskType: input.taskType ?? ConversationTaskType.FOLLOW_UP,
          priority: input.priority ?? ConversationTaskPriority.MEDIUM,
          storyPoints: input.storyPoints ?? null,
          score: input.score ?? null,
          sprintName: sprint?.title ?? this.normalizeOptionalText(input.sprintName),
          labels: this.normalizeLabels(input.labels),
          pinned: input.pinned ?? false,
          sortOrder: placement?.sortOrder ?? input.sortOrder ?? 0,
          status: placement?.status ?? ConversationTaskStatus.TODO,
          dueAt: input.dueAt ? new Date(input.dueAt) : null
        },
        select: toolTaskSelect
      });
    });

    return this.toTask(created, userId);
  }

  async updateTask(conversationId: string, taskId: string, userId: string, input: UpdateConversationToolTaskDto) {
    const context = await this.getConversationContext(conversationId, userId, [
      ConversationToolPack.CORE_WORKSPACE,
      ConversationToolPack.BOARDS
    ]);
    const existing = await this.prisma.conversationToolTask.findFirst({
      where: { id: taskId, conversationId },
      select: {
        id: true,
        boardId: true,
        columnId: true,
        sprintId: true,
        sprintName: true,
        taskNumber: true,
        sortOrder: true,
        status: true,
        createdById: true,
        assignedToUserId: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That task is missing.");
    }

    const requestedBoardId = input.boardId ?? existing.boardId ?? undefined;
    if (requestedBoardId) {
      await this.assertBoardContributionAccess(conversationId, requestedBoardId, userId);
    } else if (
      !context.canManage &&
      existing.createdById !== userId &&
      existing.assignedToUserId !== userId
    ) {
      throw new ForbiddenException("Only the task creator, assignee, or a room lead can edit this task.");
    }

    const assignedToUserId =
      input.assignedToUserId === undefined ? undefined : this.normalizeAssignee(context.membership, input.assignedToUserId);
    const placement = await this.resolveTaskPlacement(context, {
      boardId: input.boardId ?? existing.boardId ?? undefined,
      columnId: input.columnId ?? existing.columnId ?? undefined,
      sortOrder: input.sortOrder ?? existing.sortOrder
    });
    const nextStatus = input.status ?? placement?.status ?? existing.status;

    const nextBoardId = placement?.boardId ?? input.boardId ?? existing.boardId ?? null;
    const sprint = await this.resolveTaskSprint(
      conversationId,
      nextBoardId,
      input.sprintId === undefined ? existing.sprintId : input.sprintId,
      input.sprintName === undefined ? existing.sprintName : input.sprintName
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      let identity:
        | {
            taskNumber: number;
            taskCode: string;
          }
        | null
        | undefined = undefined;

      if (nextBoardId && (existing.boardId !== nextBoardId || existing.taskNumber == null)) {
        identity = await this.allocateTaskIdentity(tx, nextBoardId);
      } else if (!nextBoardId) {
        identity = null;
      }

      await tx.conversationToolTask.update({
        where: { id: taskId },
        data: {
          title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give the task a title.") : undefined,
          details: input.details !== undefined ? this.normalizeOptionalText(input.details) : undefined,
          category: input.category !== undefined ? this.normalizeOptionalText(input.category) : undefined,
          taskType: input.taskType,
          priority: input.priority,
          storyPoints: input.storyPoints,
          score: input.score,
          sprintId: input.sprintId !== undefined || input.sprintName !== undefined ? sprint?.id ?? null : undefined,
          sprintName:
            input.sprintId !== undefined || input.sprintName !== undefined
              ? sprint?.title ?? this.normalizeOptionalText(input.sprintName)
              : undefined,
          labels: input.labels !== undefined ? this.normalizeLabels(input.labels) : undefined,
          pinned: input.pinned,
          dueAt: input.dueAt !== undefined ? (input.dueAt ? new Date(input.dueAt) : null) : undefined,
          assignedToUserId,
          boardId: nextBoardId,
          columnId: placement?.columnId ?? (nextBoardId ? existing.columnId : null),
          taskNumber: identity === undefined ? undefined : identity?.taskNumber ?? null,
          taskCode: identity === undefined ? undefined : identity?.taskCode ?? null,
          sortOrder: placement?.sortOrder ?? input.sortOrder,
          status: nextStatus,
          completedAt:
            nextStatus === undefined
              ? undefined
              : nextStatus === ConversationTaskStatus.DONE
                ? new Date()
                : null
        }
      });

      if (existing.columnId) {
        await this.resequenceColumnTasks(tx, existing.columnId);
      }
      if (placement?.columnId) {
        await this.resequenceColumnTasks(tx, placement.columnId, taskId, placement.sortOrder ?? input.sortOrder);
      }

      return tx.conversationToolTask.findUniqueOrThrow({
        where: { id: taskId },
        select: toolTaskSelect
      });
    });

    return this.toTask(updated, userId);
  }

  async getTask(conversationId: string, taskId: string, userId: string) {
    await this.getConversationContext(conversationId, userId, [
      ConversationToolPack.CORE_WORKSPACE,
      ConversationToolPack.BOARDS
    ]);

    const task = await this.prisma.conversationToolTask.findFirst({
      where: {
        id: taskId,
        conversationId
      },
      select: taskDetailSelect
    });

    if (!task) {
      throw new NotFoundException("That task is missing.");
    }

    return this.toTaskDetail(task, userId);
  }

  async toggleTaskWatch(conversationId: string, taskId: string, userId: string) {
    await this.assertTaskVisibility(conversationId, taskId, userId);
    const existing = await this.prisma.conversationToolTaskWatcher.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId
        }
      },
      select: { id: true }
    });

    if (existing) {
      await this.prisma.conversationToolTaskWatcher.delete({
        where: { id: existing.id }
      });
    } else {
      await this.prisma.conversationToolTaskWatcher.create({
        data: {
          taskId,
          userId
        }
      });
    }

    return this.getTask(conversationId, taskId, userId);
  }

  async toggleTaskLike(conversationId: string, taskId: string, userId: string) {
    await this.assertTaskVisibility(conversationId, taskId, userId);
    const existing = await this.prisma.conversationToolTaskLike.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId
        }
      },
      select: { id: true }
    });

    if (existing) {
      await this.prisma.conversationToolTaskLike.delete({
        where: { id: existing.id }
      });
    } else {
      await this.prisma.conversationToolTaskLike.create({
        data: {
          taskId,
          userId
        }
      });
    }

    return this.getTask(conversationId, taskId, userId);
  }

  async createTaskComment(
    conversationId: string,
    taskId: string,
    userId: string,
    input: CreateConversationToolTaskCommentDto
  ) {
    await this.assertTaskContribution(conversationId, taskId, userId);

    if (input.parentId) {
      const parent = await this.prisma.conversationToolTaskComment.findFirst({
        where: {
          id: input.parentId,
          taskId
        },
        select: { id: true }
      });

      if (!parent) {
        throw new NotFoundException("That reply target is missing.");
      }
    }

    await this.prisma.conversationToolTaskComment.create({
      data: {
        taskId,
        authorId: userId,
        parentId: input.parentId ?? null,
        body: this.normalizeRequiredText(input.body, "Write something before posting the comment.")
      }
    });

    return this.getTask(conversationId, taskId, userId);
  }

  async createTaskAttachment(
    conversationId: string,
    taskId: string,
    userId: string,
    input: CreateConversationToolTaskAttachmentDto
  ) {
    await this.assertTaskContribution(conversationId, taskId, userId);

    await this.prisma.conversationToolTaskAttachment.create({
      data: {
        taskId,
        uploadedById: userId,
        provider: input.provider,
        bucket: this.normalizeOptionalText(input.bucket),
        storageKey: this.normalizeRequiredText(input.storageKey, "Attachments need a storage key."),
        url: this.normalizeRequiredText(input.url, "Attachments need a source URL."),
        mimeType: this.normalizeRequiredText(input.mimeType, "Attachments need a mime type."),
        sizeBytes: input.sizeBytes,
        width: input.width ?? null,
        height: input.height ?? null,
        durationMs: input.durationMs ?? null,
        checksum: this.normalizeOptionalText(input.checksum)
      }
    });

    return this.getTask(conversationId, taskId, userId);
  }

  async deleteTask(conversationId: string, taskId: string, userId: string) {
    const context = await this.getConversationContext(conversationId, userId, [
      ConversationToolPack.CORE_WORKSPACE,
      ConversationToolPack.BOARDS
    ]);
    const existing = await this.prisma.conversationToolTask.findFirst({
      where: { id: taskId, conversationId },
      select: {
        id: true,
        boardId: true,
        columnId: true,
        createdById: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That task is missing.");
    }

    if (existing.boardId && !context.canManage && existing.createdById !== userId) {
      const access = await this.assertBoardContributionAccess(conversationId, existing.boardId, userId);
      if (!access.canManageBoard) {
        throw new ForbiddenException("Only the task creator or a board lead can remove this task.");
      }
    } else if (!context.canManage && existing.createdById !== userId) {
      throw new ForbiddenException("Only the task creator or a room lead can remove this task.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.conversationToolTask.delete({
        where: { id: taskId }
      });

      if (existing.columnId) {
        await this.resequenceColumnTasks(tx, existing.columnId);
      }
    });

    return { ok: true };
  }

  async createPoll(conversationId: string, userId: string, input: CreateConversationToolPollDto) {
    await this.getConversationContext(conversationId, userId, ConversationToolPack.CORE_WORKSPACE);
    const options = input.options
      .map((option) => option.trim())
      .filter(Boolean);

    if (options.length < 2) {
      throw new BadRequestException("Add at least two poll options.");
    }

    const created = await this.prisma.conversationToolPoll.create({
      data: {
        conversationId,
        createdById: userId,
        question: this.normalizeRequiredText(input.question, "Ask a poll question."),
        options: {
          create: options.map((label, index) => ({
            label,
            sortOrder: index
          }))
        }
      },
      select: toolPollSelect
    });

    return this.toPoll(created, userId);
  }

  async voteOnPoll(conversationId: string, pollId: string, userId: string, input: VoteConversationToolPollDto) {
    await this.getConversationContext(conversationId, userId, ConversationToolPack.CORE_WORKSPACE);

    const poll = await this.prisma.conversationToolPoll.findFirst({
      where: { id: pollId, conversationId },
      select: {
        id: true,
        closedAt: true,
        options: {
          select: {
            id: true
          }
        }
      }
    });

    if (!poll) {
      throw new NotFoundException("That poll is missing.");
    }

    if (poll.closedAt) {
      throw new BadRequestException("That poll is already closed.");
    }

    if (!poll.options.some((option) => option.id === input.optionId)) {
      throw new BadRequestException("That poll option does not belong here.");
    }

    await this.prisma.$transaction(async (tx) => {
      const existingVote = await tx.conversationToolPollVote.findUnique({
        where: {
          pollId_userId: {
            pollId,
            userId
          }
        }
      });

      if (existingVote?.optionId === input.optionId) {
        await tx.conversationToolPollVote.delete({
          where: { id: existingVote.id }
        });
        return;
      }

      if (existingVote) {
        await tx.conversationToolPollVote.update({
          where: { id: existingVote.id },
          data: {
            optionId: input.optionId
          }
        });
        return;
      }

      await tx.conversationToolPollVote.create({
        data: {
          pollId,
          optionId: input.optionId,
          userId
        }
      });
    });

    const updated = await this.prisma.conversationToolPoll.findUniqueOrThrow({
      where: { id: pollId },
      select: toolPollSelect
    });

    return this.toPoll(updated, userId);
  }

  async updatePoll(conversationId: string, pollId: string, userId: string, input: UpdateConversationToolPollDto) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.CORE_WORKSPACE);
    const existing = await this.prisma.conversationToolPoll.findFirst({
      where: { id: pollId, conversationId },
      select: {
        id: true,
        createdById: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That poll is missing.");
    }

    if (!context.canManage && existing.createdById !== userId) {
      throw new ForbiddenException("Only the poll creator or a room lead can close this poll.");
    }

    const updated = await this.prisma.conversationToolPoll.update({
      where: { id: pollId },
      data: {
        closedAt: input.closed === undefined ? undefined : input.closed ? new Date() : null
      },
      select: toolPollSelect
    });

    return this.toPoll(updated, userId);
  }

  async createPrayerRequest(conversationId: string, userId: string, input: CreateConversationPrayerRequestDto) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.COMMUNITY_CARE);

    const created = await this.prisma.conversationPrayerRequest.create({
      data: {
        conversationId,
        createdById: userId,
        assignedToUserId: this.normalizeAssignee(context.membership, input.assignedToUserId),
        requestType: input.requestType ?? CareRequestType.PRAYER,
        visibility: input.visibility ?? CareRequestVisibility.CARE_TEAM,
        priority: input.priority ?? ConversationTaskPriority.MEDIUM,
        subjectName: this.normalizeOptionalText(input.subjectName),
        subjectContact: this.normalizeOptionalText(input.subjectContact),
        title: this.normalizeRequiredText(input.title, "Give the prayer request a title."),
        body: this.normalizeRequiredText(input.body, "Write the prayer request."),
        followUpAt: this.normalizeOptionalDate(input.followUpAt),
        supports: {
          create: {
            userId
          }
        }
      },
      select: prayerRequestSelect
    });

    return this.toPrayerRequest(created, userId);
  }

  async updatePrayerRequest(
    conversationId: string,
    prayerRequestId: string,
    userId: string,
    input: UpdateConversationPrayerRequestDto
  ) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.COMMUNITY_CARE);
    const existing = await this.prisma.conversationPrayerRequest.findFirst({
      where: { id: prayerRequestId, conversationId },
      select: {
        id: true,
        createdById: true,
        assignedToUserId: true
      }
    });

    if (!existing) {
      throw new NotFoundException("That prayer request is missing.");
    }

    if (!context.canManage && existing.createdById !== userId && existing.assignedToUserId !== userId) {
      throw new ForbiddenException("Only the request creator or a room lead can change this prayer request.");
    }

    const updated = await this.prisma.conversationPrayerRequest.update({
      where: { id: prayerRequestId },
      data: {
        title: input.title !== undefined ? this.normalizeRequiredText(input.title, "Give the prayer request a title.") : undefined,
        body: input.body !== undefined ? this.normalizeRequiredText(input.body, "Write the prayer request.") : undefined,
        status: input.status,
        requestType: input.requestType,
        visibility: input.visibility,
        priority: input.priority,
        subjectName: input.subjectName !== undefined ? this.normalizeOptionalText(input.subjectName) : undefined,
        subjectContact: input.subjectContact !== undefined ? this.normalizeOptionalText(input.subjectContact) : undefined,
        assignedToUserId:
          input.assignedToUserId !== undefined
            ? this.normalizeAssignee(context.membership, input.assignedToUserId ?? undefined)
            : undefined,
        followUpAt:
          input.followUpAt !== undefined ? this.normalizeOptionalDate(input.followUpAt) : undefined,
        answeredAt:
          input.status === undefined
            ? undefined
            : input.status === PrayerRequestStatus.ANSWERED
              ? new Date()
              : null,
        resolvedAt:
          input.status === undefined
            ? undefined
            : input.status === PrayerRequestStatus.ANSWERED || input.status === PrayerRequestStatus.ARCHIVED
              ? new Date()
              : null
      },
      select: prayerRequestSelect
    });

    return this.toPrayerRequest(updated, userId);
  }

  async togglePrayerSupport(conversationId: string, prayerRequestId: string, userId: string) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.COMMUNITY_CARE);

    const prayerRequest = await this.prisma.conversationPrayerRequest.findFirst({
      where: { id: prayerRequestId, conversationId },
      select: prayerRequestSelect
    });

    if (!prayerRequest) {
      throw new NotFoundException("That prayer request is missing.");
    }

    if (!this.canViewCareRequest(prayerRequest, userId, context.membership)) {
      throw new ForbiddenException("This care request is private to its assigned care lane.");
    }

    const existing = await this.prisma.conversationPrayerSupport.findUnique({
      where: {
        prayerRequestId_userId: {
          prayerRequestId,
          userId
        }
      }
    });

    if (existing) {
      await this.prisma.conversationPrayerSupport.delete({
        where: { id: existing.id }
      });
    } else {
      await this.prisma.conversationPrayerSupport.create({
        data: {
          prayerRequestId,
          userId
        }
      });
    }

    const updated = await this.prisma.conversationPrayerRequest.findUniqueOrThrow({
      where: { id: prayerRequestId },
      select: prayerRequestSelect
    });

    return this.toPrayerRequest(updated, userId);
  }

  async createPrayerUpdate(
    conversationId: string,
    prayerRequestId: string,
    userId: string,
    input: CreateConversationPrayerUpdateDto
  ) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.COMMUNITY_CARE);
    const prayerRequest = await this.prisma.conversationPrayerRequest.findFirst({
      where: { id: prayerRequestId, conversationId },
      select: prayerRequestSelect
    });

    if (!prayerRequest) {
      throw new NotFoundException("That prayer request is missing.");
    }

    const canAccess = this.canViewCareRequest(prayerRequest, userId, context.membership);
    const canManageRequest =
      context.canManage ||
      prayerRequest.createdById === userId ||
      prayerRequest.assignedToUserId === userId;

    if (!canAccess || !canManageRequest) {
      throw new ForbiddenException("Only the care lead, request author, or room leads can log follow-up here.");
    }

    if (input.isPrivate && !canManageRequest) {
      throw new ForbiddenException("Private care notes can only be added by the active care team.");
    }

    const update = await this.prisma.conversationPrayerUpdate.create({
      data: {
        prayerRequestId,
        authorId: userId,
        body: this.normalizeRequiredText(input.body, "Add a follow-up note before saving."),
        isPrivate: Boolean(input.isPrivate)
      }
    });

    const refreshed = await this.prisma.conversationPrayerRequest.findUniqueOrThrow({
      where: { id: prayerRequestId },
      select: prayerRequestSelect
    });

    return this.toPrayerRequest(refreshed, userId);
  }

  async listAdminRequests(user: AuthenticatedUser, query: ListAdminToolRequestsQueryDto) {
    this.assertSiteAdmin(user);

    const items = await this.prisma.conversationToolRequest.findMany({
      where: query.status ? { status: query.status } : {},
      select: toolRequestSelect,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 60
    });

    return items.map((item) => this.toRequest(item));
  }

  async reviewRequest(user: AuthenticatedUser, requestId: string, input: ReviewConversationToolRequestDto) {
    this.assertSiteAdmin(user);

    if (input.status === ConversationToolRequestStatus.PENDING) {
      throw new BadRequestException("Reviews must approve or decline the request.");
    }

    const existing = await this.prisma.conversationToolRequest.findUnique({
      where: { id: requestId },
      select: toolRequestSelect
    });

    if (!existing) {
      throw new NotFoundException("That tool request is missing.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.conversationToolRequest.update({
        where: { id: requestId },
        data: {
          status: input.status,
          reviewNote: this.normalizeOptionalText(input.reviewNote),
          reviewedByUserId: user.id,
          reviewedAt: new Date()
        },
        select: toolRequestSelect
      });

      if (input.status === ConversationToolRequestStatus.APPROVED) {
        await tx.conversationToolActivation.upsert({
          where: {
            conversationId_pack: {
              conversationId: request.conversationId,
              pack: request.pack
            }
          },
          create: {
            conversationId: request.conversationId,
            pack: request.pack,
            activatedByUserId: user.id
          },
          update: {
            activatedByUserId: user.id
          }
        });

        if (request.pack === ConversationToolPack.BOARDS) {
          await this.ensureDefaultBoardForApprovedPack(tx, request.conversationId, request.requestedByUserId);
        }
      }

      await tx.notification.create({
        data: {
          userId: request.requestedByUserId,
          type: "SYSTEM",
          contextId: request.id,
          title: input.status === ConversationToolRequestStatus.APPROVED ? "Tool pack approved" : "Tool pack request declined",
          body:
            input.status === ConversationToolRequestStatus.APPROVED
              ? `${formatToolPackLabel(request.pack)} is now live for ${request.conversation.title ?? "this room"}.`
              : `${formatToolPackLabel(request.pack)} was not enabled for ${request.conversation.title ?? "this room"} yet.`
        }
      });

      return request;
    });

    return this.toRequest(updated);
  }

  private assertSiteAdmin(user: AuthenticatedUser) {
    if (!user.access.isSiteAdmin) {
      throw new ForbiddenException("Only site admins can review tool requests.");
    }
  }

  private async getConversationContext(
    conversationId: string,
    userId: string,
    requiredPacks?: ConversationToolPack | ConversationToolPack[]
  ) {
    const membership = await this.conversations.assertParticipantMembership(conversationId, userId);
    const activations = await this.prisma.conversationToolActivation.findMany({
      where: { conversationId },
      select: {
        pack: true
      }
    });
    const activePacks = new Set(activations.map((item) => item.pack));

    const requiredList = requiredPacks
      ? Array.isArray(requiredPacks)
        ? requiredPacks
        : [requiredPacks]
      : [];

    if (requiredList.length > 0 && !requiredList.some((pack) => activePacks.has(pack))) {
      const expectedPacks = requiredList.map((pack) => formatToolPackLabel(pack)).join(" or ");
      throw new ForbiddenException(`${expectedPacks} is still waiting for site admin approval in this room.`);
    }

    return {
      membership,
      activePacks,
      canManage: this.canManageConversation(membership)
    };
  }

  private canManageConversation(membership: Membership) {
    return (
      membership.conversation.type === "DIRECT" ||
      membership.role === ParticipantRole.OWNER ||
      membership.role === ParticipantRole.ADMIN
    );
  }

  private async assertPackNotActive(conversationId: string, pack: ConversationToolPack) {
    const existing = await this.prisma.conversationToolActivation.findUnique({
      where: {
        conversationId_pack: {
          conversationId,
          pack
        }
      },
      select: {
        id: true
      }
    });

    if (existing) {
      throw new BadRequestException(`${formatToolPackLabel(pack)} is already active in this room.`);
    }
  }

  private async assertBoardWriteAccess(
    conversationId: string,
    boardId: string,
    userId: string,
    managersOnly = false
  ) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.BOARDS);
    const board = await this.prisma.conversationBoard.findFirst({
      where: {
        id: boardId,
        conversationId
      },
      select: boardSelect
    });

    if (!board) {
      throw new NotFoundException("That board is missing.");
    }

    const access = this.getBoardPermissions(board, userId, context.membership);
    const allowed = managersOnly ? access.canManageMembers : access.canManageBoard;

    if (!allowed) {
      throw new ForbiddenException(
        managersOnly
          ? "Only room leads or board managers can manage board members."
          : "Only room leads, board managers, or editors can change this board."
      );
    }

    return {
      membership: context.membership,
      board,
      currentMembership: board.members.find((member) => member.userId === userId) ?? null
    };
  }

  private async assertBoardContributionAccess(conversationId: string, boardId: string, userId: string) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.BOARDS);
    const board = await this.prisma.conversationBoard.findFirst({
      where: {
        id: boardId,
        conversationId
      },
      select: boardSelect
    });

    if (!board) {
      throw new NotFoundException("That board is missing.");
    }

    const access = this.getBoardPermissions(board, userId, context.membership);
    if (!access.canContribute) {
      throw new ForbiddenException("Only room leads or board contributors can work inside this board.");
    }

    return access;
  }

  private normalizeRequiredText(value: string, message: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeOptionalDate(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized ? new Date(normalized) : null;
  }

  private normalizeStationCode(value?: string | null) {
    const normalized = value?.trim().toUpperCase();
    return normalized ? normalized : null;
  }

  private normalizeAttendanceTimezone(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : "UTC";
  }

  private assertAttendanceWindow(start: Date, end: Date, message: string) {
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end.getTime() <= start.getTime()
    ) {
      throw new BadRequestException(message);
    }
  }

  private startOfCurrentMonth() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private csvEscape(value: string) {
    const normalized = value.replace(/"/g, "\"\"");
    return `"${normalized}"`;
  }

  private applyTemplateTimeToDate(source: Date, time: string) {
    const [hourText = "0", minuteText = "0"] = time.split(":");
    const hour = Number.parseInt(hourText, 10);
    const minute = Number.parseInt(minuteText, 10);
    const resolved = new Date(source);
    resolved.setHours(Number.isNaN(hour) ? 0 : hour, Number.isNaN(minute) ? 0 : minute, 0, 0);
    return resolved;
  }

  private weekIndexWithinMonth(source: Date) {
    return Math.floor((source.getDate() - 1) / 7);
  }

  private generateAttendanceRotaDates(
    startsOn: Date,
    endsOn: Date,
    daysOfWeek: number[],
    frequency: ConversationAttendanceRotaFrequency
  ) {
    const normalizedDays = daysOfWeek.length ? this.normalizeAttendanceDays(daysOfWeek) : [startsOn.getDay()];
    const monthWeekIndex = this.weekIndexWithinMonth(startsOn);
    const dates: Date[] = [];

    for (let cursor = new Date(startsOn); cursor <= endsOn; cursor.setDate(cursor.getDate() + 1)) {
      const current = new Date(cursor);
      if (!normalizedDays.includes(current.getDay())) {
        continue;
      }

      const diffDays = Math.floor((current.getTime() - startsOn.getTime()) / (24 * 60 * 60 * 1000));
      const weekOffset = Math.floor(diffDays / 7);

      if (frequency === ConversationAttendanceRotaFrequency.BIWEEKLY && weekOffset % 2 !== 0) {
        continue;
      }

      if (
        frequency === ConversationAttendanceRotaFrequency.MONTHLY &&
        this.weekIndexWithinMonth(current) !== monthWeekIndex
      ) {
        continue;
      }

      dates.push(current);
    }

    return dates;
  }

  private normalizeLabels(value?: string[] | null) {
    const labels = (value ?? [])
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(labels));
  }

  private normalizeAssignee(membership: Membership, assignedToUserId?: string) {
    if (!assignedToUserId) {
      return null;
    }

    const exists = membership.conversation.participants.some((participant) => participant.userId === assignedToUserId);
    if (!exists) {
      throw new BadRequestException("That assignee is not active in this room.");
    }

    return assignedToUserId;
  }

  private normalizeBoardColumns(
    columns: Array<{
      title: string;
      color?: string;
      taskStatus?: ConversationTaskStatus;
      sortOrder?: number;
    }> | undefined,
    template: ConversationBoardTemplate
  ) {
    const source = columns?.length
      ? columns
      : createBoardBlueprint(template).map((column, index) => ({
          ...column,
          sortOrder: index
        }));

    return source.map((column, index) => ({
      title: this.normalizeRequiredText(column.title, "Every board column needs a title."),
      color: this.normalizeOptionalText(column.color),
      taskStatus: column.taskStatus ?? ConversationTaskStatus.TODO,
      sortOrder: column.sortOrder ?? index
    }));
  }

  private async resolveTaskSprint(
    conversationId: string,
    boardId: string | null,
    sprintId?: string | null,
    sprintName?: string | null
  ) {
    if (!boardId) {
      if (sprintId) {
        throw new BadRequestException("Choose a board before attaching this task to a sprint.");
      }
      return null;
    }

    if (sprintId) {
      const sprint = await this.prisma.conversationBoardSprint.findFirst({
        where: {
          id: sprintId,
          boardId,
          board: {
            conversationId
          }
        },
        select: boardSprintSelect
      });

      if (!sprint) {
        throw new NotFoundException("That sprint is missing from this board.");
      }

      return sprint;
    }

    const normalizedSprintName = this.normalizeOptionalText(sprintName);
    if (!normalizedSprintName) {
      return null;
    }

    return this.prisma.conversationBoardSprint.findFirst({
      where: {
        boardId,
        title: {
          equals: normalizedSprintName,
          mode: "insensitive"
        }
      },
      select: boardSprintSelect
    });
  }

  private async allocateTaskIdentity(tx: Prisma.TransactionClient, boardId: string | null) {
    if (!boardId) {
      return null;
    }

    const updatedBoard = await tx.conversationBoard.update({
      where: { id: boardId },
      data: {
        nextTaskNumber: {
          increment: 1
        }
      },
      select: {
        codePrefix: true,
        nextTaskNumber: true
      }
    });

    const taskNumber = updatedBoard.nextTaskNumber - 1;
    return {
      taskNumber,
      taskCode: `${updatedBoard.codePrefix}-${String(taskNumber).padStart(4, "0")}`
    };
  }

  private async resolveTaskPlacement(
    context: {
      membership: Membership;
      activePacks: Set<ConversationToolPack>;
    },
    input: {
      boardId?: string;
      columnId?: string;
      sortOrder?: number;
    }
  ) {
    const wantsBoardPlacement = Boolean(input.boardId || input.columnId);
    if (!wantsBoardPlacement) {
      return null;
    }

    if (!context.activePacks.has(ConversationToolPack.BOARDS)) {
      throw new ForbiddenException("Boards are not active in this room yet.");
    }

    let column:
      | {
          id: string;
          boardId: string;
          taskStatus: ConversationTaskStatus;
        }
      | null = null;

    if (input.columnId) {
      column = await this.prisma.conversationBoardColumn.findFirst({
        where: {
          id: input.columnId,
          board: {
            conversationId: context.membership.conversation.id
          }
        },
        select: {
          id: true,
          boardId: true,
          taskStatus: true
        }
      });

      if (!column) {
        throw new NotFoundException("That board lane is missing.");
      }
    }

    const boardId = input.boardId ?? column?.boardId;
    if (!boardId) {
      throw new BadRequestException("Choose a board before placing a task into a board lane.");
    }

    const board = await this.prisma.conversationBoard.findFirst({
      where: {
        id: boardId,
        conversationId: context.membership.conversation.id
      },
      select: {
        id: true,
        members: {
          select: {
            userId: true,
            role: true
          }
        }
      }
    });

    if (!board) {
      throw new NotFoundException("That board is missing.");
    }

    if (
      !this.getBoardPermissions(board, context.membership.userId, context.membership).canContribute
    ) {
      throw new ForbiddenException("Only room leads or board contributors can place tasks in this board.");
    }

    if (column && column.boardId !== boardId) {
      throw new BadRequestException("That lane belongs to a different board.");
    }

    if (!column) {
      column = await this.prisma.conversationBoardColumn.findFirst({
        where: { boardId },
        orderBy: [{ sortOrder: "asc" }],
        select: {
          id: true,
          boardId: true,
          taskStatus: true
        }
      });
    }

    if (!column) {
      throw new BadRequestException("Create at least one lane in this board before placing tasks into it.");
    }

    const sortOrder =
      input.sortOrder ??
      (await this.prisma.conversationToolTask.count({
        where: {
          boardId,
          columnId: column.id
        }
      }));

    return {
      boardId,
      columnId: column.id,
      sortOrder,
      status: column.taskStatus
    };
  }

  private async ensureDefaultBoardForApprovedPack(
    tx: Prisma.TransactionClient,
    conversationId: string,
    requestedByUserId: string
  ) {
    const boardCount = await tx.conversationBoard.count({
      where: { conversationId }
    });

    if (boardCount > 0) {
      return;
    }

    const conversation = await tx.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: {
        id: true,
        title: true,
        category: true,
        participants: {
          where: { leftAt: null },
          select: {
            userId: true,
            role: true
          }
        }
      }
    });

    const template = defaultBoardTemplateForCategory(conversation.category);
    const columns = createBoardBlueprint(template);
    const board = await tx.conversationBoard.create({
      data: {
        conversationId,
        createdById: requestedByUserId,
        title: this.defaultBoardTitle(conversation.title),
        codePrefix: this.buildBoardCodePrefix(conversation.title),
        template,
        isDefault: true,
        columns: {
          create: columns.map((column, index) => ({
            title: column.title,
            color: column.color,
            taskStatus: column.taskStatus,
            sortOrder: index
          }))
        }
      },
      select: {
        id: true
      }
    });

    const managerIds = new Set<string>([requestedByUserId]);
    for (const participant of conversation.participants) {
      if (participant.role === ParticipantRole.OWNER || participant.role === ParticipantRole.ADMIN) {
        managerIds.add(participant.userId);
      }
    }

    await tx.conversationBoardMember.createMany({
      data: Array.from(managerIds).map((memberUserId) => ({
        boardId: board.id,
        userId: memberUserId,
        addedByUserId: requestedByUserId,
        role:
          memberUserId === requestedByUserId
            ? ConversationBoardMemberRole.MANAGER
            : ConversationBoardMemberRole.EDITOR
      })),
      skipDuplicates: true
    });
  }

  private async resequenceBoardColumns(
    tx: Prisma.TransactionClient,
    boardId: string,
    movedColumnId?: string,
    desiredIndex?: number
  ) {
    const existing = await tx.conversationBoardColumn.findMany({
      where: { boardId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true }
    });

    let orderedIds = existing.map((column) => column.id);

    if (movedColumnId && desiredIndex !== undefined) {
      orderedIds = orderedIds.filter((id) => id !== movedColumnId);
      const nextIndex = Math.max(0, Math.min(desiredIndex, orderedIds.length));
      orderedIds.splice(nextIndex, 0, movedColumnId);
    }

    for (const [index, id] of orderedIds.entries()) {
      await tx.conversationBoardColumn.update({
        where: { id },
        data: { sortOrder: index }
      });
    }
  }

  private async resequenceColumnTasks(
    tx: Prisma.TransactionClient,
    columnId: string,
    movedTaskId?: string,
    desiredIndex?: number
  ) {
    const existing = await tx.conversationToolTask.findMany({
      where: { columnId },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "asc" }],
      select: { id: true }
    });

    let orderedIds = existing.map((task) => task.id);

    if (movedTaskId && desiredIndex !== undefined) {
      orderedIds = orderedIds.filter((id) => id !== movedTaskId);
      const nextIndex = Math.max(0, Math.min(desiredIndex, orderedIds.length));
      orderedIds.splice(nextIndex, 0, movedTaskId);
    }

    for (const [index, id] of orderedIds.entries()) {
      await tx.conversationToolTask.update({
        where: { id },
        data: { sortOrder: index }
      });
    }
  }

  private async assertBoardWillKeepManager(boardId: string, memberUserId: string) {
    const [targetMember, managerCount] = await Promise.all([
      this.prisma.conversationBoardMember.findUnique({
        where: {
          boardId_userId: {
            boardId,
            userId: memberUserId
          }
        },
        select: {
          role: true
        }
      }),
      this.prisma.conversationBoardMember.count({
        where: {
          boardId,
          role: ConversationBoardMemberRole.MANAGER
        }
      })
    ]);

    if (targetMember?.role === ConversationBoardMemberRole.MANAGER && managerCount <= 1) {
      throw new BadRequestException("Every board needs at least one manager.");
    }
  }

  private async assertTaskVisibility(conversationId: string, taskId: string, userId: string) {
    await this.getConversationContext(conversationId, userId, [
      ConversationToolPack.CORE_WORKSPACE,
      ConversationToolPack.BOARDS
    ]);

    const task = await this.prisma.conversationToolTask.findFirst({
      where: { id: taskId, conversationId },
      select: {
        id: true,
        boardId: true,
        createdById: true,
        assignedToUserId: true
      }
    });

    if (!task) {
      throw new NotFoundException("That task is missing.");
    }

    return task;
  }

  private async assertTaskContribution(conversationId: string, taskId: string, userId: string) {
    const context = await this.getConversationContext(conversationId, userId, [
      ConversationToolPack.CORE_WORKSPACE,
      ConversationToolPack.BOARDS
    ]);
    const task = await this.prisma.conversationToolTask.findFirst({
      where: { id: taskId, conversationId },
      select: {
        id: true,
        boardId: true,
        createdById: true,
        assignedToUserId: true
      }
    });

    if (!task) {
      throw new NotFoundException("That task is missing.");
    }

    if (task.boardId) {
      await this.assertBoardContributionAccess(conversationId, task.boardId, userId);
      return task;
    }

    if (!context.canManage && task.createdById !== userId && task.assignedToUserId !== userId) {
      throw new ForbiddenException("Only the task creator, assignee, or a room lead can work on this task.");
    }

    return task;
  }

  private getBoardPermissions(
    board: {
      members: Array<{
        userId: string;
        role: ConversationBoardMemberRole;
      }>;
    },
    viewerId: string,
    membership: Membership
  ) {
    const viewerRole = board.members.find((member) => member.userId === viewerId)?.role ?? null;
    const isRoomLead = this.canManageConversation(membership);
    const canManageBoard =
      isRoomLead ||
      viewerRole === ConversationBoardMemberRole.MANAGER ||
      viewerRole === ConversationBoardMemberRole.EDITOR;
    const canManageMembers =
      isRoomLead || viewerRole === ConversationBoardMemberRole.MANAGER;
    const canContribute =
      isRoomLead ||
      viewerRole === ConversationBoardMemberRole.MANAGER ||
      viewerRole === ConversationBoardMemberRole.EDITOR ||
      viewerRole === ConversationBoardMemberRole.CONTRIBUTOR;

    return {
      viewerRole,
      canManageBoard,
      canManageMembers,
      canContribute
    };
  }

  private defaultBoardTitle(conversationTitle?: string | null) {
    const title = conversationTitle?.trim();
    if (!title) {
      return "Room board";
    }

    return `${title} board`;
  }

  private buildBoardCodePrefix(value?: string | null) {
    const source = value?.trim();
    if (!source) {
      return "ROOM";
    }

    const words = source
      .replace(/[^a-zA-Z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    const prefix =
      words.length > 1
        ? words
            .slice(0, 3)
            .map((word) => word.charAt(0))
            .join("")
        : (words[0] ?? source).slice(0, 4);

    return prefix.toUpperCase();
  }

  private async assertAttendanceManagement(conversationId: string, userId: string) {
    const context = await this.getConversationContext(conversationId, userId, ConversationToolPack.ATTENDANCE);
    if (!context.canManage) {
      throw new ForbiddenException("Only room leads can manage time and attendance in this room.");
    }

    return context;
  }

  private async writeAttendanceAuditLog(
    tx: Prisma.TransactionClient,
    input: {
      conversationId: string;
      actorUserId?: string | null;
      action: ConversationAttendanceAuditAction;
      targetType: string;
      targetId?: string | null;
      summary: string;
      metadata?: Prisma.InputJsonValue;
    }
  ) {
    await tx.conversationAttendanceAuditLog.create({
      data: {
        conversationId: input.conversationId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        summary: input.summary,
        metadata: input.metadata
      }
    });
  }

  private normalizeAttendanceDays(value?: number[] | null) {
    const days = (value ?? [])
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      .map((day) => Number(day));

    return Array.from(new Set(days)).sort((left, right) => left - right);
  }

  private assertAttendanceEvidenceRequirements(
    shift: Prisma.ConversationAttendanceShiftGetPayload<{ select: typeof attendanceShiftSelect }>,
    input: CreateConversationAttendanceClockEventDto
  ) {
    const requiresRealtimeEvidence =
      input.eventType === ConversationAttendanceClockEventType.CLOCK_IN ||
      input.eventType === ConversationAttendanceClockEventType.CLOCK_OUT;

    if (!requiresRealtimeEvidence) {
      return;
    }

    if (shift.requiresLocation && (input.latitude === undefined || input.longitude === undefined)) {
      throw new BadRequestException("This shift requires location capture before clocking.");
    }

    if (shift.requiresPhoto && !this.normalizeOptionalText(input.proofUrl)) {
      throw new BadRequestException("This shift requires photo proof before clocking.");
    }

    if (shift.requiresQr && !this.normalizeOptionalText(input.qrValue)) {
      throw new BadRequestException("This shift requires a QR or station code before clocking.");
    }

    if (shift.stationCode) {
      const stationValue = this.normalizeStationCode(input.stationCode ?? input.qrValue);
      if (!stationValue || stationValue !== shift.stationCode) {
        throw new BadRequestException("This shift requires the correct kiosk or station code before clocking.");
      }
    }

    if (shift.requiresNfc && (input.method ?? ConversationAttendanceClockMethod.WEB) !== ConversationAttendanceClockMethod.NFC) {
      throw new BadRequestException("This shift requires an NFC clock method.");
    }
  }

  private buildAttendanceMetrics(
    shift: Prisma.ConversationAttendanceShiftGetPayload<{ select: typeof attendanceShiftSelect }>,
    clockEvents: Prisma.ConversationAttendanceClockEventGetPayload<{ select: typeof attendanceClockEventSelect }>[]
  ) {
    const events = clockEvents
      .slice()
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
    const clockIn = events.find((event) => event.eventType === ConversationAttendanceClockEventType.CLOCK_IN)?.occurredAt ?? null;
    const clockOut =
      [...events].reverse().find((event) => event.eventType === ConversationAttendanceClockEventType.CLOCK_OUT)?.occurredAt ?? null;

    let openBreakStart: Date | null = null;
    let breakMinutes = 0;
    for (const event of events) {
      if (event.eventType === ConversationAttendanceClockEventType.BREAK_START) {
        openBreakStart = event.occurredAt;
      } else if (event.eventType === ConversationAttendanceClockEventType.BREAK_END && openBreakStart) {
        breakMinutes += this.diffMinutes(openBreakStart, event.occurredAt);
        openBreakStart = null;
      }
    }

    const activeBreak = Boolean(openBreakStart && !clockOut);
    const sessionEnd = clockOut ?? (clockIn ? new Date() : null);
    const grossWorkedMinutes = clockIn && sessionEnd ? this.diffMinutes(clockIn, sessionEnd) : 0;
    const workedMinutes = Math.max(0, grossWorkedMinutes - breakMinutes);
    const lateBoundary = new Date(shift.startsAt.getTime() + shift.gracePeriodMinutes * 60_000);
    const lateMinutes = clockIn && clockIn > lateBoundary ? this.diffMinutes(lateBoundary, clockIn) : 0;
    const earlyLeaveMinutes = clockOut && clockOut < shift.endsAt ? this.diffMinutes(clockOut, shift.endsAt) : 0;
    const overtimeMinutes = clockOut && clockOut > shift.endsAt ? this.diffMinutes(shift.endsAt, clockOut) : 0;

    const flags = new Set<ConversationAttendanceExceptionFlag>();
    if (lateMinutes > 0) flags.add(ConversationAttendanceExceptionFlag.LATE);
    if (earlyLeaveMinutes > 0) flags.add(ConversationAttendanceExceptionFlag.EARLY_LEAVE);
    if (overtimeMinutes > 0) flags.add(ConversationAttendanceExceptionFlag.OVERTIME);
    if (!clockOut && shift.endsAt.getTime() < Date.now()) flags.add(ConversationAttendanceExceptionFlag.MISSED_CLOCK_OUT);

    const hasLocationGap =
      shift.requiresLocation &&
      events.some(
        (event) =>
          (event.eventType === ConversationAttendanceClockEventType.CLOCK_IN ||
            event.eventType === ConversationAttendanceClockEventType.CLOCK_OUT) &&
          (event.latitude === null || event.longitude === null)
      );
    const geofenceMiss =
      shift.requiresLocation &&
      shift.geofenceLatitude !== null &&
      shift.geofenceLongitude !== null &&
      shift.geofenceRadiusM !== null &&
      events.some((event) =>
        event.latitude !== null &&
        event.longitude !== null &&
        this.distanceMeters(event.latitude, event.longitude, shift.geofenceLatitude!, shift.geofenceLongitude!) >
          shift.geofenceRadiusM!
      );
    if (hasLocationGap || geofenceMiss) {
      flags.add(ConversationAttendanceExceptionFlag.LOCATION_EXCEPTION);
    }

    if (
      events.some(
        (event) =>
          event.method === ConversationAttendanceClockMethod.MANUAL ||
          event.method === ConversationAttendanceClockMethod.KIOSK
      ) ||
      events.some((event) => event.eventType === ConversationAttendanceClockEventType.ADJUSTMENT)
    ) {
      flags.add(ConversationAttendanceExceptionFlag.MANUAL_REVIEW);
    }

    const status = clockOut
      ? shift.approvalRequired
        ? ConversationAttendanceRecordStatus.PENDING_APPROVAL
        : ConversationAttendanceRecordStatus.APPROVED
      : activeBreak
        ? ConversationAttendanceRecordStatus.ON_BREAK
        : ConversationAttendanceRecordStatus.ON_CLOCK;

    return {
      status,
      flags: Array.from(flags),
      clockInAt: clockIn,
      clockOutAt: clockOut,
      breakMinutes,
      workedMinutes,
      overtimeMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      reviewNote: flags.has(ConversationAttendanceExceptionFlag.MANUAL_REVIEW)
        ? "Flagged for manual attendance review."
        : null
    };
  }

  private diffMinutes(start: Date, end: Date) {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  }

  private distanceMeters(startLat: number, startLng: number, endLat: number, endLng: number) {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusM = 6_371_000;
    const dLat = toRadians(endLat - startLat);
    const dLng = toRadians(endLng - startLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(startLat)) *
        Math.cos(toRadians(endLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusM * c;
  }

  private toActivation(activation: Prisma.ConversationToolActivationGetPayload<{ select: typeof toolActivationSelect }>) {
    return {
      id: activation.id,
      pack: activation.pack,
      activatedAt: activation.activatedAt,
      activatedBy: activation.activatedBy
    };
  }

  private toRequest(request: Prisma.ConversationToolRequestGetPayload<{ select: typeof toolRequestSelect }>) {
    return {
      id: request.id,
      pack: request.pack,
      status: request.status,
      note: request.note,
      reviewNote: request.reviewNote,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      reviewedAt: request.reviewedAt,
      conversation: request.conversation,
      requestedBy: request.requestedBy,
      reviewedBy: request.reviewedBy
    };
  }

  private toNote(note: Prisma.ConversationToolNoteGetPayload<{ select: typeof toolNoteSelect }>) {
    return {
      id: note.id,
      kind: note.kind,
      audience: note.audience,
      title: note.title,
      body: note.body,
      pinnedAt: note.pinnedAt,
      expiresAt: note.expiresAt,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      createdBy: note.createdBy,
      updatedBy: note.updatedBy
    };
  }

  private toTask(task: Prisma.ConversationToolTaskGetPayload<{ select: typeof toolTaskSelect }>, viewerId?: string) {
    return {
      id: task.id,
      boardId: task.boardId,
      columnId: task.columnId,
      sprintId: task.sprintId,
      taskNumber: task.taskNumber,
      taskCode: task.taskCode,
      title: task.title,
      details: task.details,
      category: task.category,
      taskType: task.taskType,
      priority: task.priority,
      storyPoints: task.storyPoints,
      score: task.score,
      sprintName: task.sprintName,
      labels: task.labels,
      pinned: task.pinned,
      status: task.status,
      sortOrder: task.sortOrder,
      dueAt: task.dueAt,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      board: task.board,
      column: task.column,
      sprint: task.sprint,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo,
      sourceMessage: task.sourceMessage,
      counts: {
        attachments: task._count.attachments,
        comments: task._count.comments,
        likes: task._count.likes,
        watchers: task._count.watchers
      },
      viewerHasLiked: viewerId ? task.likes.some((like) => like.userId === viewerId) : false,
      viewerIsWatching: viewerId ? task.watchers.some((watcher) => watcher.userId === viewerId) : false
    };
  }

  private toTaskDetail(task: Prisma.ConversationToolTaskGetPayload<{ select: typeof taskDetailSelect }>, viewerId: string) {
    return {
      ...this.toTask(task, viewerId),
      attachments: task.attachments.map((attachment) => ({
        id: attachment.id,
        provider: attachment.provider,
        bucket: attachment.bucket,
        storageKey: attachment.storageKey,
        url: attachment.url,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        width: attachment.width,
        height: attachment.height,
        durationMs: attachment.durationMs,
        checksum: attachment.checksum,
        createdAt: attachment.createdAt,
        uploadedBy: attachment.uploadedBy
      })),
      comments: task.comments.map((comment) => ({
        id: comment.id,
        taskId: comment.taskId,
        parentId: comment.parentId,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        deletedAt: comment.deletedAt,
        author: comment.author
      }))
    };
  }

  private toBoardSummary(board: Prisma.ConversationBoardGetPayload<{ select: typeof boardSelect }>) {
    return {
      id: board.id,
      title: board.title,
      codePrefix: board.codePrefix,
      template: board.template,
      isDefault: board.isDefault,
      memberCount: board.members.length,
      taskCount: board.columns.reduce((sum, column) => sum + column.tasks.length, 0)
    };
  }

  private toBoard(
    board: Prisma.ConversationBoardGetPayload<{ select: typeof boardSelect }>,
    viewerId: string,
    membership: Membership
  ) {
    const access = this.getBoardPermissions(board, viewerId, membership);

    return {
      id: board.id,
      title: board.title,
      description: board.description,
      codePrefix: board.codePrefix,
      template: board.template,
      isDefault: board.isDefault,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      createdBy: board.createdBy,
      viewerRole: access.viewerRole,
      canManage: access.canManageBoard,
      canManageMembers: access.canManageMembers,
      canContribute: access.canContribute,
      memberCount: board.members.length,
      taskCount: board.columns.reduce((sum, column) => sum + column.tasks.length, 0),
      sprints: board.sprints.map((sprint) => ({
        id: sprint.id,
        boardId: sprint.boardId,
        title: sprint.title,
        goal: sprint.goal,
        status: sprint.status,
        startsAt: sprint.startsAt,
        endsAt: sprint.endsAt,
        sortOrder: sprint.sortOrder,
        createdAt: sprint.createdAt,
        updatedAt: sprint.updatedAt,
        createdBy: sprint.createdBy
      })),
      members: board.members.map((member) => ({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        user: member.user,
        addedBy: member.addedBy
      })),
      columns: board.columns.map((column) => ({
        id: column.id,
        title: column.title,
        color: column.color,
        sortOrder: column.sortOrder,
        taskStatus: column.taskStatus,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt,
        tasks: column.tasks.map((task) => this.toTask(task, viewerId))
      }))
    };
  }

  private toPoll(poll: Prisma.ConversationToolPollGetPayload<{ select: typeof toolPollSelect }>, viewerId: string) {
    const viewerVote = poll.options.find((option) => option.votes.some((vote) => vote.userId === viewerId));
    return {
      id: poll.id,
      question: poll.question,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      closedAt: poll.closedAt,
      createdBy: poll.createdBy,
      totalVotes: poll.options.reduce((sum, option) => sum + option.votes.length, 0),
      viewerVoteOptionId: viewerVote?.id ?? null,
      options: poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        sortOrder: option.sortOrder,
        voteCount: option.votes.length
      }))
    };
  }

  private toPrayerRequest(
    prayerRequest: Prisma.ConversationPrayerRequestGetPayload<{ select: typeof prayerRequestSelect }>,
    viewerId: string
  ) {
    return {
      id: prayerRequest.id,
      requestType: prayerRequest.requestType,
      visibility: prayerRequest.visibility,
      priority: prayerRequest.priority,
      subjectName: prayerRequest.subjectName,
      subjectContact: prayerRequest.subjectContact,
      title: prayerRequest.title,
      body: prayerRequest.body,
      status: prayerRequest.status,
      followUpAt: prayerRequest.followUpAt,
      createdAt: prayerRequest.createdAt,
      updatedAt: prayerRequest.updatedAt,
      answeredAt: prayerRequest.answeredAt,
      resolvedAt: prayerRequest.resolvedAt,
      createdBy: prayerRequest.createdBy,
      assignedTo: prayerRequest.assignedTo,
      supportCount: prayerRequest.supports.length,
      viewerSupported: prayerRequest.supports.some((support) => support.userId === viewerId),
      updates: prayerRequest.updates
        .slice()
        .reverse()
        .map((update) => ({
          id: update.id,
          body: update.body,
          isPrivate: update.isPrivate,
          createdAt: update.createdAt,
          updatedAt: update.updatedAt,
          author: update.author
        }))
    };
  }

  private toAttendanceTemplate(
    template: Prisma.ConversationAttendanceShiftTemplateGetPayload<{ select: typeof attendanceTemplateSelect }>
  ) {
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      locationName: template.locationName,
      locationAddress: template.locationAddress,
      startsAtTime: template.startsAtTime,
      endsAtTime: template.endsAtTime,
      breakMinutes: template.breakMinutes,
      gracePeriodMinutes: template.gracePeriodMinutes,
      daysOfWeek: template.daysOfWeek,
      requiresLocation: template.requiresLocation,
      requiresPhoto: template.requiresPhoto,
      requiresQr: template.requiresQr,
      requiresNfc: template.requiresNfc,
      geofenceLatitude: template.geofenceLatitude,
      geofenceLongitude: template.geofenceLongitude,
      geofenceRadiusM: template.geofenceRadiusM,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: template.createdBy
    };
  }

  private toAttendanceShiftSummary(
    shift: Prisma.ConversationAttendanceShiftGetPayload<{ select: typeof attendanceShiftSelect }>
  ) {
    return {
      id: shift.id,
      title: shift.title,
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      status: shift.status,
      assignmentCount: shift.assignments.length,
      recordCount: shift.records.length
    };
  }

  private toAttendanceRecord(
    record: Prisma.ConversationAttendanceRecordGetPayload<{ select: typeof attendanceRecordSelect }>
  ) {
    return {
      id: record.id,
      shiftId: record.shiftId,
      assignmentId: record.assignmentId,
      userId: record.userId,
      status: record.status,
      flags: record.flags,
      clockInAt: record.clockInAt,
      clockOutAt: record.clockOutAt,
      breakMinutes: record.breakMinutes,
      workedMinutes: record.workedMinutes,
      overtimeMinutes: record.overtimeMinutes,
      lateMinutes: record.lateMinutes,
      earlyLeaveMinutes: record.earlyLeaveMinutes,
      reviewNote: record.reviewNote,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      approvedAt: record.approvedAt,
      user: record.user,
      reviewedBy: record.reviewedBy,
      clockEvents: record.clockEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        method: event.method,
        occurredAt: event.occurredAt,
        latitude: event.latitude,
        longitude: event.longitude,
      accuracyMeters: event.accuracyMeters,
      proofUrl: event.proofUrl,
      proofProvider: event.proofProvider,
      qrValue: event.qrValue,
      stationCode: event.stationCode,
      deviceLabel: event.deviceLabel,
      note: event.note,
      createdAt: event.createdAt,
      actor: event.actor
      }))
    };
  }

  private toAttendanceShift(
    shift: Prisma.ConversationAttendanceShiftGetPayload<{ select: typeof attendanceShiftSelect }>
  ) {
    return {
      id: shift.id,
      templateId: shift.templateId,
      title: shift.title,
      notes: shift.notes,
      locationName: shift.locationName,
      locationAddress: shift.locationAddress,
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      breakMinutes: shift.breakMinutes,
      gracePeriodMinutes: shift.gracePeriodMinutes,
      approvalRequired: shift.approvalRequired,
      status: shift.status,
      requiresLocation: shift.requiresLocation,
      requiresPhoto: shift.requiresPhoto,
      requiresQr: shift.requiresQr,
      requiresNfc: shift.requiresNfc,
      stationCode: shift.stationCode,
      geofenceLatitude: shift.geofenceLatitude,
      geofenceLongitude: shift.geofenceLongitude,
      geofenceRadiusM: shift.geofenceRadiusM,
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
      template: shift.template,
      createdBy: shift.createdBy,
      assignmentCount: shift.assignments.length,
      recordCount: shift.records.length,
      assignments: shift.assignments.map((assignment) => ({
        id: assignment.id,
        userId: assignment.userId,
        status: assignment.status,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        user: assignment.user,
        assignedBy: assignment.assignedBy,
        record: assignment.record ? this.toAttendanceRecord(assignment.record) : null
      })),
      records: shift.records.map((record) => this.toAttendanceRecord(record))
    };
  }

  private toAttendancePolicy(
    policy: Prisma.ConversationAttendancePolicyGetPayload<{ select: typeof attendancePolicySelect }>
  ) {
    return {
      id: policy.id,
      timezone: policy.timezone,
      standardHoursPerDay: policy.standardHoursPerDay,
      standardHoursPerWeek: policy.standardHoursPerWeek,
      overtimeAfterMinutes: policy.overtimeAfterMinutes,
      doubleTimeAfterMinutes: policy.doubleTimeAfterMinutes,
      lateGraceMinutes: policy.lateGraceMinutes,
      breakRequiredAfterMinutes: policy.breakRequiredAfterMinutes,
      breakDurationMinutes: policy.breakDurationMinutes,
      allowSelfClock: policy.allowSelfClock,
      allowManualAdjustments: policy.allowManualAdjustments,
      requireSupervisorApproval: policy.requireSupervisorApproval,
      requireLocation: policy.requireLocation,
      requirePhoto: policy.requirePhoto,
      requireQr: policy.requireQr,
      requireNfc: policy.requireNfc,
      stationLabel: policy.stationLabel,
      stationCode: policy.stationCode,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      createdBy: policy.createdBy,
      updatedBy: policy.updatedBy
    };
  }

  private toAttendanceLeavePolicy(leavePolicy: AttendanceLeavePolicyRow) {
    return {
      id: leavePolicy.id,
      conversationId: leavePolicy.conversationId,
      attendancePolicyId: leavePolicy.attendancePolicyId,
      title: leavePolicy.title,
      leaveType: leavePolicy.leaveType,
      annualAllowanceMinutes: leavePolicy.annualAllowanceMinutes,
      carryOverMinutes: leavePolicy.carryOverMinutes,
      accrualCadence: leavePolicy.accrualCadence,
      accrualAmountMinutes: leavePolicy.accrualAmountMinutes,
      allowNegativeBalance: leavePolicy.allowNegativeBalance,
      requiresApproval: leavePolicy.requiresApproval,
      isDefault: leavePolicy.isDefault,
      isActive: leavePolicy.isActive,
      createdAt: leavePolicy.createdAt,
      updatedAt: leavePolicy.updatedAt,
      createdBy: leavePolicy.createdBy,
      updatedBy: leavePolicy.updatedBy
    };
  }

  private toAttendanceLeaveBalance(balance: AttendanceLeaveBalanceRow) {
    return {
      id: balance.id,
      conversationId: balance.conversationId,
      leavePolicyId: balance.leavePolicyId,
      userId: balance.userId,
      availableMinutes: balance.availableMinutes,
      usedMinutes: balance.usedMinutes,
      pendingMinutes: balance.pendingMinutes,
      accruedMinutes: balance.accruedMinutes,
      createdAt: balance.createdAt,
      updatedAt: balance.updatedAt,
      user: balance.user,
      leavePolicy: this.toAttendanceLeavePolicy(balance.leavePolicy),
      entries: balance.entries.map((entry) => ({
        id: entry.id,
        leaveBalanceId: entry.leaveBalanceId,
        leavePolicyId: entry.leavePolicyId,
        userId: entry.userId,
        actorUserId: entry.actorUserId,
        leaveRequestId: entry.leaveRequestId,
        entryType: entry.entryType,
        minutesDelta: entry.minutesDelta,
        balanceAfterMinutes: entry.balanceAfterMinutes,
        note: entry.note,
        effectiveAt: entry.effectiveAt,
        createdAt: entry.createdAt,
        actor: entry.actor
      }))
    };
  }

  private toAttendanceRotaRun(rotaRun: AttendanceRotaRunRow) {
    return {
      id: rotaRun.id,
      conversationId: rotaRun.conversationId,
      templateId: rotaRun.templateId,
      title: rotaRun.title,
      frequency: rotaRun.frequency,
      startsOn: rotaRun.startsOn,
      endsOn: rotaRun.endsOn,
      participantUserIds: rotaRun.participantUserIds,
      generatedShiftCount: rotaRun.generatedShiftCount,
      isActive: rotaRun.isActive,
      lastGeneratedAt: rotaRun.lastGeneratedAt,
      createdAt: rotaRun.createdAt,
      updatedAt: rotaRun.updatedAt,
      template: rotaRun.template,
      createdBy: rotaRun.createdBy
    };
  }

  private toAttendanceHoliday(
    holiday: Prisma.ConversationAttendanceHolidayGetPayload<{ select: typeof attendanceHolidaySelect }>
  ) {
    return {
      id: holiday.id,
      policyId: holiday.policyId,
      title: holiday.title,
      description: holiday.description,
      scope: holiday.scope,
      category: holiday.category,
      startsOn: holiday.startsOn,
      endsOn: holiday.endsOn,
      isPaid: holiday.isPaid,
      createdAt: holiday.createdAt,
      updatedAt: holiday.updatedAt,
      createdBy: holiday.createdBy
    };
  }

  private toAttendanceLeaveRequest(
    leaveRequest: Prisma.ConversationAttendanceLeaveRequestGetPayload<{ select: typeof attendanceLeaveRequestSelect }>
  ) {
    return {
      id: leaveRequest.id,
      policyId: leaveRequest.policyId,
      leavePolicyId: leaveRequest.leavePolicyId,
      userId: leaveRequest.userId,
      leaveType: leaveRequest.leaveType,
      status: leaveRequest.status,
      title: leaveRequest.title,
      reason: leaveRequest.reason,
      startsAt: leaveRequest.startsAt,
      endsAt: leaveRequest.endsAt,
      minutesRequested: leaveRequest.minutesRequested,
      isPartialDay: leaveRequest.isPartialDay,
      deductFromBalance: leaveRequest.deductFromBalance,
      reviewNote: leaveRequest.reviewNote,
      decidedAt: leaveRequest.decidedAt,
      createdAt: leaveRequest.createdAt,
      updatedAt: leaveRequest.updatedAt,
      user: leaveRequest.user,
      reviewedBy: leaveRequest.reviewedBy,
      leavePolicy: leaveRequest.leavePolicy
    };
  }

  private toAttendanceAuditLog(log: AttendanceAuditLogRow) {
    return {
      id: log.id,
      conversationId: log.conversationId,
      actorUserId: log.actorUserId,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      summary: log.summary,
      metadata: log.metadata,
      createdAt: log.createdAt,
      actor: log.actor
    };
  }

  private canViewCareRequest(
    prayerRequest: Pick<
      Prisma.ConversationPrayerRequestGetPayload<{ select: typeof prayerRequestSelect }>,
      "visibility" | "createdById" | "assignedToUserId"
    >,
    viewerId: string,
    membership: Membership
  ) {
    if (this.canManageConversation(membership)) {
      return true;
    }

    if (prayerRequest.visibility === CareRequestVisibility.ROOM) {
      return true;
    }

    return prayerRequest.createdById === viewerId || prayerRequest.assignedToUserId === viewerId;
  }
}
