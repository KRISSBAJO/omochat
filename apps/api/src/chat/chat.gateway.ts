import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@omochat/db";
import { Server, Socket } from "socket.io";
import { resolveUserAccess } from "../access/access.utils";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CallsService } from "../calls/calls.service";
import { getAllowedOrigins } from "../config/runtime";
import { ConversationsService } from "../conversations/conversations.service";
import { CreateMessageDto } from "../messages/dto/create-message.dto";
import { MessagesService } from "../messages/messages.service";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

type SocketUser = AuthenticatedUser & {
  userId: string;
};

type AccessTokenPayload = AuthenticatedUser & {
  sub: string;
};

@WebSocketGateway({
  cors: {
    origin: getAllowedOrigins(),
    credentials: true
  }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly onlineUsers = new Map<string, number>();

  constructor(
    private readonly messages: MessagesService,
    private readonly calls: CallsService,
    private readonly conversations: ConversationsService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly safety: SafetyService
  ) {}

  async handleConnection(client: Socket) {
    const token = this.getSocketToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access"
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          userCode: true,
          displayName: true,
          status: true,
          platformRoles: {
            select: {
              role: true
            }
          }
        }
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        client.disconnect(true);
        return;
      }

      client.data.user = {
        userId: user.id,
        id: user.id,
        email: user.email,
        username: user.username,
        userCode: user.userCode,
        displayName: user.displayName,
        access: resolveUserAccess(user)
      } satisfies SocketUser;

      await client.join(`user:${user.id}`);
      this.onlineUsers.set(user.id, (this.onlineUsers.get(user.id) ?? 0) + 1);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() }
      });

      this.server.emit("presence_update", {
        userId: user.id,
        online: true,
        at: new Date().toISOString()
      });

      client.emit("connected", { socketId: client.id, userId: user.id });
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const socketUser = client.data.user as SocketUser | undefined;
    const userId = socketUser?.userId;

    if (!userId) {
      return;
    }

    const nextCount = Math.max((this.onlineUsers.get(userId) ?? 1) - 1, 0);
    if (nextCount === 0) {
      this.onlineUsers.delete(userId);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() }
      });
      this.server.emit("presence_update", {
        userId,
        online: false,
        at: new Date().toISOString()
      });
      return;
    }

    this.onlineUsers.set(userId, nextCount);
  }

  @SubscribeMessage("join_conversation")
  async joinConversation(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    const socketUser = this.requireSocketUser(client);
    const allowed = await this.conversations.isParticipant(conversationId, socketUser.userId);

    if (!allowed) {
      throw new WsException("You are not allowed to join this conversation");
    }

    await client.join(conversationId);
    return { ok: true, conversationId };
  }

  @SubscribeMessage("join_user")
  async joinUser(@ConnectedSocket() client: Socket) {
    const socketUser = this.requireSocketUser(client);
    await client.join(`user:${socketUser.userId}`);
    return { ok: true, userId: socketUser.userId };
  }

  @SubscribeMessage("typing")
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; typing: boolean }
  ) {
    const socketUser = this.requireSocketUser(client);
    const allowed = await this.conversations.isParticipant(payload.conversationId, socketUser.userId);

    if (!allowed) {
      throw new WsException("You are not allowed to publish typing state for this conversation");
    }

    await this.safety.assertConversationMessagingAllowed(payload.conversationId, socketUser.userId);

    client.to(payload.conversationId).emit("typing", {
      conversationId: payload.conversationId,
      userId: socketUser.userId,
      username: socketUser.username,
      userCode: socketUser.userCode ?? null,
      displayName: socketUser.displayName,
      typing: payload.typing
    });
    return { ok: true };
  }

  @SubscribeMessage("read_receipt")
  async readReceipt(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; messageId: string }
  ) {
    const socketUser = this.requireSocketUser(client);
    const message = await this.messages.markRead(payload.conversationId, payload.messageId, socketUser.userId);
    this.broadcastReadReceipt(payload.conversationId, message);
    return { ok: true };
  }

  @SubscribeMessage("send_message")
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; body: string; parentId?: string }
  ) {
    const socketUser = this.requireSocketUser(client);
    const message = await this.messages.createForUser(payload.conversationId, socketUser.userId, payload as CreateMessageDto);
    this.broadcastMessage(payload.conversationId, message);
    return message;
  }

  @SubscribeMessage("call_offer")
  async callOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; conversationId: string; toUserId: string; sdp: Record<string, unknown> }
  ) {
    const socketUser = this.requireSocketUser(client);
    await this.messages.assertCanSignalMessage(payload.conversationId, socketUser.userId);
    await this.calls.assertCallParticipant(payload.callId, socketUser.userId);

    this.server.to(`user:${payload.toUserId}`).emit("call_offer", {
      ...payload,
      fromUserId: socketUser.userId
    });
    return { ok: true };
  }

  @SubscribeMessage("call_answer")
  async callAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; conversationId: string; toUserId: string; sdp: Record<string, unknown> }
  ) {
    const socketUser = this.requireSocketUser(client);
    await this.messages.assertCanSignalMessage(payload.conversationId, socketUser.userId);
    await this.calls.assertCallParticipant(payload.callId, socketUser.userId);

    this.server.to(`user:${payload.toUserId}`).emit("call_answer", {
      ...payload,
      fromUserId: socketUser.userId
    });
    return { ok: true };
  }

  @SubscribeMessage("call_ice_candidate")
  async callIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { callId: string; conversationId: string; toUserId: string; candidate: Record<string, unknown> }
  ) {
    const socketUser = this.requireSocketUser(client);
    await this.messages.assertCanSignalMessage(payload.conversationId, socketUser.userId);
    await this.calls.assertCallParticipant(payload.callId, socketUser.userId);

    this.server.to(`user:${payload.toUserId}`).emit("call_ice_candidate", {
      ...payload,
      fromUserId: socketUser.userId
    });
    return { ok: true };
  }

  @SubscribeMessage("call_hangup")
  async callHangup(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string; conversationId: string }
  ) {
    const socketUser = this.requireSocketUser(client);
    await this.messages.assertCanSignalMessage(payload.conversationId, socketUser.userId);
    await this.calls.assertCallParticipant(payload.callId, socketUser.userId);

    this.server.to(payload.conversationId).emit("call_hangup", {
      callId: payload.callId,
      conversationId: payload.conversationId,
      fromUserId: socketUser.userId
    });
    return { ok: true };
  }

  broadcastMessage(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit("receive_message", message);
  }

  broadcastConversation(userIds: string[], conversation: unknown) {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit("conversation_updated", conversation);
    }
  }

  broadcastReaction(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit("message_reaction", message);
  }

  broadcastReadReceipt(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit("read_receipt", message);
  }

  broadcastMessageUpdated(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit("message_updated", message);
  }

  broadcastStatusUpdate(userIds: string[], payload: unknown) {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit("status_updated", payload);
    }
  }

  broadcastInboxRefresh(userIds: string[]) {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit("inbox_refresh", {
        userId,
        at: new Date().toISOString()
      });
    }
  }

  broadcastCallState(conversationId: string, payload: unknown) {
    this.server.to(conversationId).emit("call_state", payload);
  }

  private getSocketToken(client: Socket) {
    const authToken = typeof client.handshake.auth?.token === "string" ? client.handshake.auth.token : undefined;
    if (authToken) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (!header) {
      return undefined;
    }

    const [type, token] = header.split(" ");
    return type?.toLowerCase() === "bearer" ? token : undefined;
  }

  private requireSocketUser(client: Socket) {
    const socketUser = client.data.user as SocketUser | undefined;
    if (!socketUser) {
      throw new WsException("Missing authenticated socket user");
    }

    return socketUser;
  }
}
