import { Controller, Get, Param, Patch, Query, UseGuards, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { AdminService } from "./admin.service";
import { ListAdminStatusesQueryDto } from "./dto/list-admin-statuses-query.dto";
import { ListAdminUsersQueryDto } from "./dto/list-admin-users-query.dto";
import { UpdateAdminUserRolesDto } from "./dto/update-admin-user-roles.dto";
import { UpdateAdminUserStatusDto } from "./dto/update-admin-user-status.dto";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  @ApiOkResponse({ description: "Top-level site admin counts." })
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.getOverview(user);
  }

  @Get("users")
  @ApiOkResponse({ description: "Search and review platform users." })
  listUsers(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAdminUsersQueryDto) {
    return this.admin.listUsers(user, query);
  }

  @Get("statuses")
  @ApiOkResponse({ description: "Search live, removed, or expired statuses without paging through the full user directory." })
  listStatuses(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAdminStatusesQueryDto) {
    return this.admin.listStatuses(user, query);
  }

  @Get("actions")
  @ApiOkResponse({ description: "Recent site admin actions." })
  listRecentActions(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.listRecentActions(user);
  }

  @Patch("users/:userId/status")
  @ApiParam({ name: "userId", example: "5bf7d271-950a-4ef6-a028-1d447e552a7d" })
  @ApiOkResponse({ description: "Suspend or reactivate a user." })
  updateUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() body: UpdateAdminUserStatusDto
  ) {
    return this.admin.updateUserStatus(user, userId, body);
  }

  @Patch("users/:userId/roles")
  @ApiParam({ name: "userId", example: "5bf7d271-950a-4ef6-a028-1d447e552a7d" })
  @ApiOkResponse({ description: "Assign platform roles to a user." })
  updateUserRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() body: UpdateAdminUserRolesDto
  ) {
    return this.admin.updateUserRoles(user, userId, body);
  }
}
