import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConversationType, DirectMessagePolicy, DirectMessageRequestStatus, Prisma, UserStatus } from "@omochat/db";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ConversationsService } from "../conversations/conversations.service";
import { MessagesService } from "../messages/messages.service";
import { PushNotificationsService } from "../notifications/push-notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";
import { StartMessageRequestDto } from "./dto/start-message-request.dto";

const requestUserSelect = {
  id: true,
  username: true,
  userCode: true,
  displayName: true,
  avatarUrl: true,
  lastSeenAt: true,
  dmPolicy: true
} as const;

const requestInclude = {
  requester: {
    select: requestUserSelect
  },
  recipient: {
    select: requestUserSelect
  }
} satisfies Prisma.DirectMessageRequestInclude;

@Injectable()
export class MessageRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly safety: SafetyService,
    private readonly pushNotifications: PushNotificationsService
  ) {}

  async listForUser(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.directMessageRequest.findMany({
        where: {
          recipientUserId: userId,
          status: DirectMessageRequestStatus.PENDING
        },
        include: requestInclude,
        orderBy: [{ createdAt: "desc" }]
      }),
      this.prisma.directMessageRequest.findMany({
        where: {
          requesterUserId: userId,
          status: DirectMessageRequestStatus.PENDING
        },
        include: requestInclude,
        orderBy: [{ createdAt: "desc" }]
      })
    ]);

    return {
      incoming,
      outgoing
    };
  }

  async start(user: AuthenticatedUser, input: StartMessageRequestDto) {
    if (input.recipientUserId === user.id) {
      throw new BadRequestException("You cannot send a request to yourself.");
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: input.recipientUserId },
      select: {
        id: true,
        status: true,
        dmPolicy: true,
        displayName: true
      }
    });

    if (!recipient || recipient.status !== UserStatus.ACTIVE) {
      throw new NotFoundException("Recipient not found.");
    }

    await this.safety.assertUsersCanConnect(user.id, recipient.id);

    const existingConversation = await this.conversations.findDirectConversationForUsers([user.id, recipient.id]);
    if (existingConversation || recipient.dmPolicy === DirectMessagePolicy.OPEN) {
      const conversation = await this.conversations.create(
        {
          type: ConversationType.DIRECT,
          participantIds: [recipient.id]
        },
        user.id
      );

      return {
        kind: "conversation" as const,
        conversation
      };
    }

    const initialMessage = input.initialMessage?.trim() ?? "";
    if (!initialMessage) {
      throw new BadRequestException("Add a short message so we can notify them clearly.");
    }

    const existingPending = await this.prisma.directMessageRequest.findFirst({
      where: {
        requesterUserId: user.id,
        recipientUserId: recipient.id,
        status: DirectMessageRequestStatus.PENDING
      },
      include: requestInclude
    });

    const request = existingPending
      ? await this.prisma.directMessageRequest.update({
          where: { id: existingPending.id },
          data: {
            initialMessage
          },
          include: requestInclude
        })
      : await this.prisma.directMessageRequest.create({
          data: {
            requesterUserId: user.id,
            recipientUserId: recipient.id,
            initialMessage
          },
          include: requestInclude
        });

    await this.prisma.notification.create({
      data: {
        userId: recipient.id,
        type: "MESSAGE_REQUEST",
        contextId: request.id,
        title: "New message request",
        body: `${user.displayName} wants to start a private conversation with you.`
      }
    });

    await this.pushNotifications.notifyUsers([recipient.id], {
      body: `${user.displayName} wants to start a private conversation with you.`,
      tag: `message-request-${request.id}`,
      title: "New message request",
      url: "/?sidebar=requests"
    });

    return {
      kind: "request" as const,
      request
    };
  }

  async accept(requestId: string, userId: string) {
    const request = await this.prisma.directMessageRequest.findUnique({
      where: { id: requestId },
      include: requestInclude
    });

    if (!request) {
      throw new NotFoundException("Message request not found.");
    }

    if (request.recipientUserId !== userId) {
      throw new ForbiddenException("You cannot accept this request.");
    }

    if (request.status !== DirectMessageRequestStatus.PENDING) {
      throw new BadRequestException("This request is no longer pending.");
    }

    const conversation = await this.conversations.create(
      {
        type: ConversationType.DIRECT,
        participantIds: [request.requesterUserId]
      },
      userId
    );

    if (request.initialMessage?.trim()) {
      await this.messages.createForUser(conversation.id, request.requesterUserId, {
        body: request.initialMessage.trim()
      });
    }

    const updatedRequest = await this.prisma.directMessageRequest.update({
      where: { id: request.id },
      data: {
        status: DirectMessageRequestStatus.ACCEPTED,
        respondedAt: new Date(),
        conversationId: conversation.id
      },
      include: requestInclude
    });

    await this.prisma.notification.create({
      data: {
        userId: request.requesterUserId,
        type: "MESSAGE_REQUEST_ACCEPTED",
        contextId: updatedRequest.id,
        title: "Request accepted",
        body: `${request.recipient.displayName} accepted your message request.`
      }
    });

    await this.pushNotifications.notifyUsers([request.requesterUserId], {
      body: `${request.recipient.displayName} accepted your message request.`,
      tag: `message-request-${updatedRequest.id}`,
      title: "Request accepted",
      url: `/?conversationId=${encodeURIComponent(conversation.id)}`
    });

    return {
      request: updatedRequest,
      conversation
    };
  }

  async decline(requestId: string, userId: string) {
    const request = await this.prisma.directMessageRequest.findUnique({
      where: { id: requestId },
      include: requestInclude
    });

    if (!request) {
      throw new NotFoundException("Message request not found.");
    }

    if (request.recipientUserId !== userId) {
      throw new ForbiddenException("You cannot decline this request.");
    }

    if (request.status !== DirectMessageRequestStatus.PENDING) {
      throw new BadRequestException("This request is no longer pending.");
    }

    const updated = await this.prisma.directMessageRequest.update({
      where: { id: request.id },
      data: {
        status: DirectMessageRequestStatus.DECLINED,
        respondedAt: new Date()
      },
      include: requestInclude
    });

    await this.prisma.notification.create({
      data: {
        userId: request.requesterUserId,
        type: "MESSAGE_REQUEST_DECLINED",
        contextId: updated.id,
        title: "Request declined",
        body: `${request.recipient.displayName} declined your message request.`
      }
    });

    await this.pushNotifications.notifyUsers([request.requesterUserId], {
      body: `${request.recipient.displayName} declined your message request.`,
      tag: `message-request-${updated.id}`,
      title: "Request declined",
      url: "/?sidebar=requests"
    });

    return updated;
  }
}
