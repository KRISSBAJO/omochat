import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { UpdateMeDto } from "./dto/update-me.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiOkResponse({
    schema: {
      example: {
        id: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
        email: "mira@omochat.local",
        username: "mira",
        userCode: "23yg2",
        displayName: "Mira Stone",
        avatarUrl: null,
        statusMessage: "Available for calls after 4 PM",
        bio: "Builder and chat operator.",
        addressLine1: "18 Market Street",
        city: "Nashville",
        stateRegion: "Tennessee",
        countryCode: "US",
        phoneNumber: "+16155543592",
        phoneVerifiedAt: "2026-05-10T17:00:00.000Z",
        dmPolicy: "OPEN",
        status: "ACTIVE",
        access: {
          isModerator: true,
          isPlatformAdmin: true,
          isSiteAdmin: true
        },
        lastSeenAt: null,
        createdAt: "2026-04-10T17:00:00.000Z"
      }
    }
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getMe(user.id);
  }

  @Patch("me")
  @ApiOkResponse({
    schema: {
      example: {
        id: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
        email: "mira@omochat.local",
        username: "mira",
        userCode: "23yg2",
        displayName: "Mira Stone",
        avatarUrl: "https://images.example.com/mira.png",
        statusMessage: "Available for calls after 4 PM",
        bio: "Builder and chat operator.",
        addressLine1: "18 Market Street",
        city: "Nashville",
        stateRegion: "Tennessee",
        countryCode: "US",
        phoneNumber: "+16155543592",
        phoneVerifiedAt: "2026-05-10T17:00:00.000Z",
        dmPolicy: "REQUESTS_ONLY",
        status: "ACTIVE",
        access: {
          isModerator: true,
          isPlatformAdmin: true,
          isSiteAdmin: true
        }
      }
    }
  })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateMeDto) {
    return this.users.updateMe(user.id, body);
  }

  @Get("search")
  @ApiQuery({ name: "q", example: "@23yg2", description: "Search by username, short code, verified phone, email, or display name." })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
          username: "mira",
          userCode: "23yg2",
          displayName: "Mira Stone",
          avatarUrl: null,
          lastSeenAt: "2026-04-10T17:00:00.000Z",
          dmPolicy: "REQUESTS_ONLY"
        }
      ]
    }
  })
  search(@CurrentUser() user: AuthenticatedUser, @Query("q") query = "") {
    return this.users.search(query, user.id);
  }
}
