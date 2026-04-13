import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConversationType, ParticipantRole, Prisma } from "@omochat/db";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { AddConversationMembersDto } from "./dto/add-conversation-members.dto";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ListConversationsQueryDto } from "./dto/list-conversations-query.dto";
import { ReportConversationDto } from "./dto/report-conversation.dto";
import { UpdateConversationStateDto } from "./dto/update-conversation-state.dto";
import { UpdateConversationMemberRoleDto } from "./dto/update-conversation-member-role.dto";

const participantUserSelect = {
  id: true,
  username: true,
  userCode: true,
  displayName: true,
  avatarUrl: true,
  lastSeenAt: true
} as const;

const conversationInclude = {
  participants: {
    where: { leftAt: null },
    orderBy: { joinedAt: "asc" as const },
    include: {
      user: {
        select: participantUserSelect
      }
    }
  },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1
  }
} satisfies Prisma.ConversationInclude;

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService
  ) {}

  async listForUser(userId: string, query: ListConversationsQueryDto = {}) {
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: {
        userId,
        leftAt: null,
        ...(query.includeArchived ? {} : { archivedAt: null }),
        ...(query.includeLocked ? {} : { lockedAt: null })
      },
      include: {
        conversation: {
          include: conversationInclude
        }
      },
      orderBy: [
        { pinnedAt: "desc" },
        { conversation: { lastMessageAt: "desc" } },
        { conversation: { updatedAt: "desc" } }
      ],
      take: query.limit ?? 50
    });

    const unreadCounts = await Promise.all(
      memberships.map((membership) =>
        this.prisma.message.count({
          where: {
            conversationId: membership.conversationId,
            deletedAt: null,
            senderId: { not: userId },
            createdAt: {
              gt: membership.lastReadAt ?? membership.joinedAt
            }
          }
        })
      )
    );

    const directPartnerIds = memberships
      .filter((membership) => membership.conversation.type === ConversationType.DIRECT)
      .map((membership) => membership.conversation.participants.find((participant) => participant.userId !== userId)?.userId)
      .filter((value): value is string => Boolean(value));
    const relationshipMap = await this.safety.buildRelationshipMap(userId, directPartnerIds);

    return memberships.map((membership, index) =>
      this.toConversationListItem(
        membership.conversation,
        membership,
        unreadCounts[index],
        membership.conversation.type === ConversationType.DIRECT
          ? relationshipMap.get(
              membership.conversation.participants.find((participant) => participant.userId !== userId)?.userId ?? ""
            )
          : undefined
      )
    );
  }

  async create(input: CreateConversationDto, createdById: string) {
    const participantIds = Array.from(new Set([createdById, ...input.participantIds].filter(Boolean))) as string[];

    if (input.type === ConversationType.DIRECT && participantIds.length === 2) {
      const otherUserId = participantIds.find((participantId) => participantId !== createdById);
      if (otherUserId) {
        await this.safety.assertUsersCanConnect(createdById, otherUserId);
      }
    }

    if (input.type === ConversationType.DIRECT && participantIds.length === 2) {
      const existing = await this.findDirectConversationForUsers(participantIds);
      if (existing) {
        await this.prisma.conversationParticipant.updateMany({
          where: {
            conversationId: existing.id,
            userId: { in: participantIds }
          },
          data: {
            leftAt: null,
            archivedAt: null,
            lockedAt: null
          }
        });

        const refreshed = await this.getMembershipOrThrow(existing.id, createdById);
        const unreadCount = await this.countUnreadMessages(existing.id, createdById, refreshed);
        return this.toConversationListItem(refreshed.conversation, refreshed, unreadCount);
      }
    }

    const now = new Date();
    const conversation = await this.prisma.conversation.create({
      data: {
        type: input.type,
        title: input.type === ConversationType.DIRECT ? null : input.title?.trim() || null,
        createdById,
        participants: {
          create: participantIds.map((userId) => ({
            userId,
            role: userId === createdById ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
            lastReadAt: now
          }))
        }
      },
      include: conversationInclude
    });

    const membership = await this.getMembershipOrThrow(conversation.id, createdById);
    return this.toConversationListItem(conversation, membership, 0);
  }

  async updateState(conversationId: string, userId: string, input: UpdateConversationStateDto) {
    const membership = await this.assertParticipantMembership(conversationId, userId);
    const nextState: {
      archivedAt?: Date | null;
      lockedAt?: Date | null;
      pinnedAt?: Date | null;
      mutedUntil?: Date | null;
    } = {};

    if (input.archived !== undefined) {
      nextState.archivedAt = input.archived ? new Date() : null;
      if (input.archived) {
        nextState.lockedAt = null;
      }
    }

    if (input.locked !== undefined) {
      nextState.lockedAt = input.locked ? new Date() : null;
      if (input.locked) {
        nextState.archivedAt = null;
      }
    }

    if (input.pinned !== undefined) {
      nextState.pinnedAt = input.pinned ? new Date() : null;
    }

    if (input.mutedUntil !== undefined) {
      nextState.mutedUntil = input.mutedUntil;
    }

    const updated = await this.prisma.conversationParticipant.update({
      where: { id: membership.id },
      data: nextState,
      include: {
        conversation: {
          include: conversationInclude
        }
      }
    });

    const unreadCount = await this.countUnreadMessages(conversationId, userId, updated);
    return this.toConversationListItem(updated.conversation, updated, unreadCount);
  }

  async isParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null
      },
      select: { id: true }
    });

    return Boolean(participant);
  }

  async addMembers(conversationId: string, userId: string, input: AddConversationMembersDto) {
    const membership = await this.assertManageableConversation(conversationId, userId);
    const participantIds = Array.from(new Set(input.participantIds.filter(Boolean))).filter((participantId) => participantId !== userId);

    if (!participantIds.length) {
      throw new BadRequestException("Choose at least one new member to add.");
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const participantId of participantIds) {
        const existing = await tx.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: participantId
            }
          },
          select: {
            id: true,
            leftAt: true
          }
        });

        if (existing) {
          if (existing.leftAt) {
            await tx.conversationParticipant.update({
              where: { id: existing.id },
              data: {
                leftAt: null,
                archivedAt: null,
                lockedAt: null,
                mutedUntil: null,
                pinnedAt: null,
                lastReadAt: now
              }
            });
          }
          continue;
        }

        await tx.conversationParticipant.create({
          data: {
            conversationId,
            userId: participantId,
            role: ParticipantRole.MEMBER,
            lastReadAt: now
          }
        });
      }
    });

    return this.getConversationListItemForUser(conversationId, userId);
  }

  async updateMemberRole(
    conversationId: string,
    actorUserId: string,
    memberUserId: string,
    input: UpdateConversationMemberRoleDto
  ) {
    const ownerMembership = await this.assertOwnerConversation(conversationId, actorUserId);

    if (memberUserId === actorUserId) {
      throw new BadRequestException("Transfer ownership later. You cannot change your own role here.");
    }

    const targetMembership = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: memberUserId,
        leftAt: null
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!targetMembership) {
      throw new NotFoundException("Member not found in this group.");
    }

    if (targetMembership.role === ParticipantRole.OWNER) {
      throw new BadRequestException("The owner role cannot be edited from here.");
    }

    await this.prisma.conversationParticipant.update({
      where: { id: targetMembership.id },
      data: {
        role: input.role
      }
    });

    return this.getConversationListItemForUser(ownerMembership.conversationId, actorUserId);
  }

  async transferOwnership(
    conversationId: string,
    actorUserId: string,
    memberUserId: string
  ) {
    const ownerMembership = await this.assertOwnerConversation(conversationId, actorUserId);

    if (memberUserId === actorUserId) {
      throw new BadRequestException("Choose another active member before transferring ownership.");
    }

    const targetMembership = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: memberUserId,
        leftAt: null
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!targetMembership) {
      throw new NotFoundException("That member is not active in this room.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.conversationParticipant.update({
        where: { id: targetMembership.id },
        data: {
          role: ParticipantRole.OWNER
        }
      });

      await tx.conversationParticipant.update({
        where: { id: ownerMembership.id },
        data: {
          role: ParticipantRole.ADMIN
        }
      });
    });

    return this.getConversationListItemForUser(ownerMembership.conversationId, actorUserId);
  }

  async createInviteLink(conversationId: string, userId: string) {
    const membership = await this.assertManageableConversation(conversationId, userId);
    const now = new Date();
    const currentConversation = membership.conversation;

    let inviteCode = currentConversation.inviteCode;
    let inviteCodeExpiresAt = currentConversation.inviteCodeExpiresAt;

    if (!inviteCode || (inviteCodeExpiresAt && inviteCodeExpiresAt <= now)) {
      inviteCode = await this.generateInviteCode();
      inviteCodeExpiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          inviteCode,
          inviteCodeCreatedAt: now,
          inviteCodeExpiresAt
        }
      });
    }

    const appOrigin = (process.env.WEB_ORIGIN ?? process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

    return {
      code: inviteCode,
      inviteUrl: `${appOrigin}/?invite=${inviteCode}`,
      expiresAt: inviteCodeExpiresAt?.toISOString() ?? null
    };
  }

  async joinByInvite(inviteCode: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        inviteCode,
        type: { not: ConversationType.DIRECT },
        OR: [{ inviteCodeExpiresAt: null }, { inviteCodeExpiresAt: { gt: new Date() } }]
      },
      include: conversationInclude
    });

    if (!conversation) {
      throw new NotFoundException("That invite link is missing or expired.");
    }

    const existing = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId
        }
      },
      select: {
        id: true,
        leftAt: true
      }
    });

    const now = new Date();
    if (existing) {
      if (existing.leftAt) {
        await this.prisma.conversationParticipant.update({
          where: { id: existing.id },
          data: {
            leftAt: null,
            archivedAt: null,
            lockedAt: null,
            mutedUntil: null,
            pinnedAt: null,
            lastReadAt: now,
            role: ParticipantRole.MEMBER
          }
        });
      }
    } else {
      await this.prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId,
          role: ParticipantRole.MEMBER,
          lastReadAt: now
        }
      });
    }

    return this.getConversationListItemForUser(conversation.id, userId);
  }

  async leaveConversation(conversationId: string, userId: string) {
    const membership = await this.assertParticipantMembership(conversationId, userId);

    if (membership.conversation.type === ConversationType.DIRECT) {
      throw new BadRequestException("Direct chats do not support leave. Archive them instead.");
    }

    if (membership.role === ParticipantRole.OWNER) {
      throw new BadRequestException("Transfer ownership first, or delete the room if you want to close it.");
    }

    await this.prisma.conversationParticipant.update({
      where: { id: membership.id },
      data: {
        leftAt: new Date(),
        archivedAt: null,
        lockedAt: null,
        pinnedAt: null,
        mutedUntil: null
      }
    });

    return { ok: true };
  }

  async deleteConversation(conversationId: string, userId: string) {
    const membership = await this.assertOwnerConversation(conversationId, userId);

    await this.prisma.conversation.delete({
      where: {
        id: membership.conversationId
      }
    });

    return { ok: true };
  }

  async reportConversation(conversationId: string, user: AuthenticatedUser, input: ReportConversationDto) {
    const membership = await this.assertParticipantMembership(conversationId, user.id);

    if (membership.conversation.type === ConversationType.DIRECT) {
      throw new BadRequestException("Use direct user reports for one-to-one chats.");
    }

    const targetUserId =
      membership.conversation.createdById ??
      membership.conversation.participants.find((participant) => participant.role === ParticipantRole.OWNER)?.userId ??
      membership.conversation.participants.find((participant) => participant.userId !== user.id)?.userId;

    if (!targetUserId || targetUserId === user.id) {
      throw new BadRequestException("This room cannot be reported from your account yet.");
    }

    const report = await this.prisma.userReport.create({
      data: {
        reporterUserId: user.id,
        targetUserId,
        conversationId,
        reason: input.reason.trim(),
        details: input.details?.trim()
      }
    });

    await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: "USER_REPORTED",
        contextId: report.id,
        title: "Group report received",
        body: `We saved your report about ${membership.conversation.title ?? "this room"} for moderation follow-up.`
      }
    });

    return report;
  }

  async assertParticipantMembership(conversationId: string, userId: string) {
    const membership = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null
      },
      include: {
        conversation: {
          include: conversationInclude
        }
      }
    });

    if (membership) {
      return membership;
    }

    const conversationExists = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true }
    });

    if (!conversationExists) {
      throw new NotFoundException("Conversation not found");
    }

    throw new ForbiddenException("You are not a participant in this conversation");
  }

  private async getMembershipOrThrow(conversationId: string, userId: string) {
    return this.prisma.conversationParticipant.findFirstOrThrow({
      where: {
        conversationId,
        userId,
        leftAt: null
      },
      include: {
        conversation: {
          include: conversationInclude
        }
      }
    });
  }

  async findDirectConversationForUsers(participantIds: string[]) {
    return this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        AND: participantIds.map((userId) => ({
          participants: {
            some: { userId }
          }
        })),
        NOT: {
          participants: {
            some: {
              userId: { notIn: participantIds }
            }
          }
        }
      },
      include: conversationInclude
    });
  }

  private async getConversationListItemForUser(conversationId: string, userId: string) {
    const membership = await this.getMembershipOrThrow(conversationId, userId);
    const unreadCount = await this.countUnreadMessages(conversationId, userId, membership);
    return this.toConversationListItem(membership.conversation, membership, unreadCount);
  }

  private assertGroupOrChannelConversation(
    conversation: Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>
  ) {
    if (conversation.type === ConversationType.DIRECT) {
      throw new BadRequestException("This action only works for groups and channels.");
    }
  }

  private async assertManageableConversation(conversationId: string, userId: string) {
    const membership = await this.assertParticipantMembership(conversationId, userId);
    this.assertGroupOrChannelConversation(membership.conversation);

    if (membership.role !== ParticipantRole.OWNER && membership.role !== ParticipantRole.ADMIN) {
      throw new ForbiddenException("Only room admins can manage members or invite links.");
    }

    return membership;
  }

  private async assertOwnerConversation(conversationId: string, userId: string) {
    const membership = await this.assertParticipantMembership(conversationId, userId);
    this.assertGroupOrChannelConversation(membership.conversation);

    if (membership.role !== ParticipantRole.OWNER) {
      throw new ForbiddenException("Only the room owner can change member admin roles.");
    }

    return membership;
  }

  private async generateInviteCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inviteCode = randomBytes(6).toString("base64url").toLowerCase();
      const existing = await this.prisma.conversation.findFirst({
        where: {
          inviteCode
        },
        select: {
          id: true
        }
      });

      if (!existing) {
        return inviteCode;
      }
    }

    throw new BadRequestException("Could not create a fresh invite link right now.");
  }

  private async countUnreadMessages(
    conversationId: string,
    userId: string,
    membership: {
      joinedAt: Date;
      lastReadAt: Date | null;
    }
  ) {
    return this.prisma.message.count({
      where: {
        conversationId,
        deletedAt: null,
        senderId: { not: userId },
        createdAt: {
          gt: membership.lastReadAt ?? membership.joinedAt
        }
      }
    });
  }

  private toConversationListItem(
    conversation: Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>,
    membership: {
      archivedAt: Date | null;
      lockedAt: Date | null;
      mutedUntil: Date | null;
      pinnedAt: Date | null;
      lastReadAt: Date | null;
      lastReadMessageId: string | null;
    },
    unreadCount: number,
    relationshipState?: {
      blockedByMe: boolean;
      blockedMe: boolean;
    }
  ) {
    return {
      ...conversation,
      unreadCount,
      relationshipState: relationshipState ?? {
        blockedByMe: false,
        blockedMe: false
      },
      participantState: {
        archivedAt: membership.archivedAt,
        lockedAt: membership.lockedAt,
        mutedUntil: membership.mutedUntil,
        pinnedAt: membership.pinnedAt,
        lastReadAt: membership.lastReadAt,
        lastReadMessageId: membership.lastReadMessageId
      }
    };
  }
}
