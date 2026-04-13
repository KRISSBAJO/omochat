import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ChatGateway } from "../chat/chat.gateway";
import { ConversationsService } from "./conversations.service";
import { AddConversationMembersDto } from "./dto/add-conversation-members.dto";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ListConversationsQueryDto } from "./dto/list-conversations-query.dto";
import { ReportConversationDto } from "./dto/report-conversation.dto";
import { TransferConversationOwnershipDto } from "./dto/transfer-conversation-ownership.dto";
import { UpdateConversationStateDto } from "./dto/update-conversation-state.dto";
import { UpdateConversationMemberRoleDto } from "./dto/update-conversation-member-role.dto";

@ApiTags("conversations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("conversations")
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly chatGateway: ChatGateway
  ) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: "a8f68c4c-232c-4925-8bc7-bf740f3441e3",
          type: "GROUP",
          title: "Omochat Launch Room",
          lastMessageAt: "2026-04-10T16:44:00.000Z"
        }
      ]
    }
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListConversationsQueryDto) {
    return this.conversations.listForUser(user.id, query);
  }

  @Post()
  @ApiCreatedResponse({
    schema: {
      example: {
        id: "a8f68c4c-232c-4925-8bc7-bf740f3441e3",
        type: "GROUP",
        title: "Omochat Launch Room",
        participants: [
          {
            userId: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
            role: "OWNER",
            user: {
              id: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
              username: "mira",
              userCode: "23yg2",
              displayName: "Mira Stone",
              avatarUrl: null,
              lastSeenAt: null
            }
          }
        ]
      }
    }
  })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateConversationDto) {
    const conversation = await this.conversations.create(body, user.id);
    this.chatGateway.broadcastConversation(conversation.participants.map((participant) => participant.userId), conversation);
    return conversation;
  }

  @Patch(":conversationId/state")
  @ApiOkResponse({
    schema: {
      example: {
        id: "a8f68c4c-232c-4925-8bc7-bf740f3441e3",
        unreadCount: 2,
        participantState: {
          pinnedAt: "2026-04-10T18:00:00.000Z",
          archivedAt: null,
          lockedAt: null,
          mutedUntil: null,
          lastReadAt: "2026-04-10T17:30:00.000Z",
          lastReadMessageId: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5"
        }
      }
    }
  })
  async updateState(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: UpdateConversationStateDto
  ) {
    return this.conversations.updateState(conversationId, user.id, body);
  }

  @Post(":conversationId/members")
  @ApiCreatedResponse({ description: "Add one or more members into a group or channel." })
  async addMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: AddConversationMembersDto
  ) {
    const conversation = await this.conversations.addMembers(conversationId, user.id, body);
    this.chatGateway.broadcastConversation(conversation.participants.map((participant) => participant.userId), conversation);
    return conversation;
  }

  @Patch(":conversationId/members/:memberUserId")
  @ApiOkResponse({ description: "Promote or demote a group member." })
  async updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("memberUserId") memberUserId: string,
    @Body() body: UpdateConversationMemberRoleDto
  ) {
    const conversation = await this.conversations.updateMemberRole(conversationId, user.id, memberUserId, body);
    this.chatGateway.broadcastConversation(conversation.participants.map((participant) => participant.userId), conversation);
    return conversation;
  }

  @Post(":conversationId/ownership")
  @ApiOkResponse({ description: "Transfer group or channel ownership to another active member." })
  async transferOwnership(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: TransferConversationOwnershipDto
  ) {
    const conversation = await this.conversations.transferOwnership(conversationId, user.id, body.memberUserId);
    this.chatGateway.broadcastConversation(conversation.participants.map((participant) => participant.userId), conversation);
    return conversation;
  }

  @Post(":conversationId/invite-link")
  @ApiOkResponse({ description: "Create or return the active invite link for this group or channel." })
  createInviteLink(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string) {
    return this.conversations.createInviteLink(conversationId, user.id);
  }

  @Post("join/:inviteCode")
  @ApiCreatedResponse({ description: "Join a group or channel from an invite link." })
  async joinByInvite(@CurrentUser() user: AuthenticatedUser, @Param("inviteCode") inviteCode: string) {
    const conversation = await this.conversations.joinByInvite(inviteCode, user.id);
    this.chatGateway.broadcastConversation(conversation.participants.map((participant) => participant.userId), conversation);
    return conversation;
  }

  @Post(":conversationId/leave")
  @ApiOkResponse({ description: "Leave a group or channel." })
  async leave(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string) {
    const participantIds = (await this.conversations.assertParticipantMembership(conversationId, user.id)).conversation.participants.map(
      (participant) => participant.userId
    );
    const result = await this.conversations.leaveConversation(conversationId, user.id);
    this.chatGateway.broadcastConversation([...participantIds, user.id], { conversationId });
    return result;
  }

  @Delete(":conversationId")
  @ApiOkResponse({ schema: { example: { ok: true } }, description: "Delete an entire group or channel." })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string) {
    const participantIds = (await this.conversations.assertParticipantMembership(conversationId, user.id)).conversation.participants.map(
      (participant) => participant.userId
    );
    const result = await this.conversations.deleteConversation(conversationId, user.id);
    this.chatGateway.broadcastConversation([...participantIds, user.id], { conversationId });
    return result;
  }

  @Post(":conversationId/report")
  @ApiCreatedResponse({ description: "Report a group or channel for moderation review." })
  reportConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: ReportConversationDto
  ) {
    return this.conversations.reportConversation(conversationId, user, body);
  }
}
