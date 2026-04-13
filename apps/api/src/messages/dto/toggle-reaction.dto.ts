import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class ToggleReactionDto {
  @ApiProperty({
    example: "🔥",
    description: "Emoji reaction to add or remove from a message."
  })
  @IsString()
  @MaxLength(16)
  emoji!: string;
}
