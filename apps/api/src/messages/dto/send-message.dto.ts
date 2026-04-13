import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class SendMessageDto {
  @ApiProperty({
    example: "a8f68c4c-232c-4925-8bc7-bf740f3441e3",
    description: "Conversation room that should receive the message."
  })
  @IsUUID()
  conversationId!: string;

  @ApiPropertyOptional({
    example: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
    description: "Temporary MVP sender id. Replace with authenticated user context when auth lands."
  })
  @IsOptional()
  @IsUUID()
  senderId?: string;

  @ApiProperty({
    example: "I pushed the new Omochat room design. Can you check it on mobile?",
    maxLength: 8000
  })
  @IsString()
  @MaxLength(8000)
  body!: string;

  @ApiPropertyOptional({
    example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5",
    description: "Parent message id for threaded replies."
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
