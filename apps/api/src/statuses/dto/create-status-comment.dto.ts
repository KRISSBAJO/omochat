import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class CreateStatusCommentDto {
  @ApiProperty({
    example: "This is clean. Send me the original after stand-up.",
    maxLength: 1000
  })
  @IsString()
  @MaxLength(1000)
  body!: string;
}
