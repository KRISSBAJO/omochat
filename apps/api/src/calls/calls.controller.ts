import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ChatGateway } from "../chat/chat.gateway";
import { StartCallDto } from "./dto/start-call.dto";
import { Body } from "@nestjs/common";
import { CallsService } from "./calls.service";

@ApiTags("calls")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CallsController {
  constructor(
    private readonly calls: CallsService,
    private readonly chatGateway: ChatGateway
  ) {}

  @Get("conversations/:conversationId/calls")
  @ApiOkResponse({ description: "List call history for a conversation." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string
  ) {
    return this.calls.listForConversation(conversationId, user.id);
  }

  @Get("calls/rtc-config")
  @ApiOkResponse({ description: "Resolve RTC ICE configuration for browser calls." })
  rtcConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.calls.getRtcConfig(user.id);
  }

  @Post("conversations/:conversationId/calls")
  @ApiOkResponse({ description: "Start or resume an active call in a conversation." })
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: StartCallDto
  ) {
    const call = await this.calls.start(conversationId, user.id, body.type);
    this.chatGateway.broadcastCallState(conversationId, {
      event: "started",
      call
    });
    return call;
  }

  @Post("calls/:callId/accept")
  @ApiOkResponse({ description: "Accept an incoming call." })
  async accept(@CurrentUser() user: AuthenticatedUser, @Param("callId") callId: string) {
    const call = await this.calls.accept(callId, user.id);
    this.chatGateway.broadcastCallState(call.conversationId, {
      event: "accepted",
      call
    });
    return call;
  }

  @Post("calls/:callId/end")
  @ApiOkResponse({ description: "End an active call." })
  async end(@CurrentUser() user: AuthenticatedUser, @Param("callId") callId: string) {
    const call = await this.calls.end(callId, user.id);
    this.chatGateway.broadcastCallState(call.conversationId, {
      event: "ended",
      call
    });
    return call;
  }
}
