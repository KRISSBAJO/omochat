import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({
    example: "Hey, this is now saved to Postgres.",
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
