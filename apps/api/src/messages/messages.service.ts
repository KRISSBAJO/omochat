import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MediaProvider, MessageType, Prisma } from "@omochat/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { PushNotificationsService } from "../notifications/push-notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";
import { CreateAttachmentMessageDto } from "./dto/create-attachment-message.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { ListMessagesQueryDto } from "./dto/list-messages-query.dto";
import { PrepareAttachmentUploadDto } from "./dto/prepare-attachment-upload.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";

const messageSenderSelect = {
  id: true,
  username: true,
  userCode: true,
  displayName: true,
  avatarUrl: true
} as const;

const messageInclude = {
  sender: {
    select: messageSenderSelect
  },
  parent: {
    select: {
      id: true,
      body: true,
      type: true,
      deletedAt: true,
      createdAt: true,
      sender: {
        select: messageSenderSelect
      }
    }
  },
  reactions: {
    include: {
      user: {
        select: { id: true, username: true, userCode: true, displayName: true }
      }
    },
    orderBy: { createdAt: "asc" }
  },
  receipts: {
    include: {
      user: {
        select: { id: true, username: true, userCode: true, displayName: true }
      }
    }
  },
  media: true
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService,
    private readonly pushNotifications: PushNotificationsService
  ) {}

  async listForConversation(conversationId: string, userId: string, query: ListMessagesQueryDto = {}) {
    await this.assertParticipant(conversationId, userId);

    const limit = query.limit ?? 60;
    const where: Prisma.MessageWhereInput = {
      conversationId
    };

    if (query.cursor) {
      const cursorMessage = await this.prisma.message.findFirst({
        where: {
          id: query.cursor,
          conversationId
        },
        select: {
          id: true,
          createdAt: true
        }
      });

      if (!cursorMessage) {
        throw new NotFoundException("Cursor message not found");
      }

      where.OR = [
        { createdAt: { lt: cursorMessage.createdAt } },
        {
          createdAt: cursorMessage.createdAt,
          id: { lt: cursorMessage.id }
        }
      ];
    }

    const items = await this.prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit
    });

    const ordered = [...items].reverse();
    const nextCursor = items.length === limit ? items[items.length - 1]?.id ?? null : null;

    return {
      items: ordered,
      nextCursor
    };
  }

  async createForUser(conversationId: string, userId: string, input: CreateMessageDto) {
    await this.assertParticipant(conversationId, userId);
    await this.safety.assertConversationMessagingAllowed(conversationId, userId);
    await this.assertParentMessage(input.parentId, conversationId);

    return this.create({
      conversationId,
      senderId: userId,
      body: input.body.trim(),
      parentId: input.parentId
    });
  }

  async createAttachmentMessageForUser(conversationId: string, userId: string, input: CreateAttachmentMessageDto) {
    await this.assertParticipant(conversationId, userId);
    await this.safety.assertConversationMessagingAllowed(conversationId, userId);
    await this.assertParentMessage(input.parentId, conversationId);

    if (!input.attachments.length) {
      throw new BadRequestException("Add at least one attachment.");
    }

    const body = input.body?.trim() || null;
    const type = this.inferMessageType(input.attachments.map((attachment) => attachment.mimeType));

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        parentId: input.parentId,
        body,
        type,
        media: {
          create: input.attachments.map((attachment) => ({
            provider: attachment.provider,
            bucket: attachment.provider === MediaProvider.S3 ? process.env.AWS_S3_BUCKET ?? null : null,
            storageKey: attachment.storageKey,
            url: attachment.url,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            width: attachment.width,
            height: attachment.height,
            durationMs: attachment.durationMs,
            checksum: attachment.checksum
          }))
        }
      },
      include: messageInclude
    });

    await this.markMessageAsLatest(conversationId, message.id, message.createdAt, userId);
    await this.notifyConversationRecipients(message, userId);
    return message;
  }

  async create(input: SendMessageDto) {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException("Message body is required.");
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        parentId: input.parentId,
        body,
        type: MessageType.TEXT
      },
      include: messageInclude
    });

    await this.markMessageAsLatest(input.conversationId, message.id, message.createdAt, input.senderId ?? undefined);
    if (input.senderId) {
      await this.notifyConversationRecipients(message, input.senderId);
    }
    return message;
  }

  async updateMessage(conversationId: string, messageId: string, userId: string, input: UpdateMessageDto) {
    await this.assertParticipant(conversationId, userId);
    await this.safety.assertConversationMessagingAllowed(conversationId, userId);

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId
      },
      select: {
        id: true,
        senderId: true,
        deletedAt: true
      }
    });

    if (!message) {
      throw new NotFoundException("Message not found.");
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only edit your own messages.");
    }

    if (message.deletedAt) {
      throw new BadRequestException("Deleted messages cannot be edited.");
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        body: input.body.trim(),
        editedAt: new Date()
      },
      include: messageInclude
    });
  }

  async deleteMessage(conversationId: string, messageId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.safety.assertConversationMessagingAllowed(conversationId, userId);

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId
      },
      select: {
        id: true,
        senderId: true,
        deletedAt: true
      }
    });

    if (!message) {
      throw new NotFoundException("Message not found.");
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only delete your own messages.");
    }

    if (message.deletedAt) {
      return this.prisma.message.findUniqueOrThrow({
        where: { id: messageId },
        include: messageInclude
      });
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        body: null,
        deletedAt: new Date(),
        editedAt: null,
        reactions: {
          deleteMany: {}
        }
      },
      include: messageInclude
    });
  }

  async prepareAttachmentUpload(conversationId: string, userId: string, input: PrepareAttachmentUploadDto) {
    await this.assertParticipant(conversationId, userId);
    await this.safety.assertConversationMessagingAllowed(conversationId, userId);

    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException("S3 uploads are not configured yet.");
    }

    const safeFileName = input.fileName
      .trim()
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-");
    const storageKey = `conversations/${conversationId}/${randomUUID()}-${safeFileName}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: input.contentType,
      ContentLength: input.sizeBytes
    });
    const uploadUrl = await getSignedUrl(this.getS3Client(), command, { expiresIn: 60 * 5 });
    const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL?.trim();
    const fileUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, "")}/${storageKey}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${storageKey}`;

    return {
      provider: MediaProvider.S3,
      bucket,
      storageKey,
      uploadUrl,
      fileUrl,
      mimeType: input.contentType,
      sizeBytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      durationMs: input.durationMs ?? null
    };
  }

  async toggleReaction(conversationId: string, messageId: string, userId: string, emoji: string) {
    await this.assertParticipant(conversationId, userId);
    await this.safety.assertConversationMessagingAllowed(conversationId, userId);
    await this.assertMessageInConversation(conversationId, messageId);

    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      },
      select: { id: true }
    });

    if (existing) {
      await this.prisma.messageReaction.delete({
        where: { id: existing.id }
      });
    } else {
      await this.prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji
        }
      });
    }

    return this.prisma.message.findUniqueOrThrow({
      where: { id: messageId },
      include: messageInclude
    });
  }

  async markRead(conversationId: string, messageId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.assertMessageInConversation(conversationId, messageId);

    const now = new Date();
    await this.prisma.messageReceipt.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId
        }
      },
      update: {
        status: "READ",
        deliveredAt: now,
        readAt: now
      },
      create: {
        messageId,
        userId,
        status: "READ",
        deliveredAt: now,
        readAt: now
      }
    });

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
        leftAt: null
      },
      data: {
        archivedAt: null,
        lastReadAt: now,
        lastReadMessageId: messageId
      }
    });

    return this.prisma.message.findUniqueOrThrow({
      where: { id: messageId },
      include: messageInclude
    });
  }

  async latestReadableMessageId(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);

    const message = await this.prisma.message.findFirst({
      where: {
        conversationId,
        deletedAt: null,
        senderId: { not: userId }
      },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });

    return message?.id ?? null;
  }

  async assertCanSignalMessage(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.safety.assertConversationMessagingAllowed(conversationId, userId);
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        participants: {
          where: { userId, leftAt: null },
          select: { id: true }
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (conversation.participants.length === 0) {
      throw new ForbiddenException("You are not a participant in this conversation");
    }
  }

  private async assertMessageInConversation(conversationId: string, messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId
      },
      select: { id: true }
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }
  }

  private async assertParentMessage(parentId: string | undefined, conversationId: string) {
    if (!parentId) {
      return;
    }

    await this.assertMessageInConversation(conversationId, parentId);
  }

  private inferMessageType(mimeTypes: string[]) {
    if (mimeTypes.every((mimeType) => mimeType.startsWith("image/"))) {
      return MessageType.IMAGE;
    }

    if (mimeTypes.every((mimeType) => mimeType.startsWith("video/"))) {
      return MessageType.VIDEO;
    }

    if (mimeTypes.every((mimeType) => mimeType.startsWith("audio/"))) {
      return MessageType.AUDIO;
    }

    return MessageType.DOCUMENT;
  }

  private async markMessageAsLatest(
    conversationId: string,
    messageId: string,
    createdAt: Date,
    senderId?: string
  ) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: createdAt }
    });

    if (!senderId) {
      return;
    }

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: senderId,
        leftAt: null
      },
      data: {
        archivedAt: null,
        lastReadAt: createdAt,
        lastReadMessageId: messageId
      }
    });
  }

  private getS3Client() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException("S3 uploads are not configured yet.");
    }

    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  private async notifyConversationRecipients(message: Prisma.MessageGetPayload<{ include: typeof messageInclude }>, senderId: string) {
    const senderName = message.sender?.displayName ?? message.sender?.username ?? "Someone";
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: message.conversationId,
        userId: { not: senderId },
        leftAt: null
      },
      select: {
        userId: true,
        mutedUntil: true
      }
    });

    const now = new Date();
    const recipients = participants.filter((participant) => !participant.mutedUntil || participant.mutedUntil <= now);
    if (recipients.length === 0) {
      return;
    }

    const body = this.buildNotificationPreview(message);
    await this.prisma.notification.createMany({
      data: recipients.map((participant) => ({
        userId: participant.userId,
        messageId: message.id,
        type: "MESSAGE_RECEIVED",
        contextId: message.conversationId,
        title: `New message from ${senderName}`,
        body,
        status: "SENT",
        sentAt: now
      }))
    });

    await this.pushNotifications.notifyUsers(
      recipients.map((participant) => participant.userId),
      {
        body,
        tag: `conversation-${message.conversationId}`,
        title: `New message from ${senderName}`,
        url: `/?conversationId=${encodeURIComponent(message.conversationId)}`
      }
    );
  }

  private buildNotificationPreview(message: Prisma.MessageGetPayload<{ include: typeof messageInclude }>) {
    if (message.deletedAt) {
      return "A message in your conversation was updated.";
    }

    if (message.type === MessageType.TEXT) {
      return message.body?.trim() || "New message";
    }

    if (message.type === MessageType.IMAGE) {
      return message.body?.trim() || "Sent an image";
    }

    if (message.type === MessageType.VIDEO) {
      return message.body?.trim() || "Sent a video";
    }

    if (message.type === MessageType.AUDIO) {
      return message.body?.trim() || "Sent an audio message";
    }

    if (message.type === MessageType.DOCUMENT) {
      return message.body?.trim() || "Sent an attachment";
    }

    return message.body?.trim() || "New message";
  }
}
