import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { ConversationType } from "@omochat/db";

export class CreateConversationDto {
  @ApiProperty({
    enum: ConversationType,
    example: ConversationType.GROUP,
    description: "DIRECT for one-to-one chats, GROUP for private rooms, CHANNEL for broadcast rooms."
  })
  @IsEnum(ConversationType)
  type: ConversationType = ConversationType.DIRECT;

  @ApiPropertyOptional({
    example: "Omochat Launch Room",
    description: "Required for most group and channel conversations. Direct chats can leave this empty."
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
    description: "Deprecated MVP field. The API now uses the authenticated bearer-token user as the creator."
  })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiProperty({
    example: ["bceaf965-0c7b-4928-82c5-c2b4b16567fc", "9b86d410-3df5-4b51-955b-49c6a1aef764"],
    description: "Users invited into the conversation."
  })
  @IsArray()
  @IsUUID("all", { each: true })
  participantIds: string[] = [];
}
