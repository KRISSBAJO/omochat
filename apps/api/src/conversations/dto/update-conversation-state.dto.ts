import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsOptional, ValidateIf } from "class-validator";

export class UpdateConversationStateDto {
  @ApiPropertyOptional({
    example: true,
    description: "Archive or unarchive the conversation for the current participant only."
  })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Pin or unpin the conversation for the current participant only."
  })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Lock or unlock the conversation for the current participant only."
  })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiPropertyOptional({
    example: "2026-04-11T15:00:00.000Z",
    nullable: true,
    description: "Mute notifications until the provided time. Send null to clear."
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Date)
  @IsDate()
  mutedUntil?: Date | null;
}
