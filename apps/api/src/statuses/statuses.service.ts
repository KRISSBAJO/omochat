import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConversationType, UserStatusPostType } from "@omochat/db";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ConversationsService } from "../conversations/conversations.service";
import { MessagesService } from "../messages/messages.service";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";
import { CreateStatusCommentDto } from "./dto/create-status-comment.dto";
import { CreateStatusDto } from "./dto/create-status.dto";
import { ModerateStatusDto } from "./dto/moderate-status.dto";

const statusUserSelect = {
  id: true,
  username: true,
  userCode: true,
  displayName: true,
  avatarUrl: true,
  lastSeenAt: true
} as const;

@Injectable()
export class StatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService
  ) {}

  async getFeed(user: AuthenticatedUser) {
    const contactIds = await this.listVisibleContactUserIds(user.id);
    const ownerIds = [...new Set([user.id, ...contactIds])];
    const now = new Date();

    const statuses = ownerIds.length
      ? await this.prisma.userStatusPost.findMany({
          where: {
            userId: { in: ownerIds },
            expiresAt: { gt: now },
            removedAt: null
          },
          orderBy: [{ createdAt: "asc" }],
          include: {
            user: {
              select: statusUserSelect
            },
            views: {
              where: {
                viewerUserId: user.id
              },
              select: {
                id: true,
                viewedAt: true
              }
            },
            reactions: {
              where: {
                userId: user.id
              },
              select: {
                id: true,
                emoji: true,
                createdAt: true
              }
            },
            _count: {
              select: {
                views: true,
                reactions: true,
                comments: true
              }
            }
          }
        })
      : [];

    const grouped = new Map<string, ReturnType<typeof this.serializeFeedItem>[]>();
    for (const status of statuses) {
      const item = this.serializeFeedItem(status);
      const existing = grouped.get(status.userId) ?? [];
      existing.push(item);
      grouped.set(status.userId, existing);
    }

    const threads = [...grouped.entries()]
      .map(([ownerId, items]) => {
        const latestCreatedAt = items[items.length - 1]?.createdAt ?? null;
        const unseenCount = ownerId === user.id ? 0 : items.filter((item) => !item.viewedAt).length;
        return {
          owner: items[0]?.owner ?? null,
          latestCreatedAt,
          hasUnseen: unseenCount > 0,
          unseenCount,
          items
        };
      })
      .filter((thread) => thread.owner)
      .sort((left, right) => new Date(right.latestCreatedAt ?? 0).getTime() - new Date(left.latestCreatedAt ?? 0).getTime());

    return {
      defaultExpiresInHours: this.defaultTtlHours(),
      canModerate: this.canModerateStatuses(user),
      mine: threads.find((thread) => thread.owner?.id === user.id) ?? null,
      contacts: threads.filter((thread) => thread.owner?.id !== user.id)
    };
  }

  async getStatusDetail(statusId: string, user: AuthenticatedUser) {
    const base = await this.assertStatusVisible(statusId, user);
    const canSeeViewers = base.userId === user.id || this.canModerateStatuses(user);

    const status = await this.prisma.userStatusPost.findUniqueOrThrow({
      where: { id: statusId },
      include: {
        user: {
          select: statusUserSelect
        },
        views: canSeeViewers
          ? {
              include: {
                viewer: {
                  select: statusUserSelect
                }
              },
              orderBy: [{ viewedAt: "desc" }],
              take: 200
            }
          : {
              where: {
                viewerUserId: user.id
              },
              include: {
                viewer: {
                  select: statusUserSelect
                }
              },
              take: 1
            },
        reactions: {
          include: {
            user: {
              select: statusUserSelect
            }
          },
          orderBy: [{ createdAt: "desc" }],
          take: 80
        },
        comments: {
          include: {
            user: {
              select: statusUserSelect
            }
          },
          orderBy: [{ createdAt: "asc" }],
          take: 80
        },
        _count: {
          select: {
            views: true,
            reactions: true,
            comments: true
          }
        }
      }
    });

    return this.serializeDetail(status, user.id, canSeeViewers);
  }

  async createStatus(user: AuthenticatedUser, input: CreateStatusDto) {
    const normalized = this.normalizeCreateInput(input, user);

    const created = await this.prisma.userStatusPost.create({
      data: {
        userId: user.id,
        type: normalized.type,
        text: normalized.text,
        caption: normalized.caption,
        backgroundColor: normalized.backgroundColor,
        textColor: normalized.textColor,
        mediaProvider: normalized.media?.provider ?? null,
        mediaBucket: normalized.media?.provider === "S3" ? process.env.AWS_S3_BUCKET ?? null : null,
        mediaStorageKey: normalized.media?.storageKey ?? null,
        mediaUrl: normalized.media?.url ?? null,
        mediaMimeType: normalized.media?.mimeType ?? null,
        mediaSizeBytes: normalized.media?.sizeBytes ?? null,
        mediaWidth: normalized.media?.width ?? null,
        mediaHeight: normalized.media?.height ?? null,
        mediaDurationMs: normalized.media?.durationMs ?? null,
        mediaChecksum: normalized.media?.checksum ?? null,
        expiresAt: new Date(Date.now() + normalized.expiresInHours * 60 * 60 * 1000)
      },
      select: {
        id: true
      }
    });

    return {
      status: await this.getStatusDetail(created.id, user),
      broadcastUserIds: await this.listStatusAudienceUserIds(user.id)
    };
  }

  async markViewed(statusId: string, user: AuthenticatedUser) {
    const base = await this.assertStatusVisible(statusId, user);

    if (base.userId !== user.id) {
      await this.prisma.userStatusView.upsert({
        where: {
          statusPostId_viewerUserId: {
            statusPostId: statusId,
            viewerUserId: user.id
          }
        },
        create: {
          statusPostId: statusId,
          viewerUserId: user.id
        },
        update: {
          viewedAt: new Date()
        }
      });
    }

    return {
      status: await this.getStatusDetail(statusId, user),
      broadcastUserIds: [...new Set([base.userId, user.id])]
    };
  }

  async toggleReaction(statusId: string, user: AuthenticatedUser, emoji: string) {
    const base = await this.assertStatusVisible(statusId, user);
    const normalizedEmoji = emoji.trim();
    if (!normalizedEmoji) {
      throw new BadRequestException("Choose a reaction first.");
    }

    const existing = await this.prisma.userStatusReaction.findUnique({
      where: {
        statusPostId_userId: {
          statusPostId: statusId,
          userId: user.id
        }
      },
      select: {
        id: true,
        emoji: true
      }
    });

    let mirroredConversationId: string | null = null;
    let mirroredMessage:
      | Awaited<ReturnType<MessagesService["create"]>>
      | Awaited<ReturnType<MessagesService["updateMessage"]>>
      | Awaited<ReturnType<MessagesService["deleteMessage"]>>
      | null = null;
    let mirroredMessageAction: "created" | "updated" | "deleted" | null = null;

    if (base.userId !== user.id) {
      const directConversation = await this.ensureDirectConversation(base.userId, user.id);
      mirroredConversationId = directConversation.id;
      const existingMirroredMessageId = await this.findMirroredStatusReactionMessageId(
        directConversation.id,
        user.id,
        this.statusReactionMirrorKey(statusId, user.id)
      );

      if (existing?.emoji === normalizedEmoji) {
        if (existingMirroredMessageId) {
          mirroredMessage = await this.messages.deleteMessage(directConversation.id, existingMirroredMessageId, user.id);
          mirroredMessageAction = "deleted";
        }
      } else {
        mirroredMessage = existingMirroredMessageId
          ? await this.messages.updateMessage(directConversation.id, existingMirroredMessageId, user.id, {
              body: this.statusReactionMirrorBody(normalizedEmoji)
            })
          : await this.createMirroredStatusReactionMessage(directConversation.id, user.id, statusId, normalizedEmoji);
        mirroredMessageAction = existingMirroredMessageId ? "updated" : "created";
      }
    }

    if (existing?.emoji === normalizedEmoji) {
      await this.prisma.userStatusReaction.delete({
        where: {
          id: existing.id
        }
      });
    } else if (existing) {
      await this.prisma.userStatusReaction.update({
        where: {
          id: existing.id
        },
        data: {
          emoji: normalizedEmoji
        }
      });
    } else {
      await this.prisma.userStatusReaction.create({
        data: {
          statusPostId: statusId,
          userId: user.id,
          emoji: normalizedEmoji
        }
      });
    }

    return {
      status: await this.getStatusDetail(statusId, user),
      broadcastUserIds: [...new Set([base.userId, user.id])],
      inboxUserIds: mirroredConversationId ? [...new Set([base.userId, user.id])] : [],
      mirroredConversationId,
      mirroredMessage,
      mirroredMessageAction
    };
  }

  async addComment(statusId: string, user: AuthenticatedUser, input: CreateStatusCommentDto) {
    const base = await this.assertStatusVisible(statusId, user);
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException("Write a reply before sending it.");
    }

    let mirroredConversationId: string | null = null;
    let mirroredMessage: Awaited<ReturnType<MessagesService["create"]>> | null = null;

    if (base.userId !== user.id) {
      const existingDirect = await this.conversations.findDirectConversationForUsers([base.userId, user.id]);
      const directConversation =
        existingDirect ??
        (await this.conversations.create(
          {
            type: ConversationType.DIRECT,
            participantIds: [base.userId]
          },
          user.id
        ));

      mirroredConversationId = directConversation.id;
      mirroredMessage = await this.messages.create({
        conversationId: directConversation.id,
        senderId: user.id,
        body: `Status reply: ${body}`
      });
    }

    await this.prisma.userStatusComment.create({
      data: {
        statusPostId: statusId,
        userId: user.id,
        body,
        conversationId: mirroredConversationId,
        messageId: mirroredMessage?.id ?? null
      }
    });

    return {
      status: await this.getStatusDetail(statusId, user),
      broadcastUserIds: [...new Set([base.userId, user.id])],
      inboxUserIds: mirroredConversationId ? [...new Set([base.userId, user.id])] : [],
      mirroredConversationId,
      mirroredMessage
    };
  }

  async deleteOwnStatus(statusId: string, user: AuthenticatedUser) {
    const existing = await this.prisma.userStatusPost.findUnique({
      where: { id: statusId },
      select: {
        id: true,
        userId: true
      }
    });

    if (!existing) {
      throw new NotFoundException("Status not found.");
    }

    if (existing.userId !== user.id) {
      throw new ForbiddenException("You can only remove your own status.");
    }

    await this.prisma.userStatusPost.update({
      where: { id: statusId },
      data: {
        removedAt: new Date(),
        removedReason: "Removed by owner",
        removedByUserId: user.id
      }
    });

    return {
      broadcastUserIds: await this.listStatusAudienceUserIds(user.id)
    };
  }

  async moderateStatus(statusId: string, user: AuthenticatedUser, input: ModerateStatusDto) {
    if (!this.canModerateStatuses(user)) {
      throw new ForbiddenException("You do not have moderation access for statuses.");
    }

    const existing = await this.prisma.userStatusPost.findUnique({
      where: { id: statusId },
      select: {
        id: true,
        userId: true
      }
    });

    if (!existing) {
      throw new NotFoundException("Status not found.");
    }

    const update: {
      removedAt?: Date | null;
      removedReason?: string | null;
      removedByUserId?: string | null;
      expiresAt?: Date;
    } = {};

    if (input.remove !== undefined) {
      if (input.remove) {
        update.removedAt = new Date();
        update.removedReason = input.removedReason?.trim() || "Removed by moderation.";
        update.removedByUserId = user.id;
      } else {
        update.removedAt = null;
        update.removedReason = null;
        update.removedByUserId = null;
      }
    }

    if (input.expiresInHours !== undefined) {
      update.expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
    }

    await this.prisma.userStatusPost.update({
      where: { id: statusId },
      data: update
    });

    return {
      status: await this.getStatusDetail(statusId, user),
      broadcastUserIds: await this.listStatusAudienceUserIds(existing.userId)
    };
  }

  private async assertStatusVisible(statusId: string, user: AuthenticatedUser) {
    const status = await this.prisma.userStatusPost.findUnique({
      where: { id: statusId },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        removedAt: true
      }
    });

    if (!status) {
      throw new NotFoundException("Status not found.");
    }

    if (status.userId === user.id || this.canModerateStatuses(user)) {
      return status;
    }

    if (status.removedAt || status.expiresAt <= new Date()) {
      throw new NotFoundException("Status is no longer available.");
    }

    const relationship = await this.safety.buildRelationshipMap(user.id, [status.userId]);
    const connection = relationship.get(status.userId);
    if (connection?.blockedByMe || connection?.blockedMe) {
      throw new NotFoundException("Status is no longer available.");
    }

    const sharedConversation = await this.prisma.conversationParticipant.findFirst({
      where: {
        userId: user.id,
        leftAt: null,
        conversation: {
          type: {
            in: [ConversationType.DIRECT, ConversationType.GROUP]
          },
          participants: {
            some: {
              userId: status.userId,
              leftAt: null
            }
          }
        }
      },
      select: {
        id: true
      }
    });

    if (!sharedConversation) {
      throw new NotFoundException("Status is no longer available.");
    }

    return status;
  }

  private async listVisibleContactUserIds(userId: string) {
    const contacts = await this.prisma.conversationParticipant.findMany({
      where: {
        userId: {
          not: userId
        },
        leftAt: null,
        conversation: {
          type: {
            in: [ConversationType.DIRECT, ConversationType.GROUP]
          },
          participants: {
            some: {
              userId,
              leftAt: null
            }
          }
        }
      },
      select: {
        userId: true
      }
    });

    const candidateIds = [...new Set(contacts.map((contact) => contact.userId))];
    const relationshipMap = await this.safety.buildRelationshipMap(userId, candidateIds);

    return candidateIds.filter((candidateId) => {
      const relationship = relationshipMap.get(candidateId);
      return !(relationship?.blockedByMe || relationship?.blockedMe);
    });
  }

  private async listStatusAudienceUserIds(ownerUserId: string) {
    return [...new Set([ownerUserId, ...(await this.listVisibleContactUserIds(ownerUserId))])];
  }

  private serializeFeedItem(status: any) {
    return {
      id: status.id,
      type: status.type,
      text: status.text,
      caption: status.caption,
      backgroundColor: status.backgroundColor,
      textColor: status.textColor,
      createdAt: status.createdAt,
      expiresAt: status.expiresAt,
      owner: status.user,
      media: this.serializeMedia(status),
      viewedAt: status.views[0]?.viewedAt ?? null,
      myReaction: status.reactions[0]
        ? {
            id: status.reactions[0].id,
            emoji: status.reactions[0].emoji,
            createdAt: status.reactions[0].createdAt
          }
        : null,
      viewerCount: status._count.views,
      reactionCount: status._count.reactions,
      commentCount: status._count.comments
    };
  }

  private serializeDetail(status: any, currentUserId: string, includeViewers: boolean) {
    const myReaction = status.reactions.find((reaction: any) => reaction.user.id === currentUserId) ?? null;
    const myView = status.views.find((view: any) => view.viewer?.id === currentUserId) ?? null;

    return {
      id: status.id,
      type: status.type,
      text: status.text,
      caption: status.caption,
      backgroundColor: status.backgroundColor,
      textColor: status.textColor,
      createdAt: status.createdAt,
      expiresAt: status.expiresAt,
      removedAt: status.removedAt,
      removedReason: status.removedReason,
      owner: status.user,
      media: this.serializeMedia(status),
      viewedAt: myView?.viewedAt ?? null,
      myReaction: myReaction
        ? {
            id: myReaction.id,
            emoji: myReaction.emoji,
            createdAt: myReaction.createdAt
          }
        : null,
      viewerCount: status._count.views,
      reactionCount: status._count.reactions,
      commentCount: status._count.comments,
      reactions: status.reactions.map((reaction: any) => ({
        id: reaction.id,
        emoji: reaction.emoji,
        createdAt: reaction.createdAt,
        user: reaction.user
      })),
      comments: status.comments.map((comment: any) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        conversationId: comment.conversationId,
        messageId: comment.messageId,
        user: comment.user
      })),
      viewers: includeViewers
        ? status.views.map((view: any) => ({
            id: view.id,
            viewedAt: view.viewedAt,
            viewer: view.viewer
          }))
        : []
    };
  }

  private serializeMedia(status: {
    mediaProvider?: string | null;
    mediaBucket?: string | null;
    mediaStorageKey?: string | null;
    mediaUrl?: string | null;
    mediaMimeType?: string | null;
    mediaSizeBytes?: number | null;
    mediaWidth?: number | null;
    mediaHeight?: number | null;
    mediaDurationMs?: number | null;
    mediaChecksum?: string | null;
  }) {
    if (!status.mediaProvider || !status.mediaStorageKey || !status.mediaUrl || !status.mediaMimeType || !status.mediaSizeBytes) {
      return null;
    }

    return {
      provider: status.mediaProvider,
      bucket: status.mediaBucket ?? null,
      storageKey: status.mediaStorageKey,
      url: status.mediaUrl,
      mimeType: status.mediaMimeType,
      sizeBytes: status.mediaSizeBytes,
      width: status.mediaWidth ?? null,
      height: status.mediaHeight ?? null,
      durationMs: status.mediaDurationMs ?? null,
      checksum: status.mediaChecksum ?? null
    };
  }

  private async ensureDirectConversation(ownerUserId: string, reactingUserId: string) {
    const existingDirect = await this.conversations.findDirectConversationForUsers([ownerUserId, reactingUserId]);
    if (existingDirect) {
      return existingDirect;
    }

    return this.conversations.create(
      {
        type: ConversationType.DIRECT,
        participantIds: [ownerUserId]
      },
      reactingUserId
    );
  }

  private statusReactionMirrorKey(statusId: string, reactingUserId: string) {
    return `status-reaction:${statusId}:${reactingUserId}`;
  }

  private statusReactionMirrorBody(emoji: string) {
    return `Reacted to your status ${emoji}`;
  }

  private async findMirroredStatusReactionMessageId(conversationId: string, reactingUserId: string, mirrorKey: string) {
    const existing = await this.prisma.message.findFirst({
      where: {
        conversationId,
        senderId: reactingUserId,
        encryptedBody: mirrorKey,
        deletedAt: null
      },
      select: {
        id: true
      }
    });

    return existing?.id ?? null;
  }

  private async createMirroredStatusReactionMessage(
    conversationId: string,
    reactingUserId: string,
    statusId: string,
    emoji: string
  ) {
    const created = await this.messages.create({
      conversationId,
      senderId: reactingUserId,
      body: this.statusReactionMirrorBody(emoji)
    });

    await this.prisma.message.update({
      where: {
        id: created.id
      },
      data: {
        encryptedBody: this.statusReactionMirrorKey(statusId, reactingUserId)
      }
    });

    return created;
  }

  private normalizeCreateInput(input: CreateStatusDto, user: AuthenticatedUser) {
    const type = input.type;
    const text = input.text?.trim() || null;
    const caption = input.caption?.trim() || (type === UserStatusPostType.TEXT ? null : text);
    const backgroundColor = input.backgroundColor?.trim().toLowerCase() || "#8d3270";
    const textColor = input.textColor?.trim().toLowerCase() || "#fff6f7";
    const expiresInHours = this.resolveExpiresInHours(user, input.expiresInHours);

    if (type === UserStatusPostType.TEXT) {
      const content = text ?? caption;
      if (!content) {
        throw new BadRequestException("Text statuses need something to say.");
      }

      return {
        type,
        text: content,
        caption: null,
        backgroundColor,
        textColor,
        media: null,
        expiresInHours
      };
    }

    if (!input.media) {
      throw new BadRequestException("Image and video statuses need uploaded media.");
    }

    if (type === UserStatusPostType.IMAGE && !input.media.mimeType.startsWith("image/")) {
      throw new BadRequestException("Image statuses need an image upload.");
    }

    if (type === UserStatusPostType.VIDEO && !input.media.mimeType.startsWith("video/")) {
      throw new BadRequestException("Video statuses need a video upload.");
    }

    return {
      type,
      text: null,
      caption: caption || null,
      backgroundColor: null,
      textColor: null,
      media: input.media,
      expiresInHours
    };
  }

  private resolveExpiresInHours(user: AuthenticatedUser, requested?: number) {
    if (requested === undefined) {
      return this.defaultTtlHours();
    }

    if (!this.canModerateStatuses(user)) {
      throw new ForbiddenException("Only moderators can change status lifetime.");
    }

    return requested;
  }

  private canModerateStatuses(user: AuthenticatedUser) {
    return user.access.isModerator || user.access.isPlatformAdmin || user.access.isSiteAdmin;
  }

  private defaultTtlHours() {
    const parsed = Number(process.env.STATUS_DEFAULT_TTL_HOURS ?? 24);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 24;
    }

    return Math.min(Math.round(parsed), 168);
  }
}
