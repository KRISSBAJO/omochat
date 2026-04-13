import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHmac } from "crypto";
import { CallStatus, CallType, Prisma } from "@omochat/db";
import { PushNotificationsService } from "../notifications/push-notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const callInclude = {
  startedBy: {
    select: {
      id: true,
      username: true,
      userCode: true,
      displayName: true,
      avatarUrl: true
    }
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          userCode: true,
          displayName: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { userId: "asc" as const }
  }
} satisfies Prisma.CallInclude;

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushNotifications: PushNotificationsService
  ) {}

  getRtcConfig(userId?: string) {
    const stunUrls = [process.env.STUN1?.trim(), process.env.STUN2?.trim()].filter(Boolean) as string[];
    const derivedTurnUrl =
      !process.env.TURN_URI?.trim() && process.env.ANNOUNCED_IP?.trim()
        ? `turn:${process.env.ANNOUNCED_IP.trim()}:${process.env.TURN_PORT?.trim() || "3478"}`
        : null;
    const turnUrls = [process.env.TURN_URI?.trim(), process.env.TURN_TLS_URI?.trim(), derivedTurnUrl].filter(Boolean) as string[];
    const turnCredentials = this.resolveTurnCredentials(userId);

    const iceServers: Array<{ credential?: string; urls: string | string[]; username?: string }> = [];

    if (stunUrls.length > 0) {
      iceServers.push({
        urls: stunUrls
      });
    }

    if (turnUrls.length > 0 && turnCredentials) {
      iceServers.push({
        credential: turnCredentials.credential,
        urls: turnUrls,
        username: turnCredentials.username
      });
    }

    if (iceServers.length === 0) {
      iceServers.push({
        urls: ["stun:stun.l.google.com:19302"]
      });
    }

    return {
      credentialExpiresAt: turnCredentials?.expiresAt ?? null,
      iceServers
    };
  }

  async listForConversation(conversationId: string, userId: string) {
    await this.assertConversationParticipant(conversationId, userId);

    return this.prisma.call.findMany({
      where: {
        conversationId
      },
      include: callInclude,
      orderBy: [{ startedAt: "desc" }],
      take: 50
    });
  }

  async start(conversationId: string, userId: string, type: CallType) {
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

    if (!conversation.participants.some((participant) => participant.userId === userId)) {
      throw new ForbiddenException("You are not a participant in this conversation.");
    }

    const activeCall = await this.prisma.call.findFirst({
      where: {
        conversationId,
        status: {
          in: [CallStatus.RINGING, CallStatus.ANSWERED]
        }
      },
      include: callInclude
    });

    if (activeCall) {
      return activeCall;
    }

    const call = await this.prisma.call.create({
      data: {
        conversationId,
        startedById: userId,
        type,
        status: CallStatus.RINGING,
        participants: {
          create: conversation.participants.map((participant) => ({
            userId: participant.userId,
            joinedAt: participant.userId === userId ? new Date() : null
          }))
        }
      },
      include: callInclude
    });

    const now = new Date();
    await this.prisma.notification.createMany({
      data: conversation.participants
        .filter((participant) => participant.userId !== userId)
        .map((participant) => ({
          userId: participant.userId,
          type: "CALL_RINGING",
          contextId: call.id,
          title: `${call.startedBy?.displayName ?? "Someone"} is calling`,
          body: `${type === CallType.VIDEO ? "Video" : "Voice"} call started in one of your conversations.`,
          status: "SENT" as const,
          sentAt: now
        }))
    });

    await this.pushNotifications.notifyUsers(
      conversation.participants.filter((participant) => participant.userId !== userId).map((participant) => participant.userId),
      {
        body: `${call.startedBy?.displayName ?? "Someone"} started a ${type === CallType.VIDEO ? "video" : "voice"} call.`,
        tag: `call-${call.id}`,
        title: `${call.startedBy?.displayName ?? "Someone"} is calling`,
        url: `/?conversationId=${encodeURIComponent(call.conversationId)}&callId=${encodeURIComponent(call.id)}&callAction=incoming`
      }
    );

    return call;
  }

  async accept(callId: string, userId: string) {
    const call = await this.assertCallParticipant(callId, userId);

    if (call.status !== CallStatus.RINGING && call.status !== CallStatus.ANSWERED) {
      throw new BadRequestException("This call is no longer active.");
    }

    await this.prisma.callParticipant.updateMany({
      where: {
        callId,
        userId
      },
      data: {
        joinedAt: new Date(),
        leftAt: null
      }
    });

    return this.prisma.call.update({
      where: { id: callId },
      data: {
        status: CallStatus.ANSWERED
      },
      include: callInclude
    });
  }

  async end(callId: string, userId: string) {
    const existingCall = await this.assertCallParticipant(callId, userId);

    const now = new Date();
    await this.prisma.callParticipant.updateMany({
      where: {
        callId,
        userId,
        leftAt: null
      },
      data: {
        leftAt: now
      }
    });

    const joinedParticipants = existingCall.participants.filter((participant) => participant.joinedAt);
    const finalStatus = existingCall.status === CallStatus.RINGING && joinedParticipants.length <= 1
      ? CallStatus.MISSED
      : CallStatus.ENDED;

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: finalStatus,
        endedAt: now
      },
      include: callInclude
    });

    if (finalStatus === CallStatus.MISSED) {
      const starterName = updated.startedBy?.displayName ?? "Someone";
      const missedRecipients = updated.participants.filter(
        (participant) => participant.userId !== userId && !participant.joinedAt
      );

      if (missedRecipients.length > 0) {
        await this.prisma.notification.createMany({
          data: missedRecipients.map((participant) => ({
            userId: participant.userId,
            type: "CALL_MISSED",
            contextId: updated.id,
            title: `Missed ${updated.type === CallType.VIDEO ? "video" : "voice"} call`,
            body: `${starterName} tried to reach you in a conversation.`,
            status: "SENT" as const,
            sentAt: now
          }))
        });

        await this.pushNotifications.notifyUsers(
          missedRecipients.map((participant) => participant.userId),
          {
            body: `${starterName} tried to reach you in a conversation.`,
            tag: `call-missed-${updated.id}`,
            title: `Missed ${updated.type === CallType.VIDEO ? "video" : "voice"} call`,
            url: `/?conversationId=${encodeURIComponent(updated.conversationId)}&callId=${encodeURIComponent(updated.id)}&callAction=missed`
          }
        );
      }
    }

    return updated;
  }

  async assertCallParticipant(callId: string, userId: string) {
    const call = await this.prisma.call.findFirst({
      where: {
        id: callId,
        conversation: {
          participants: {
            some: {
              userId,
              leftAt: null
            }
          }
        }
      },
      include: callInclude
    });

    if (!call) {
      throw new NotFoundException("Call not found.");
    }

    return call;
  }

  private async assertConversationParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null
      },
      select: { id: true }
    });

    if (!participant) {
      throw new ForbiddenException("You are not a participant in this conversation.");
    }
  }

  private resolveTurnCredentials(userId?: string) {
    const sharedSecret = process.env.TURN_SHARED_SECRET?.trim();
    const ttlSeconds = Math.max(60, Number(process.env.TURN_CREDENTIAL_TTL_SECONDS?.trim() || "3600"));

    if (sharedSecret && userId) {
      const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
      const username = `${expiresAt}:${userId}`;
      const credential = createHmac("sha1", sharedSecret).update(username).digest("base64");

      return {
        credential,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        username
      };
    }

    const username = process.env.TURN_USER?.trim();
    const credential = process.env.TURN_PASS?.trim();

    if (!username || !credential) {
      return null;
    }

    return {
      credential,
      expiresAt: null,
      username
    };
  }
}
