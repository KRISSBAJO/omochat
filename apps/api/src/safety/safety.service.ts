import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserReportStatus, UserStatus } from "@omochat/db";
import { resolveUserAccess } from "../access/access.utils";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { ListAdminReportsQueryDto } from "./dto/list-admin-reports-query.dto";
import { ReportUserDto } from "./dto/report-user.dto";
import { ReviewReportDto } from "./dto/review-report.dto";

const blockedUserSelect = {
  id: true,
  username: true,
  userCode: true,
  displayName: true,
  avatarUrl: true,
  lastSeenAt: true,
  dmPolicy: true
} as const;

const moderatorUserSelect = {
  id: true,
  username: true,
  userCode: true,
  displayName: true,
  avatarUrl: true,
  email: true,
  platformRoles: {
    select: {
      role: true
    }
  }
} as const;

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  assertModerator(user: AuthenticatedUser) {
    if (resolveUserAccess(user).isModerator) {
      return;
    }

    throw new ForbiddenException("You do not have moderation access.");
  }

  async listBlockedUsers(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        blockerUserId: userId
      },
      include: {
        blocked: {
          select: blockedUserSelect
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });

    return blocks.map((block) => ({
      id: block.id,
      createdAt: block.createdAt,
      user: block.blocked
    }));
  }

  async listModerators(user: AuthenticatedUser) {
    this.assertModerator(user);

    const moderators = await this.resolveModerators();
    return moderators.map((moderator) => ({
      id: moderator.id,
      username: moderator.username,
      userCode: moderator.userCode,
      displayName: moderator.displayName,
      avatarUrl: moderator.avatarUrl,
      email: moderator.email
    }));
  }

  async blockUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException("You cannot block yourself.");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        status: true,
        displayName: true
      }
    });

    if (!target || target.status !== UserStatus.ACTIVE) {
      throw new NotFoundException("User not found.");
    }

    const now = new Date();
    const block = await this.prisma.userBlock.upsert({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId: userId,
          blockedUserId: targetUserId
        }
      },
      create: {
        blockerUserId: userId,
        blockedUserId: targetUserId
      },
      update: {},
      include: {
        blocked: {
          select: blockedUserSelect
        }
      }
    });

    await this.prisma.directMessageRequest.updateMany({
      where: {
        status: "PENDING",
        OR: [
          {
            requesterUserId: userId,
            recipientUserId: targetUserId
          },
          {
            requesterUserId: targetUserId,
            recipientUserId: userId
          }
        ]
      },
      data: {
        status: "CANCELLED",
        respondedAt: now
      }
    });

    await this.prisma.notification.create({
      data: {
        userId,
        type: "USER_BLOCKED",
        contextId: targetUserId,
        title: "Chat blocked",
        body: `${target.displayName} was moved out of your reach lanes.`
      }
    });

    return {
      id: block.id,
      createdAt: block.createdAt,
      user: block.blocked
    };
  }

  async unblockUser(userId: string, targetUserId: string) {
    const existing = await this.prisma.userBlock.findUnique({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId: userId,
          blockedUserId: targetUserId
        }
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      throw new NotFoundException("Blocked user not found.");
    }

    await this.prisma.userBlock.delete({
      where: { id: existing.id }
    });

    return { ok: true, targetUserId };
  }

  async reportUser(userId: string, input: ReportUserDto) {
    if (userId === input.targetUserId) {
      throw new BadRequestException("You cannot report yourself.");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: {
        id: true,
        status: true,
        displayName: true
      }
    });

    if (!target || target.status !== UserStatus.ACTIVE) {
      throw new NotFoundException("User not found.");
    }

    if (input.conversationId) {
      const participant = await this.prisma.conversationParticipant.findFirst({
        where: {
          conversationId: input.conversationId,
          userId,
          leftAt: null
        },
        select: { id: true }
      });

      if (!participant) {
        throw new ForbiddenException("You can only report from a conversation you belong to.");
      }
    }

    if (input.messageId) {
      const message = await this.prisma.message.findUnique({
        where: { id: input.messageId },
        select: {
          id: true,
          conversationId: true
        }
      });

      if (!message) {
        throw new NotFoundException("Message not found.");
      }

      if (input.conversationId && message.conversationId !== input.conversationId) {
        throw new BadRequestException("That message does not belong to the provided conversation.");
      }
    }

    const report = await this.prisma.userReport.create({
      data: {
        reporterUserId: userId,
        targetUserId: input.targetUserId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        reason: input.reason.trim(),
        details: input.details?.trim()
      }
    });

    await this.prisma.notification.create({
      data: {
        userId,
        type: "USER_REPORTED",
        contextId: report.id,
        title: "Report received",
        body: `We saved your report about ${target.displayName} for follow-up.`
      }
    });

    return report;
  }

  async listReportsForModeration(user: AuthenticatedUser, query: ListAdminReportsQueryDto = {}) {
    this.assertModerator(user);

    return this.prisma.userReport.findMany({
      where: {
        ...(query.status ? { status: query.status } : {})
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            userCode: true,
            displayName: true,
            avatarUrl: true
          }
        },
        target: {
          select: {
            id: true,
            username: true,
            userCode: true,
            displayName: true,
            avatarUrl: true
          }
        },
        assignedModerator: {
          select: moderatorUserSelect
        },
        reviewedBy: {
          select: moderatorUserSelect
        },
        conversation: {
          select: {
            id: true,
            type: true,
            title: true
          }
        },
        message: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            deletedAt: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: query.limit ?? 40
    });
  }

  async reviewReport(user: AuthenticatedUser, reportId: string, input: ReviewReportDto) {
    this.assertModerator(user);

    if (
      input.status === undefined &&
      input.assignedModeratorUserId === undefined &&
      input.moderatorNote === undefined &&
      input.resolutionNote === undefined
    ) {
      throw new BadRequestException("Add a status, assignee, or note before updating a report.");
    }

    const report = await this.prisma.userReport.findUnique({
      where: { id: reportId },
      include: {
        target: {
          select: {
            displayName: true
          }
        }
      }
    });

    if (!report) {
      throw new NotFoundException("Report not found.");
    }

    let assignedModeratorUserId = report.assignedModeratorUserId;
    if (input.assignedModeratorUserId !== undefined) {
      assignedModeratorUserId = await this.assertModeratorCandidate(input.assignedModeratorUserId);
    }

    const updated = await this.prisma.userReport.update({
      where: { id: reportId },
      data: {
        ...(input.status !== undefined
          ? {
              status: input.status,
              reviewedByUserId:
                input.status === UserReportStatus.REVIEWED || input.status === UserReportStatus.DISMISSED
                  ? user.id
                  : report.reviewedByUserId,
              reviewedAt:
                input.status === UserReportStatus.REVIEWED || input.status === UserReportStatus.DISMISSED
                  ? new Date()
                  : report.reviewedAt
            }
          : {}),
        ...(input.assignedModeratorUserId !== undefined
          ? {
              assignedModeratorUserId,
              assignedAt: new Date()
            }
          : {}),
        ...(input.moderatorNote !== undefined ? { moderatorNote: input.moderatorNote.trim() || null } : {}),
        ...(input.resolutionNote !== undefined ? { resolutionNote: input.resolutionNote.trim() || null } : {})
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            userCode: true,
            displayName: true,
            avatarUrl: true
          }
        },
        target: {
          select: {
            id: true,
            username: true,
            userCode: true,
            displayName: true,
            avatarUrl: true
          }
        },
        assignedModerator: {
          select: moderatorUserSelect
        },
        reviewedBy: {
          select: moderatorUserSelect
        },
        conversation: {
          select: {
            id: true,
            type: true,
            title: true
          }
        },
        message: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            deletedAt: true
          }
        }
      }
    });

    if (input.status === UserReportStatus.REVIEWED || input.status === UserReportStatus.DISMISSED) {
      const resolutionLabel = input.status === UserReportStatus.REVIEWED ? "reviewed" : "closed";
      await this.prisma.notification.create({
        data: {
          userId: report.reporterUserId,
          type: "REPORT_UPDATED",
          contextId: report.id,
          title: input.status === UserReportStatus.REVIEWED ? "Report reviewed" : "Report closed",
          body:
            input.resolutionNote?.trim() ||
            `Your report about ${report.target.displayName} has been ${resolutionLabel}.`,
          status: "SENT",
          sentAt: new Date()
        }
      });
    }

    return updated;
  }

  async assertUsersCanConnect(userId: string, targetUserId: string) {
    const relationship = await this.getRelationship(userId, targetUserId);
    if (relationship.blockedByMe) {
      throw new ForbiddenException("You blocked this user. Unblock them before starting a conversation.");
    }

    if (relationship.blockedMe) {
      throw new ForbiddenException("This user is not available for direct chat.");
    }
  }

  async assertConversationMessagingAllowed(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        type: true,
        participants: {
          where: {
            leftAt: null
          },
          select: {
            userId: true
          }
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    if (conversation.type !== "DIRECT") {
      return;
    }

    const otherUserId = conversation.participants.find((participant) => participant.userId !== userId)?.userId;
    if (!otherUserId) {
      return;
    }

    await this.assertUsersCanConnect(userId, otherUserId);
  }

  async buildRelationshipMap(userId: string, targetUserIds: string[]) {
    const uniqueTargetIds = [...new Set(targetUserIds.filter(Boolean))];
    if (uniqueTargetIds.length === 0) {
      return new Map<string, { blockedByMe: boolean; blockedMe: boolean }>();
    }

    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          {
            blockerUserId: userId,
            blockedUserId: {
              in: uniqueTargetIds
            }
          },
          {
            blockerUserId: {
              in: uniqueTargetIds
            },
            blockedUserId: userId
          }
        ]
      },
      select: {
        blockerUserId: true,
        blockedUserId: true
      }
    });

    const relationshipMap = new Map<string, { blockedByMe: boolean; blockedMe: boolean }>();

    for (const targetUserId of uniqueTargetIds) {
      relationshipMap.set(targetUserId, {
        blockedByMe: false,
        blockedMe: false
      });
    }

    for (const row of rows) {
      if (row.blockerUserId === userId) {
        const existing = relationshipMap.get(row.blockedUserId);
        if (existing) {
          existing.blockedByMe = true;
        }
      }

      if (row.blockedUserId === userId) {
        const existing = relationshipMap.get(row.blockerUserId);
        if (existing) {
          existing.blockedMe = true;
        }
      }
    }

    return relationshipMap;
  }

  private async getRelationship(userId: string, targetUserId: string) {
    const map = await this.buildRelationshipMap(userId, [targetUserId]);
    return map.get(targetUserId) ?? { blockedByMe: false, blockedMe: false };
  }

  private async resolveModerators() {
    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE
      },
      select: moderatorUserSelect,
      orderBy: [{ displayName: "asc" }],
      take: 50
    });

    return users.filter((user) => resolveUserAccess(user).isModerator);
  }

  private async assertModeratorCandidate(userId: string) {
    const moderators = await this.resolveModerators();
    const match = moderators.find((moderator) => moderator.id === userId);
    if (!match) {
      throw new BadRequestException("That moderator could not be assigned.");
    }

    return match.id;
  }
}
