import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ListAdminReportsQueryDto } from "./dto/list-admin-reports-query.dto";
import { ReportUserDto } from "./dto/report-user.dto";
import { ReviewReportDto } from "./dto/review-report.dto";
import { SafetyService } from "./safety.service";

@ApiTags("safety")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("safety")
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Get("blocks")
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: "6c98a40b-4c89-42bb-b9c2-8f3d7b1f4380",
          createdAt: "2026-04-11T15:00:00.000Z",
          user: {
            id: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
            username: "mira",
            userCode: "23yg2",
            displayName: "Mira Stone",
            avatarUrl: null
          }
        }
      ]
    }
  })
  listBlocked(@CurrentUser() user: AuthenticatedUser) {
    return this.safety.listBlockedUsers(user.id);
  }

  @Post("blocks/:targetUserId")
  @ApiParam({ name: "targetUserId", example: "5bf7d271-950a-4ef6-a028-1d447e552a7d" })
  block(@CurrentUser() user: AuthenticatedUser, @Param("targetUserId") targetUserId: string) {
    return this.safety.blockUser(user.id, targetUserId);
  }

  @Delete("blocks/:targetUserId")
  @ApiParam({ name: "targetUserId", example: "5bf7d271-950a-4ef6-a028-1d447e552a7d" })
  unblock(@CurrentUser() user: AuthenticatedUser, @Param("targetUserId") targetUserId: string) {
    return this.safety.unblockUser(user.id, targetUserId);
  }

  @Post("reports")
  report(@CurrentUser() user: AuthenticatedUser, @Body() body: ReportUserDto) {
    return this.safety.reportUser(user.id, body);
  }

  @Get("reports/admin")
  @ApiOkResponse({ description: "List reports for moderation review." })
  listReports(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAdminReportsQueryDto) {
    return this.safety.listReportsForModeration(user, query);
  }

  @Get("moderators")
  @ApiOkResponse({ description: "List moderators that can be assigned to reports." })
  listModerators(@CurrentUser() user: AuthenticatedUser) {
    return this.safety.listModerators(user);
  }

  @Patch("reports/:reportId")
  @ApiParam({ name: "reportId", example: "6c98a40b-4c89-42bb-b9c2-8f3d7b1f4380" })
  @ApiOkResponse({ description: "Assign, annotate, review, or dismiss a report." })
  reviewReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string,
    @Body() body: ReviewReportDto
  ) {
    return this.safety.reviewReport(user, reportId, body);
  }
}
