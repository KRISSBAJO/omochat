import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class ReportUserDto {
  @ApiProperty({
    example: "5bf7d271-950a-4ef6-a028-1d447e552a7d"
  })
  @IsUUID()
  targetUserId!: string;

  @ApiProperty({
    example: "spam"
  })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  reason!: string;

  @ApiPropertyOptional({
    example: "They kept sending the same unsolicited message."
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @ApiPropertyOptional({
    example: "a8f68c4c-232c-4925-8bc7-bf740f3441e3"
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5"
  })
  @IsOptional()
  @IsUUID()
  messageId?: string;
}
