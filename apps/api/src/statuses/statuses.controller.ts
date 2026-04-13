import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ChatGateway } from "../chat/chat.gateway";
import { CreateStatusCommentDto } from "./dto/create-status-comment.dto";
import { CreateStatusDto } from "./dto/create-status.dto";
import { ModerateStatusDto } from "./dto/moderate-status.dto";
import { ToggleStatusReactionDto } from "./dto/toggle-status-reaction.dto";
import { StatusesService } from "./statuses.service";

@ApiTags("statuses")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("statuses")
export class StatusesController {
  constructor(
    private readonly statuses: StatusesService,
    private readonly chatGateway: ChatGateway
  ) {}

  @Get("feed")
  @ApiOkResponse({ description: "Statuses from you and people you already share chats with." })
  feed(@CurrentUser() user: AuthenticatedUser) {
    return this.statuses.getFeed(user);
  }

  @Post()
  @ApiCreatedResponse({ description: "Create a text, image, or video status." })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateStatusDto) {
    const result = await this.statuses.createStatus(user, body);
    this.chatGateway.broadcastStatusUpdate(result.broadcastUserIds, {
      ownerUserId: user.id,
      statusId: result.status.id
    });
    return result.status;
  }

  @Get(":statusId")
  @ApiParam({ name: "statusId", example: "f83a19c9-3d94-4ed9-98f8-8f9cd90ef4d4" })
  @ApiOkResponse({ description: "Get one status with viewers, reactions, and comments when allowed." })
  detail(@CurrentUser() user: AuthenticatedUser, @Param("statusId") statusId: string) {
    return this.statuses.getStatusDetail(statusId, user);
  }

  @Post(":statusId/views")
  @ApiParam({ name: "statusId", example: "f83a19c9-3d94-4ed9-98f8-8f9cd90ef4d4" })
  @ApiOkResponse({ description: "Mark a status as viewed." })
  async markViewed(@CurrentUser() user: AuthenticatedUser, @Param("statusId") statusId: string) {
    const result = await this.statuses.markViewed(statusId, user);
    this.chatGateway.broadcastStatusUpdate(result.broadcastUserIds, {
      ownerUserId: result.status.owner.id,
      statusId
    });
    return result.status;
  }

  @Post(":statusId/reactions")
  @ApiParam({ name: "statusId", example: "f83a19c9-3d94-4ed9-98f8-8f9cd90ef4d4" })
  @ApiOkResponse({ description: "Toggle a quick reaction on a status." })
  async toggleReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param("statusId") statusId: string,
    @Body() body: ToggleStatusReactionDto
  ) {
    const result = await this.statuses.toggleReaction(statusId, user, body.emoji);
    this.chatGateway.broadcastStatusUpdate(result.broadcastUserIds, {
      ownerUserId: result.status.owner.id,
      statusId
    });
    if (result.mirroredConversationId && result.mirroredMessage) {
      if (result.mirroredMessageAction === "created") {
        this.chatGateway.broadcastMessage(result.mirroredConversationId, result.mirroredMessage);
      } else {
        this.chatGateway.broadcastMessageUpdated(result.mirroredConversationId, result.mirroredMessage);
      }
      this.chatGateway.broadcastInboxRefresh(result.inboxUserIds);
    }
    return result.status;
  }

  @Post(":statusId/comments")
  @ApiParam({ name: "statusId", example: "f83a19c9-3d94-4ed9-98f8-8f9cd90ef4d4" })
  @ApiOkResponse({ description: "Reply to a status and mirror it into direct chat." })
  async comment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("statusId") statusId: string,
    @Body() body: CreateStatusCommentDto
  ) {
    const result = await this.statuses.addComment(statusId, user, body);
    this.chatGateway.broadcastStatusUpdate(result.broadcastUserIds, {
      ownerUserId: result.status.owner.id,
      statusId
    });
    if (result.mirroredConversationId && result.mirroredMessage) {
      this.chatGateway.broadcastMessage(result.mirroredConversationId, result.mirroredMessage);
      this.chatGateway.broadcastInboxRefresh(result.inboxUserIds);
    }
    return result.status;
  }

  @Patch(":statusId/moderation")
  @ApiParam({ name: "statusId", example: "f83a19c9-3d94-4ed9-98f8-8f9cd90ef4d4" })
  @ApiOkResponse({ description: "Adjust status lifetime or take it down from moderation." })
  async moderate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("statusId") statusId: string,
    @Body() body: ModerateStatusDto
  ) {
    const result = await this.statuses.moderateStatus(statusId, user, body);
    this.chatGateway.broadcastStatusUpdate(result.broadcastUserIds, {
      ownerUserId: result.status.owner.id,
      statusId
    });
    return result.status;
  }

  @Delete(":statusId")
  @ApiParam({ name: "statusId", example: "f83a19c9-3d94-4ed9-98f8-8f9cd90ef4d4" })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("statusId") statusId: string) {
    const result = await this.statuses.deleteOwnStatus(statusId, user);
    this.chatGateway.broadcastStatusUpdate(result.broadcastUserIds, {
      ownerUserId: user.id,
      statusId
    });
    return { ok: true };
  }
}
