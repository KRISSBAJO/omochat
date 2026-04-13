import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ModerateStatusDto {
  @ApiPropertyOptional({
    example: true,
    description: "Set true to take the status down, false to restore it if still within the allowed window."
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  remove?: boolean;

  @ApiPropertyOptional({
    example: "Taken down for spam while moderation reviews the media.",
    maxLength: 280
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  removedReason?: string;

  @ApiPropertyOptional({
    example: 12,
    description: "Reset how many hours remain for this status from right now."
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours?: number;
}
