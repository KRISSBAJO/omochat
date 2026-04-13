import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class PrepareAttachmentUploadDto {
  @ApiProperty({
    example: "project-photo.jpg",
    maxLength: 240
  })
  @IsString()
  @MaxLength(240)
  fileName!: string;

  @ApiProperty({
    example: "image/jpeg"
  })
  @IsString()
  @MaxLength(160)
  contentType!: string;

  @ApiProperty({
    example: 482110
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25 * 1024 * 1024)
  sizeBytes!: number;

  @ApiPropertyOptional({
    example: 1440
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({
    example: 960
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({
    example: 12100
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMs?: number;
}
