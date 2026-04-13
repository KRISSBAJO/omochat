import { ApiProperty } from "@nestjs/swagger";
import { CallType } from "@omochat/db";
import { IsEnum } from "class-validator";

export class StartCallDto {
  @ApiProperty({
    enum: CallType,
    example: CallType.VOICE
  })
  @IsEnum(CallType)
  type!: CallType;
}
