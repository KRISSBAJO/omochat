import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class StartMessageRequestDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  recipientUserId!: string;

  @ApiPropertyOptional({
    example: "Hi, I found your profile and wanted to connect.",
    description: "Required when the recipient only accepts message requests."
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  initialMessage?: string;
}
