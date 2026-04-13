import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class MarkReadDto {
  @ApiPropertyOptional({
    example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5",
    description: "Specific message to mark as read. If omitted, the latest received message in the conversation is used."
  })
  @IsOptional()
  @IsUUID()
  messageId?: string;
}
