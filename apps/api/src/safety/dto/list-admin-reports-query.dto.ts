import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserReportStatus } from "@omochat/db";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListAdminReportsQueryDto {
  @ApiPropertyOptional({
    enum: UserReportStatus,
    example: UserReportStatus.OPEN
  })
  @IsOptional()
  @IsEnum(UserReportStatus)
  status?: UserReportStatus;

  @ApiPropertyOptional({
    example: 40
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
