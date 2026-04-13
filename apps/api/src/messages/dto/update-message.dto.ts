import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class UpdateMessageDto {
  @ApiProperty({
    example: "Edited message copy.",
    maxLength: 8000
  })
  @IsString()
  @MaxLength(8000)
  body!: string;
}
