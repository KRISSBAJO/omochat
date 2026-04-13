import { ApiProperty } from "@nestjs/swagger";
import { UserReportStatus } from "@omochat/db";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class ReviewReportDto {
  @ApiProperty({
    enum: UserReportStatus,
    example: UserReportStatus.REVIEWED,
    required: false
  })
  @IsOptional()
  @IsEnum(UserReportStatus)
  status?: UserReportStatus;

  @ApiProperty({
    example: "f0ae4a76-b568-4321-92c2-60564f01f9cc",
    required: false,
    description: "Assign this report to a moderator."
  })
  @IsOptional()
  @IsUUID()
  assignedModeratorUserId?: string;

  @ApiProperty({
    example: "Reporter added screenshots. Target account has repeated spam patterns.",
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  moderatorNote?: string;

  @ApiProperty({
    example: "We reviewed the report and removed the abusive content.",
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
