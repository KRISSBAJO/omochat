import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ChatGateway } from "../chat/chat.gateway";
import { CreateAttachmentMessageDto } from "./dto/create-attachment-message.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { ListMessagesQueryDto } from "./dto/list-messages-query.dto";
import { MarkReadDto } from "./dto/mark-read.dto";
import { PrepareAttachmentUploadDto } from "./dto/prepare-attachment-upload.dto";
import { ToggleReactionDto } from "./dto/toggle-reaction.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { MessagesService } from "./messages.service";

@ApiTags("messages")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("conversations/:conversationId/messages")
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly chatGateway: ChatGateway
  ) {}

  @Get()
  @ApiParam({ name: "conversationId", example: "a8f68c4c-232c-4925-8bc7-bf740f3441e3" })
  @ApiOkResponse({ description: "List messages in a conversation." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Query() query: ListMessagesQueryDto
  ) {
    return this.messages.listForConversation(conversationId, user.id, query);
  }

  @Post()
  @ApiParam({ name: "conversationId", example: "a8f68c4c-232c-4925-8bc7-bf740f3441e3" })
  @ApiCreatedResponse({ description: "Create a text message." })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateMessageDto
  ) {
    const message = await this.messages.createForUser(conversationId, user.id, body);
    this.chatGateway.broadcastMessage(conversationId, message);
    return message;
  }

  @Post("attachments/presign")
  @ApiCreatedResponse({ description: "Prepare a presigned S3 upload target." })
  prepareAttachmentUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: PrepareAttachmentUploadDto
  ) {
    return this.messages.prepareAttachmentUpload(conversationId, user.id, body);
  }

  @Post("attachments")
  @ApiCreatedResponse({ description: "Create a message that carries uploaded or remote media." })
  async createAttachmentMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateAttachmentMessageDto
  ) {
    const message = await this.messages.createAttachmentMessageForUser(conversationId, user.id, body);
    this.chatGateway.broadcastMessage(conversationId, message);
    return message;
  }

  @Patch(":messageId")
  @ApiOkResponse({ description: "Edit your own message." })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("messageId") messageId: string,
    @Body() body: UpdateMessageDto
  ) {
    const message = await this.messages.updateMessage(conversationId, messageId, user.id, body);
    this.chatGateway.broadcastMessageUpdated(conversationId, message);
    return message;
  }

  @Delete(":messageId")
  @ApiOkResponse({ description: "Soft delete your own message." })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("messageId") messageId: string
  ) {
    const message = await this.messages.deleteMessage(conversationId, messageId, user.id);
    this.chatGateway.broadcastMessageUpdated(conversationId, message);
    return message;
  }

  @Post(":messageId/reactions")
  @ApiParam({ name: "conversationId", example: "a8f68c4c-232c-4925-8bc7-bf740f3441e3" })
  @ApiParam({ name: "messageId", example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5" })
  @ApiOkResponse({ description: "Toggle a reaction on a message." })
  async toggleReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("messageId") messageId: string,
    @Body() body: ToggleReactionDto
  ) {
    const message = await this.messages.toggleReaction(conversationId, messageId, user.id, body.emoji);
    this.chatGateway.broadcastReaction(conversationId, message);
    return message;
  }

  @Post("read")
  @ApiParam({ name: "conversationId", example: "a8f68c4c-232c-4925-8bc7-bf740f3441e3" })
  @ApiOkResponse({ description: "Mark the latest or specified message as read." })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: MarkReadDto
  ) {
    const messageId = body.messageId ?? (await this.messages.latestReadableMessageId(conversationId, user.id));
    if (!messageId) {
      return { ok: true, messageId: null };
    }

    const message = await this.messages.markRead(conversationId, messageId, user.id);
    this.chatGateway.broadcastReadReceipt(conversationId, message);
    return message;
  }
}
