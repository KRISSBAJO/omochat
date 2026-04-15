import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ToolsService } from "./tools.service";
import {
  AdjustConversationAttendanceLeaveBalanceDto,
  AddConversationBoardMemberDto,
  ApplyConversationAttendanceAccrualDto,
  CreateConversationAttendanceAssignmentDto,
  CreateConversationAttendanceClockEventDto,
  CreateConversationAttendanceHolidayDto,
  CreateConversationAttendanceLeavePolicyDto,
  CreateConversationAttendanceLeaveRequestDto,
  CreateConversationAttendanceRotaRunDto,
  CreateConversationAttendanceShiftDto,
  CreateConversationAttendanceShiftTemplateDto,
  CreateConversationBoardColumnDto,
  CreateConversationBoardDto,
  CreateConversationBoardSprintDto,
  CreateConversationPrayerRequestDto,
  CreateConversationPrayerUpdateDto,
  CreateConversationToolTaskAttachmentDto,
  CreateConversationToolTaskCommentDto,
  CreateConversationToolNoteDto,
  CreateConversationToolPollDto,
  CreateConversationToolRequestDto,
  CreateConversationToolTaskDto,
  CreateConversationToolTaskFromMessageDto,
  ListConversationAttendanceExportQueryDto,
  ListAdminToolRequestsQueryDto,
  ReviewConversationAttendanceLeaveRequestDto,
  ReviewConversationToolRequestDto,
  ReviewConversationAttendanceRecordDto,
  UpdateConversationAttendanceHolidayDto,
  UpdateConversationAttendanceLeavePolicyDto,
  UpdateConversationAttendancePolicyDto,
  UpdateConversationAttendanceAssignmentDto,
  UpdateConversationAttendanceShiftDto,
  UpdateConversationAttendanceShiftTemplateDto,
  UpdateConversationBoardColumnDto,
  UpdateConversationBoardDto,
  UpdateConversationBoardMemberDto,
  UpdateConversationBoardSprintDto,
  UpdateConversationPrayerRequestDto,
  UpdateConversationToolNoteDto,
  UpdateConversationToolPollDto,
  UpdateConversationToolTaskDto,
  VoteConversationToolPollDto
} from "./tools.dto";

@ApiTags("tools")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get("conversations/:conversationId/tools")
  @ApiOkResponse({ description: "Return the enabled tool packs, request state, and live room tools workspace." })
  getWorkspace(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string) {
    return this.tools.getWorkspace(conversationId, user.id);
  }

  @Post("conversations/:conversationId/tools/requests")
  @ApiCreatedResponse({ description: "Request site-admin activation for a tool pack in this room." })
  requestPack(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationToolRequestDto
  ) {
    return this.tools.requestPack(conversationId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/boards")
  createBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationBoardDto
  ) {
    return this.tools.createBoard(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/boards/:boardId")
  updateBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Body() body: UpdateConversationBoardDto
  ) {
    return this.tools.updateBoard(conversationId, boardId, user.id, body);
  }

  @Delete("conversations/:conversationId/tools/boards/:boardId")
  deleteBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string
  ) {
    return this.tools.deleteBoard(conversationId, boardId, user.id);
  }

  @Post("conversations/:conversationId/tools/boards/:boardId/members")
  addBoardMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Body() body: AddConversationBoardMemberDto
  ) {
    return this.tools.addBoardMember(conversationId, boardId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/boards/:boardId/members/:memberUserId")
  updateBoardMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Param("memberUserId") memberUserId: string,
    @Body() body: UpdateConversationBoardMemberDto
  ) {
    return this.tools.updateBoardMember(conversationId, boardId, memberUserId, user.id, body);
  }

  @Delete("conversations/:conversationId/tools/boards/:boardId/members/:memberUserId")
  removeBoardMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Param("memberUserId") memberUserId: string
  ) {
    return this.tools.removeBoardMember(conversationId, boardId, memberUserId, user.id);
  }

  @Post("conversations/:conversationId/tools/boards/:boardId/columns")
  createBoardColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Body() body: CreateConversationBoardColumnDto
  ) {
    return this.tools.createBoardColumn(conversationId, boardId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/boards/:boardId/columns/:columnId")
  updateBoardColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Param("columnId") columnId: string,
    @Body() body: UpdateConversationBoardColumnDto
  ) {
    return this.tools.updateBoardColumn(conversationId, boardId, columnId, user.id, body);
  }

  @Delete("conversations/:conversationId/tools/boards/:boardId/columns/:columnId")
  deleteBoardColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Param("columnId") columnId: string
  ) {
    return this.tools.deleteBoardColumn(conversationId, boardId, columnId, user.id);
  }

  @Post("conversations/:conversationId/tools/boards/:boardId/sprints")
  createBoardSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Body() body: CreateConversationBoardSprintDto
  ) {
    return this.tools.createBoardSprint(conversationId, boardId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/boards/:boardId/sprints/:sprintId")
  updateBoardSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Param("sprintId") sprintId: string,
    @Body() body: UpdateConversationBoardSprintDto
  ) {
    return this.tools.updateBoardSprint(conversationId, boardId, sprintId, user.id, body);
  }

  @Delete("conversations/:conversationId/tools/boards/:boardId/sprints/:sprintId")
  deleteBoardSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("boardId") boardId: string,
    @Param("sprintId") sprintId: string
  ) {
    return this.tools.deleteBoardSprint(conversationId, boardId, sprintId, user.id);
  }

  @Post("conversations/:conversationId/tools/attendance/templates")
  createAttendanceTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationAttendanceShiftTemplateDto
  ) {
    return this.tools.createAttendanceTemplate(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/attendance/templates/:templateId")
  updateAttendanceTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("templateId") templateId: string,
    @Body() body: UpdateConversationAttendanceShiftTemplateDto
  ) {
    return this.tools.updateAttendanceTemplate(conversationId, templateId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/shifts")
  createAttendanceShift(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationAttendanceShiftDto
  ) {
    return this.tools.createAttendanceShift(conversationId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/rota-runs")
  createAttendanceRotaRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationAttendanceRotaRunDto
  ) {
    return this.tools.createAttendanceRotaRun(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/attendance/shifts/:shiftId")
  updateAttendanceShift(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("shiftId") shiftId: string,
    @Body() body: UpdateConversationAttendanceShiftDto
  ) {
    return this.tools.updateAttendanceShift(conversationId, shiftId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/shifts/:shiftId/assignments")
  createAttendanceAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("shiftId") shiftId: string,
    @Body() body: CreateConversationAttendanceAssignmentDto
  ) {
    return this.tools.createAttendanceAssignment(conversationId, shiftId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/attendance/shifts/:shiftId/assignments/:assignmentId")
  updateAttendanceAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("shiftId") shiftId: string,
    @Param("assignmentId") assignmentId: string,
    @Body() body: UpdateConversationAttendanceAssignmentDto
  ) {
    return this.tools.updateAttendanceAssignment(conversationId, shiftId, assignmentId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/shifts/:shiftId/clock")
  createAttendanceClockEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("shiftId") shiftId: string,
    @Body() body: CreateConversationAttendanceClockEventDto
  ) {
    return this.tools.createAttendanceClockEvent(conversationId, shiftId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/attendance/records/:recordId/review")
  reviewAttendanceRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("recordId") recordId: string,
    @Body() body: ReviewConversationAttendanceRecordDto
  ) {
    return this.tools.reviewAttendanceRecord(conversationId, recordId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/attendance/policy")
  upsertAttendancePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: UpdateConversationAttendancePolicyDto
  ) {
    return this.tools.upsertAttendancePolicy(conversationId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/leave-policies")
  createAttendanceLeavePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationAttendanceLeavePolicyDto
  ) {
    return this.tools.createAttendanceLeavePolicy(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/attendance/leave-policies/:leavePolicyId")
  updateAttendanceLeavePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("leavePolicyId") leavePolicyId: string,
    @Body() body: UpdateConversationAttendanceLeavePolicyDto
  ) {
    return this.tools.updateAttendanceLeavePolicy(conversationId, leavePolicyId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/leave-policies/:leavePolicyId/balances/adjust")
  adjustAttendanceLeaveBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("leavePolicyId") leavePolicyId: string,
    @Body() body: AdjustConversationAttendanceLeaveBalanceDto
  ) {
    return this.tools.adjustAttendanceLeaveBalance(conversationId, leavePolicyId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/leave-policies/:leavePolicyId/accruals")
  applyAttendanceLeaveAccrual(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("leavePolicyId") leavePolicyId: string,
    @Body() body: ApplyConversationAttendanceAccrualDto
  ) {
    return this.tools.applyAttendanceLeaveAccrual(conversationId, leavePolicyId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/holidays")
  createAttendanceHoliday(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationAttendanceHolidayDto
  ) {
    return this.tools.createAttendanceHoliday(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/attendance/holidays/:holidayId")
  updateAttendanceHoliday(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("holidayId") holidayId: string,
    @Body() body: UpdateConversationAttendanceHolidayDto
  ) {
    return this.tools.updateAttendanceHoliday(conversationId, holidayId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/attendance/leave-requests")
  createAttendanceLeaveRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationAttendanceLeaveRequestDto
  ) {
    return this.tools.createAttendanceLeaveRequest(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/attendance/leave-requests/:leaveRequestId/review")
  reviewAttendanceLeaveRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("leaveRequestId") leaveRequestId: string,
    @Body() body: ReviewConversationAttendanceLeaveRequestDto
  ) {
    return this.tools.reviewAttendanceLeaveRequest(conversationId, leaveRequestId, user.id, body);
  }

  @Get("conversations/:conversationId/tools/attendance/history/:memberUserId")
  getAttendanceMemberHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("memberUserId") memberUserId: string
  ) {
    return this.tools.getAttendanceMemberHistory(conversationId, memberUserId, user.id);
  }

  @Get("conversations/:conversationId/tools/attendance/export")
  exportAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Query() query: ListConversationAttendanceExportQueryDto
  ) {
    return this.tools.exportAttendance(conversationId, user.id, query);
  }

  @Post("conversations/:conversationId/tools/notes")
  createNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationToolNoteDto
  ) {
    return this.tools.createNote(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/notes/:noteId")
  updateNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("noteId") noteId: string,
    @Body() body: UpdateConversationToolNoteDto
  ) {
    return this.tools.updateNote(conversationId, noteId, user.id, body);
  }

  @Delete("conversations/:conversationId/tools/notes/:noteId")
  deleteNote(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string, @Param("noteId") noteId: string) {
    return this.tools.deleteNote(conversationId, noteId, user.id);
  }

  @Post("conversations/:conversationId/tools/tasks")
  createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationToolTaskDto
  ) {
    return this.tools.createTask(conversationId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/tasks/from-message")
  createTaskFromMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationToolTaskFromMessageDto
  ) {
    return this.tools.createTaskFromMessage(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/tasks/:taskId")
  updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("taskId") taskId: string,
    @Body() body: UpdateConversationToolTaskDto
  ) {
    return this.tools.updateTask(conversationId, taskId, user.id, body);
  }

  @Get("conversations/:conversationId/tools/tasks/:taskId")
  getTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("taskId") taskId: string
  ) {
    return this.tools.getTask(conversationId, taskId, user.id);
  }

  @Post("conversations/:conversationId/tools/tasks/:taskId/watch")
  toggleTaskWatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("taskId") taskId: string
  ) {
    return this.tools.toggleTaskWatch(conversationId, taskId, user.id);
  }

  @Post("conversations/:conversationId/tools/tasks/:taskId/likes")
  toggleTaskLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("taskId") taskId: string
  ) {
    return this.tools.toggleTaskLike(conversationId, taskId, user.id);
  }

  @Post("conversations/:conversationId/tools/tasks/:taskId/comments")
  createTaskComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("taskId") taskId: string,
    @Body() body: CreateConversationToolTaskCommentDto
  ) {
    return this.tools.createTaskComment(conversationId, taskId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/tasks/:taskId/attachments")
  createTaskAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("taskId") taskId: string,
    @Body() body: CreateConversationToolTaskAttachmentDto
  ) {
    return this.tools.createTaskAttachment(conversationId, taskId, user.id, body);
  }

  @Delete("conversations/:conversationId/tools/tasks/:taskId")
  deleteTask(@CurrentUser() user: AuthenticatedUser, @Param("conversationId") conversationId: string, @Param("taskId") taskId: string) {
    return this.tools.deleteTask(conversationId, taskId, user.id);
  }

  @Post("conversations/:conversationId/tools/polls")
  createPoll(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationToolPollDto
  ) {
    return this.tools.createPoll(conversationId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/polls/:pollId/votes")
  voteOnPoll(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("pollId") pollId: string,
    @Body() body: VoteConversationToolPollDto
  ) {
    return this.tools.voteOnPoll(conversationId, pollId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/polls/:pollId")
  updatePoll(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("pollId") pollId: string,
    @Body() body: UpdateConversationToolPollDto
  ) {
    return this.tools.updatePoll(conversationId, pollId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/prayer-requests")
  createPrayerRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Body() body: CreateConversationPrayerRequestDto
  ) {
    return this.tools.createPrayerRequest(conversationId, user.id, body);
  }

  @Patch("conversations/:conversationId/tools/prayer-requests/:prayerRequestId")
  updatePrayerRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("prayerRequestId") prayerRequestId: string,
    @Body() body: UpdateConversationPrayerRequestDto
  ) {
    return this.tools.updatePrayerRequest(conversationId, prayerRequestId, user.id, body);
  }

  @Post("conversations/:conversationId/tools/prayer-requests/:prayerRequestId/support")
  togglePrayerSupport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("prayerRequestId") prayerRequestId: string
  ) {
    return this.tools.togglePrayerSupport(conversationId, prayerRequestId, user.id);
  }

  @Post("conversations/:conversationId/tools/prayer-requests/:prayerRequestId/updates")
  createPrayerUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId") conversationId: string,
    @Param("prayerRequestId") prayerRequestId: string,
    @Body() body: CreateConversationPrayerUpdateDto
  ) {
    return this.tools.createPrayerUpdate(conversationId, prayerRequestId, user.id, body);
  }

  @Get("admin/tool-requests")
  listAdminRequests(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAdminToolRequestsQueryDto) {
    return this.tools.listAdminRequests(user, query);
  }

  @Post("admin/tool-requests/:requestId/review")
  reviewRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId") requestId: string,
    @Body() body: ReviewConversationToolRequestDto
  ) {
    return this.tools.reviewRequest(user, requestId, body);
  }
}
