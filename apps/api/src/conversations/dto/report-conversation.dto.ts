import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ReportConversationDto {
  @ApiProperty({
    example: "abuse",
    description: "Short reason for reporting this group or channel."
  })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  reason!: string;

  @ApiPropertyOptional({
    example: "The group title and messages are abusive.",
    description: "Optional context for moderators."
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
