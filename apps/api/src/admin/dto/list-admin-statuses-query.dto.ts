import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export enum AdminStatusState {
  LIVE = "LIVE",
  REMOVED = "REMOVED",
  EXPIRED = "EXPIRED"
}

export class ListAdminStatusesQueryDto {
  @ApiPropertyOptional({ example: "kriss" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: AdminStatusState, example: AdminStatusState.LIVE })
  @IsOptional()
  @IsEnum(AdminStatusState)
  state?: AdminStatusState;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 12;
}
