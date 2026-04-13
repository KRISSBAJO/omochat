import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class ToggleStatusReactionDto {
  @ApiProperty({
    example: "\u2764\uFE0F"
  })
  @IsString()
  @MaxLength(24)
  emoji!: string;
}
