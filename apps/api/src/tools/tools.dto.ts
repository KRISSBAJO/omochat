import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength
} from "class-validator";
import {
  CareRequestType,
  CareRequestVisibility,
  ConversationAnnouncementAudience,
  ConversationAttendanceAssignmentStatus,
  ConversationAttendanceClockEventType,
  ConversationAttendanceClockMethod,
  ConversationAttendanceExportVariant,
  ConversationAttendanceHolidayScope,
  ConversationAttendanceLeaveAccrualCadence,
  ConversationAttendanceLeaveBalanceEntryType,
  ConversationAttendanceRecordStatus,
  ConversationAttendanceLeaveStatus,
  ConversationAttendanceLeaveType,
  ConversationAttendanceRotaFrequency,
  ConversationAttendanceShiftStatus,
  ConversationCategory,
  ConversationTaskPriority,
  ConversationBoardMemberRole,
  ConversationBoardSprintStatus,
  ConversationBoardTemplate,
  ConversationNoteKind,
  ConversationTaskStatus,
  ConversationTaskType,
  ConversationToolPack,
  ConversationToolRequestStatus,
  PrayerRequestStatus
} from "@omochat/db";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class CreateConversationToolRequestDto {
  @ApiProperty({ enum: ConversationToolPack, example: ConversationToolPack.CORE_WORKSPACE })
  @IsEnum(ConversationToolPack)
  pack: ConversationToolPack = ConversationToolPack.CORE_WORKSPACE;

  @ApiPropertyOptional({ example: "We need shared notes and task follow-up for the leadership team.", maxLength: 400 })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}

export class ReviewConversationToolRequestDto {
  @ApiProperty({ enum: ConversationToolRequestStatus, example: ConversationToolRequestStatus.APPROVED })
  @IsEnum(ConversationToolRequestStatus)
  status: ConversationToolRequestStatus = ConversationToolRequestStatus.APPROVED;

  @ApiPropertyOptional({ example: "Approved for the Sunday planning room.", maxLength: 400 })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  reviewNote?: string;
}

export class CreateConversationToolNoteDto {
  @ApiProperty({ enum: ConversationNoteKind, example: ConversationNoteKind.NOTE })
  @IsEnum(ConversationNoteKind)
  kind: ConversationNoteKind = ConversationNoteKind.NOTE;

  @ApiPropertyOptional({ enum: ConversationAnnouncementAudience, example: ConversationAnnouncementAudience.ROOM })
  @IsOptional()
  @IsEnum(ConversationAnnouncementAudience)
  audience?: ConversationAnnouncementAudience;

  @ApiProperty({ example: "Sunday run sheet", maxLength: 120 })
  @IsString()
  @MaxLength(120)
  title: string = "";

  @ApiProperty({ example: "Open with prayer, worship by 9:05, announcements after the welcome.", maxLength: 4000 })
  @IsString()
  @MaxLength(4000)
  body: string = "";

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ example: "2026-04-20T17:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateConversationToolNoteDto {
  @ApiPropertyOptional({ enum: ConversationNoteKind })
  @IsOptional()
  @IsEnum(ConversationNoteKind)
  kind?: ConversationNoteKind;

  @ApiPropertyOptional({ enum: ConversationAnnouncementAudience })
  @IsOptional()
  @IsEnum(ConversationAnnouncementAudience)
  audience?: ConversationAnnouncementAudience;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class CreateConversationToolTaskDto {
  @ApiProperty({ example: "Follow up with new families" })
  @IsString()
  @MaxLength(160)
  title: string = "";

  @ApiPropertyOptional({ example: "Call everyone who filled the welcome card before Wednesday." })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;

  @ApiPropertyOptional({ example: "FOLLOW_UP" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ enum: ConversationTaskType, example: ConversationTaskType.TASK })
  @IsOptional()
  @IsEnum(ConversationTaskType)
  taskType?: ConversationTaskType;

  @ApiPropertyOptional({ enum: ConversationTaskPriority, example: ConversationTaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(ConversationTaskPriority)
  priority?: ConversationTaskPriority;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number;

  @ApiPropertyOptional({ example: 82 })
  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @ApiPropertyOptional({ example: "Sprint 4" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sprintName?: string;

  @ApiPropertyOptional({ example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5" })
  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @ApiPropertyOptional({ example: ["mobile", "launch"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(24, { each: true })
  labels?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ example: "2026-04-18T16:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ example: "5bf7d271-950a-4ef6-a028-1d447e552a7d" })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional({ example: "b72d5f25-165b-49d2-8f6b-79a068347e80" })
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiPropertyOptional({ example: "10c8b1cb-4f76-484d-90c5-5b0819cf8366" })
  @IsOptional()
  @IsUUID()
  columnId?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateConversationToolTaskDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;

  @ApiPropertyOptional({ example: "SERVICE" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ enum: ConversationTaskType })
  @IsOptional()
  @IsEnum(ConversationTaskType)
  taskType?: ConversationTaskType;

  @ApiPropertyOptional({ enum: ConversationTaskPriority })
  @IsOptional()
  @IsEnum(ConversationTaskPriority)
  priority?: ConversationTaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sprintName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sprintId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(24, { each: true })
  labels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ enum: ConversationTaskStatus })
  @IsOptional()
  @IsEnum(ConversationTaskStatus)
  status?: ConversationTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  columnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateConversationToolTaskFromMessageDto {
  @ApiProperty({ example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5" })
  @IsUUID()
  messageId: string = "";

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ example: "FOLLOW_UP" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ enum: ConversationTaskType })
  @IsOptional()
  @IsEnum(ConversationTaskType)
  taskType?: ConversationTaskType;

  @ApiPropertyOptional({ enum: ConversationTaskPriority })
  @IsOptional()
  @IsEnum(ConversationTaskPriority)
  priority?: ConversationTaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sprintName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(24, { each: true })
  labels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  columnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateConversationBoardColumnInputDto {
  @ApiProperty({ example: "Backlog" })
  @IsString()
  @MaxLength(80)
  title: string = "";

  @ApiPropertyOptional({ example: "#e7d8a8" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiPropertyOptional({ enum: ConversationTaskStatus, example: ConversationTaskStatus.TODO })
  @IsOptional()
  @IsEnum(ConversationTaskStatus)
  taskStatus?: ConversationTaskStatus;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateConversationBoardDto {
  @ApiProperty({ example: "Sunday follow-up board" })
  @IsString()
  @MaxLength(120)
  title: string = "";

  @ApiPropertyOptional({ example: "Track care calls, tasks, and visits for the week." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: ConversationBoardTemplate, example: ConversationBoardTemplate.KANBAN })
  @IsOptional()
  @IsEnum(ConversationBoardTemplate)
  template?: ConversationBoardTemplate;

  @ApiPropertyOptional({ type: [CreateConversationBoardColumnInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => CreateConversationBoardColumnInputDto)
  columns?: CreateConversationBoardColumnInputDto[];
}

export class UpdateConversationBoardDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: ConversationBoardTemplate })
  @IsOptional()
  @IsEnum(ConversationBoardTemplate)
  template?: ConversationBoardTemplate;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AddConversationBoardMemberDto {
  @ApiProperty({ example: "5bf7d271-950a-4ef6-a028-1d447e552a7d" })
  @IsUUID()
  userId: string = "";

  @ApiPropertyOptional({ enum: ConversationBoardMemberRole, example: ConversationBoardMemberRole.CONTRIBUTOR })
  @IsOptional()
  @IsEnum(ConversationBoardMemberRole)
  role?: ConversationBoardMemberRole;
}

export class UpdateConversationBoardMemberDto {
  @ApiProperty({ enum: ConversationBoardMemberRole, example: ConversationBoardMemberRole.EDITOR })
  @IsEnum(ConversationBoardMemberRole)
  role: ConversationBoardMemberRole = ConversationBoardMemberRole.CONTRIBUTOR;
}

export class CreateConversationBoardColumnDto {
  @ApiProperty({ example: "Review" })
  @IsString()
  @MaxLength(80)
  title: string = "";

  @ApiPropertyOptional({ example: "#cbb89a" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiPropertyOptional({ enum: ConversationTaskStatus, example: ConversationTaskStatus.IN_PROGRESS })
  @IsOptional()
  @IsEnum(ConversationTaskStatus)
  taskStatus?: ConversationTaskStatus;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateConversationBoardSprintDto {
  @ApiProperty({ example: "Sprint 4" })
  @IsString()
  @MaxLength(120)
  title: string = "";

  @ApiPropertyOptional({ example: "Finish mobile launch blockers and QA." })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  goal?: string;

  @ApiPropertyOptional({ enum: ConversationBoardSprintStatus, example: ConversationBoardSprintStatus.PLANNED })
  @IsOptional()
  @IsEnum(ConversationBoardSprintStatus)
  status?: ConversationBoardSprintStatus;

  @ApiPropertyOptional({ example: "2026-04-14T09:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: "2026-04-28T18:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateConversationAttendanceShiftTemplateDto {
  @ApiProperty({ example: "Sunday first service" })
  @IsString()
  @MaxLength(120)
  title: string = "";

  @ApiPropertyOptional({ example: "8am service volunteer coverage." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: "Main auditorium" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  locationName?: string;

  @ApiPropertyOptional({ example: "123 Hope Street, Nashville, TN" })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  locationAddress?: string;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @MaxLength(10)
  startsAtTime: string = "";

  @ApiProperty({ example: "11:30" })
  @IsString()
  @MaxLength(10)
  endsAtTime: string = "";

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodMinutes?: number;

  @ApiPropertyOptional({ example: [0, 3, 6] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresLocation?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresPhoto?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresQr?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresNfc?: boolean;

  @ApiPropertyOptional({ example: 36.1619 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  geofenceLatitude?: number;

  @ApiPropertyOptional({ example: -86.7816 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  geofenceLongitude?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  geofenceRadiusM?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateConversationAttendanceShiftTemplateDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  locationName?: string | null;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  locationAddress?: string | null;

  @ApiPropertyOptional({ example: "08:00" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  startsAtTime?: string;

  @ApiPropertyOptional({ example: "11:30" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  endsAtTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodMinutes?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresLocation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPhoto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresQr?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresNfc?: boolean;

  @ApiPropertyOptional({ example: "ROOM-FRONT-01" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  stationCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  geofenceLatitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  geofenceLongitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  geofenceRadiusM?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateConversationAttendanceShiftDto {
  @ApiProperty({ example: "Sunday service coverage" })
  @IsString()
  @MaxLength(140)
  title: string = "";

  @ApiPropertyOptional({ example: "c5f9a8cb-ec7d-4f4f-81eb-df3f8681dc7e" })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ example: "Arrival by 7:40am for setup." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ example: "2026-04-19T13:00:00.000Z" })
  @IsDateString()
  startsAt: string = "";

  @ApiProperty({ example: "2026-04-19T16:30:00.000Z" })
  @IsDateString()
  endsAt: string = "";

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  locationName?: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  locationAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @ApiPropertyOptional({ enum: ConversationAttendanceShiftStatus, example: ConversationAttendanceShiftStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(ConversationAttendanceShiftStatus)
  status?: ConversationAttendanceShiftStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresLocation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPhoto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresQr?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresNfc?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  stationCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  geofenceLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  geofenceLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  geofenceRadiusM?: number;
}

export class UpdateConversationAttendanceShiftDto {
  @ApiPropertyOptional({ maxLength: 140 })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string | null;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  locationName?: string | null;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  locationAddress?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @ApiPropertyOptional({ enum: ConversationAttendanceShiftStatus })
  @IsOptional()
  @IsEnum(ConversationAttendanceShiftStatus)
  status?: ConversationAttendanceShiftStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresLocation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPhoto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresQr?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresNfc?: boolean;

  @ApiPropertyOptional({ example: "ROOM-FRONT-01" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  stationCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  geofenceLatitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  geofenceLongitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  geofenceRadiusM?: number | null;
}

export class CreateConversationAttendanceAssignmentDto {
  @ApiProperty({ example: "5bf7d271-950a-4ef6-a028-1d447e552a7d" })
  @IsUUID()
  userId: string = "";

  @ApiPropertyOptional({ enum: ConversationAttendanceAssignmentStatus, example: ConversationAttendanceAssignmentStatus.ASSIGNED })
  @IsOptional()
  @IsEnum(ConversationAttendanceAssignmentStatus)
  status?: ConversationAttendanceAssignmentStatus;
}

export class UpdateConversationAttendanceAssignmentDto {
  @ApiProperty({ enum: ConversationAttendanceAssignmentStatus, example: ConversationAttendanceAssignmentStatus.CONFIRMED })
  @IsEnum(ConversationAttendanceAssignmentStatus)
  status: ConversationAttendanceAssignmentStatus = ConversationAttendanceAssignmentStatus.CONFIRMED;
}

export class CreateConversationAttendanceClockEventDto {
  @ApiProperty({ enum: ConversationAttendanceClockEventType, example: ConversationAttendanceClockEventType.CLOCK_IN })
  @IsEnum(ConversationAttendanceClockEventType)
  eventType: ConversationAttendanceClockEventType = ConversationAttendanceClockEventType.CLOCK_IN;

  @ApiPropertyOptional({ enum: ConversationAttendanceClockMethod, example: ConversationAttendanceClockMethod.WEB })
  @IsOptional()
  @IsEnum(ConversationAttendanceClockMethod)
  method?: ConversationAttendanceClockMethod;

  @ApiPropertyOptional({ example: 36.1619 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -86.7816 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 8.4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  accuracyMeters?: number;

  @ApiPropertyOptional({ example: "https://res.cloudinary.com/demo/image/upload/v1/checkin.jpg" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofUrl?: string;

  @ApiPropertyOptional({ enum: ["LOCAL", "S3", "CLOUDINARY"], example: "CLOUDINARY" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  proofProvider?: "LOCAL" | "S3" | "CLOUDINARY";

  @ApiPropertyOptional({ example: "front-door-kiosk" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  qrValue?: string;

  @ApiPropertyOptional({ example: "ROOM-FRONT-01" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  stationCode?: string;

  @ApiPropertyOptional({ example: "Lobby kiosk iPad" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceLabel?: string;

  @ApiPropertyOptional({ example: "Clocking in from usher stand." })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  note?: string;

  @ApiPropertyOptional({ example: "05268e1e-82d1-44a0-a690-fe09cc152838" })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}

export class ReviewConversationAttendanceRecordDto {
  @ApiProperty({ enum: ConversationAttendanceRecordStatus, example: ConversationAttendanceRecordStatus.APPROVED })
  @IsEnum(ConversationAttendanceRecordStatus)
  status: ConversationAttendanceRecordStatus = ConversationAttendanceRecordStatus.APPROVED;

  @ApiPropertyOptional({ example: "Approved after location review." })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  reviewNote?: string;
}

export class UpdateConversationAttendancePolicyDto {
  @ApiPropertyOptional({ example: "America/Chicago" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  standardHoursPerDay?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  @Min(1)
  standardHoursPerWeek?: number;

  @ApiPropertyOptional({ example: 480 })
  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeAfterMinutes?: number;

  @ApiPropertyOptional({ example: 720 })
  @IsOptional()
  @IsInt()
  @Min(0)
  doubleTimeAfterMinutes?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateGraceMinutes?: number;

  @ApiPropertyOptional({ example: 360 })
  @IsOptional()
  @IsInt()
  @Min(0)
  breakRequiredAfterMinutes?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  breakDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowSelfClock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowManualAdjustments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireSupervisorApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireLocation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requirePhoto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireQr?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireNfc?: boolean;

  @ApiPropertyOptional({ example: "Front desk kiosk" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  stationLabel?: string | null;

  @ApiPropertyOptional({ example: "ROOM-FRONT-01" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  stationCode?: string | null;
}

export class CreateConversationAttendanceLeavePolicyDto {
  @ApiProperty({ example: "Annual leave" })
  @IsString()
  @MaxLength(120)
  title: string = "";

  @ApiProperty({ enum: ConversationAttendanceLeaveType, example: ConversationAttendanceLeaveType.VACATION })
  @IsEnum(ConversationAttendanceLeaveType)
  leaveType: ConversationAttendanceLeaveType = ConversationAttendanceLeaveType.VACATION;

  @ApiPropertyOptional({ example: 9600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  annualAllowanceMinutes?: number;

  @ApiPropertyOptional({ example: 480 })
  @IsOptional()
  @IsInt()
  @Min(0)
  carryOverMinutes?: number;

  @ApiPropertyOptional({ enum: ConversationAttendanceLeaveAccrualCadence, example: ConversationAttendanceLeaveAccrualCadence.MONTHLY })
  @IsOptional()
  @IsEnum(ConversationAttendanceLeaveAccrualCadence)
  accrualCadence?: ConversationAttendanceLeaveAccrualCadence;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @IsInt()
  @Min(0)
  accrualAmountMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowNegativeBalance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateConversationAttendanceLeavePolicyDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ enum: ConversationAttendanceLeaveType })
  @IsOptional()
  @IsEnum(ConversationAttendanceLeaveType)
  leaveType?: ConversationAttendanceLeaveType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  annualAllowanceMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  carryOverMinutes?: number;

  @ApiPropertyOptional({ enum: ConversationAttendanceLeaveAccrualCadence })
  @IsOptional()
  @IsEnum(ConversationAttendanceLeaveAccrualCadence)
  accrualCadence?: ConversationAttendanceLeaveAccrualCadence;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  accrualAmountMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowNegativeBalance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateConversationAttendanceHolidayDto {
  @ApiProperty({ example: "Christmas Day" })
  @IsString()
  @MaxLength(120)
  title: string = "";

  @ApiPropertyOptional({ example: "Office closed for public holiday." })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @ApiPropertyOptional({ enum: ConversationAttendanceHolidayScope, example: ConversationAttendanceHolidayScope.ROOM })
  @IsOptional()
  @IsEnum(ConversationAttendanceHolidayScope)
  scope?: ConversationAttendanceHolidayScope;

  @ApiPropertyOptional({ enum: ConversationCategory, example: "CHURCH" })
  @IsOptional()
  @IsEnum(ConversationCategory)
  category?: ConversationCategory;

  @ApiProperty({ example: "2026-12-25T00:00:00.000Z" })
  @IsDateString()
  startsOn: string = "";

  @ApiProperty({ example: "2026-12-25T23:59:59.999Z" })
  @IsDateString()
  endsOn: string = "";

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

export class UpdateConversationAttendanceHolidayDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ maxLength: 600 })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string | null;

  @ApiPropertyOptional({ enum: ConversationAttendanceHolidayScope })
  @IsOptional()
  @IsEnum(ConversationAttendanceHolidayScope)
  scope?: ConversationAttendanceHolidayScope;

  @ApiPropertyOptional({ enum: ConversationCategory })
  @IsOptional()
  @IsEnum(ConversationCategory)
  category?: ConversationCategory | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

export class CreateConversationAttendanceLeaveRequestDto {
  @ApiProperty({ example: "Family emergency" })
  @IsString()
  @MaxLength(120)
  title: string = "";

  @ApiPropertyOptional({ example: "Need two mornings away for hospital support." })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  reason?: string;

  @ApiPropertyOptional({ enum: ConversationAttendanceLeaveType, example: ConversationAttendanceLeaveType.PERSONAL })
  @IsOptional()
  @IsEnum(ConversationAttendanceLeaveType)
  leaveType?: ConversationAttendanceLeaveType;

  @ApiProperty({ example: "2026-04-20T08:00:00.000Z" })
  @IsDateString()
  startsAt: string = "";

  @ApiProperty({ example: "2026-04-20T17:00:00.000Z" })
  @IsDateString()
  endsAt: string = "";

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPartialDay?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  deductFromBalance?: boolean;

  @ApiPropertyOptional({ example: "05268e1e-82d1-44a0-a690-fe09cc152838" })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: "05268e1e-82d1-44a0-a690-fe09cc152838" })
  @IsOptional()
  @IsUUID()
  leavePolicyId?: string;
}

export class ReviewConversationAttendanceLeaveRequestDto {
  @ApiProperty({ enum: ConversationAttendanceLeaveStatus, example: ConversationAttendanceLeaveStatus.APPROVED })
  @IsEnum(ConversationAttendanceLeaveStatus)
  @IsIn([ConversationAttendanceLeaveStatus.APPROVED, ConversationAttendanceLeaveStatus.DECLINED, ConversationAttendanceLeaveStatus.CANCELLED])
  status: ConversationAttendanceLeaveStatus = ConversationAttendanceLeaveStatus.APPROVED;

  @ApiPropertyOptional({ example: "Approved for the requested days." })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  reviewNote?: string;
}

export class AdjustConversationAttendanceLeaveBalanceDto {
  @ApiProperty({ example: "05268e1e-82d1-44a0-a690-fe09cc152838" })
  @IsUUID()
  userId: string = "";

  @ApiProperty({ example: 480 })
  @Type(() => Number)
  @IsInt()
  minutesDelta: number = 0;

  @ApiPropertyOptional({ enum: ConversationAttendanceLeaveBalanceEntryType, example: ConversationAttendanceLeaveBalanceEntryType.ADJUSTMENT })
  @IsOptional()
  @IsEnum(ConversationAttendanceLeaveBalanceEntryType)
  entryType?: ConversationAttendanceLeaveBalanceEntryType;

  @ApiPropertyOptional({ example: "Carry-over granted after HR review." })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  note?: string;

  @ApiPropertyOptional({ example: "2026-04-14T12:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}

export class ApplyConversationAttendanceAccrualDto {
  @ApiPropertyOptional({ example: "05268e1e-82d1-44a0-a690-fe09cc152838" })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: ["05268e1e-82d1-44a0-a690-fe09cc152838"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  participantUserIds?: string[];

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minutes?: number;

  @ApiPropertyOptional({ example: "2026-04-14T12:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @ApiPropertyOptional({ example: "Monthly accrual run." })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  note?: string;
}

export class CreateConversationAttendanceRotaRunDto {
  @ApiProperty({ example: "05268e1e-82d1-44a0-a690-fe09cc152838" })
  @IsUUID()
  templateId: string = "";

  @ApiProperty({ example: "May rota" })
  @IsString()
  @MaxLength(120)
  title: string = "";

  @ApiProperty({ enum: ConversationAttendanceRotaFrequency, example: ConversationAttendanceRotaFrequency.WEEKLY })
  @IsEnum(ConversationAttendanceRotaFrequency)
  frequency: ConversationAttendanceRotaFrequency = ConversationAttendanceRotaFrequency.WEEKLY;

  @ApiProperty({ example: "2026-05-01T00:00:00.000Z" })
  @IsDateString()
  startsOn: string = "";

  @ApiProperty({ example: "2026-05-31T23:59:59.999Z" })
  @IsDateString()
  endsOn: string = "";

  @ApiPropertyOptional({ example: ["05268e1e-82d1-44a0-a690-fe09cc152838"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  participantUserIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListConversationAttendanceExportQueryDto {
  @ApiPropertyOptional({ example: "2026-04-01T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-04-30T23:59:59.999Z" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: "05268e1e-82d1-44a0-a690-fe09cc152838" })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: ConversationAttendanceExportVariant, example: ConversationAttendanceExportVariant.SUMMARY })
  @IsOptional()
  @IsEnum(ConversationAttendanceExportVariant)
  variant?: ConversationAttendanceExportVariant;
}

export class UpdateConversationBoardSprintDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ maxLength: 600 })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  goal?: string | null;

  @ApiPropertyOptional({ enum: ConversationBoardSprintStatus })
  @IsOptional()
  @IsEnum(ConversationBoardSprintStatus)
  status?: ConversationBoardSprintStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateConversationToolTaskCommentDto {
  @ApiProperty({ example: "We should split this into two deliverables." })
  @IsString()
  @MaxLength(4000)
  body: string = "";

  @ApiPropertyOptional({ example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5" })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class CreateConversationToolTaskAttachmentDto {
  @ApiProperty({ enum: ["LOCAL", "S3", "CLOUDINARY"], example: "CLOUDINARY" })
  @IsString()
  @MaxLength(24)
  provider: "LOCAL" | "S3" | "CLOUDINARY" = "CLOUDINARY";

  @ApiPropertyOptional({ example: "omochat-files" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bucket?: string;

  @ApiProperty({ example: "tasks/mobile-launch/checklist.pdf" })
  @IsString()
  @MaxLength(240)
  storageKey: string = "";

  @ApiProperty({ example: "https://res.cloudinary.com/demo/raw/upload/v1/checklist.pdf" })
  @IsString()
  @MaxLength(4000)
  url: string = "";

  @ApiProperty({ example: "application/pdf" })
  @IsString()
  @MaxLength(120)
  mimeType: string = "";

  @ApiProperty({ example: 84320 })
  @IsInt()
  @Min(1)
  sizeBytes: number = 1;

  @ApiPropertyOptional({ example: 1080 })
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ example: 720 })
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @ApiPropertyOptional({ example: "sha256-checksum" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  checksum?: string;
}

export class UpdateConversationBoardColumnDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiPropertyOptional({ enum: ConversationTaskStatus })
  @IsOptional()
  @IsEnum(ConversationTaskStatus)
  taskStatus?: ConversationTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateConversationToolPollDto {
  @ApiProperty({ example: "Which service night works best this week?" })
  @IsString()
  @MaxLength(220)
  question: string = "";

  @ApiProperty({ example: ["Friday evening", "Saturday morning", "Sunday after service"] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  options: string[] = [];
}

export class UpdateConversationToolPollDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  closed?: boolean;
}

export class VoteConversationToolPollDto {
  @ApiProperty({ example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5" })
  @IsUUID()
  optionId: string = "";
}

export class CreateConversationPrayerRequestDto {
  @ApiProperty({ example: "Pray for the youth retreat" })
  @IsString()
  @MaxLength(160)
  title: string = "";

  @ApiProperty({ example: "Pray for safe travel, unity, and clear teaching all weekend." })
  @IsString()
  @MaxLength(4000)
  body: string = "";

  @ApiPropertyOptional({ enum: CareRequestType, example: CareRequestType.PRAYER })
  @IsOptional()
  @IsEnum(CareRequestType)
  requestType?: CareRequestType;

  @ApiPropertyOptional({ enum: CareRequestVisibility, example: CareRequestVisibility.CARE_TEAM })
  @IsOptional()
  @IsEnum(CareRequestVisibility)
  visibility?: CareRequestVisibility;

  @ApiPropertyOptional({ enum: ConversationTaskPriority, example: ConversationTaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(ConversationTaskPriority)
  priority?: ConversationTaskPriority;

  @ApiPropertyOptional({ example: "Brother James" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subjectName?: string;

  @ApiPropertyOptional({ example: "+1 615 555 9012" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subjectContact?: string;

  @ApiPropertyOptional({ example: "05268e1e-82d1-44a0-a690-fe09cc152838" })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional({ example: "2026-04-15T17:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  followUpAt?: string;
}

export class UpdateConversationPrayerRequestDto {
  @ApiPropertyOptional({ enum: PrayerRequestStatus, example: PrayerRequestStatus.ANSWERED })
  @IsOptional()
  @IsEnum(PrayerRequestStatus)
  status?: PrayerRequestStatus;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @ApiPropertyOptional({ enum: CareRequestType })
  @IsOptional()
  @IsEnum(CareRequestType)
  requestType?: CareRequestType;

  @ApiPropertyOptional({ enum: CareRequestVisibility })
  @IsOptional()
  @IsEnum(CareRequestVisibility)
  visibility?: CareRequestVisibility;

  @ApiPropertyOptional({ enum: ConversationTaskPriority })
  @IsOptional()
  @IsEnum(ConversationTaskPriority)
  priority?: ConversationTaskPriority;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subjectName?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subjectContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  followUpAt?: string | null;
}

export class CreateConversationPrayerUpdateDto {
  @ApiProperty({ example: "Visited after service and scheduled another check-in for Tuesday." })
  @IsString()
  @MaxLength(4000)
  body: string = "";

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class ListAdminToolRequestsQueryDto {
  @ApiPropertyOptional({ enum: ConversationToolRequestStatus })
  @IsOptional()
  @IsEnum(ConversationToolRequestStatus)
  status?: ConversationToolRequestStatus;
}
