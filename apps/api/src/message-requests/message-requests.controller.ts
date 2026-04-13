import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { StartMessageRequestDto } from "./dto/start-message-request.dto";
import { MessageRequestsService } from "./message-requests.service";

@ApiTags("message-requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("message-requests")
export class MessageRequestsController {
  constructor(private readonly requests: MessageRequestsService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        incoming: [],
        outgoing: []
      }
    }
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.requests.listForUser(user.id);
  }

  @Post("start")
  @ApiOkResponse({
    schema: {
      example: {
        kind: "request"
      }
    }
  })
  start(@CurrentUser() user: AuthenticatedUser, @Body() body: StartMessageRequestDto) {
    return this.requests.start(user, body);
  }

  @Post(":requestId/accept")
  accept(@CurrentUser() user: AuthenticatedUser, @Param("requestId") requestId: string) {
    return this.requests.accept(requestId, user.id);
  }

  @Post(":requestId/decline")
  decline(@CurrentUser() user: AuthenticatedUser, @Param("requestId") requestId: string) {
    return this.requests.decline(requestId, user.id);
  }
}
