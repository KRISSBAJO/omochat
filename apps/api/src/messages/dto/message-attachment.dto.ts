import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaProvider } from "@omochat/db";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min
} from "class-validator";

export class MessageAttachmentDto {
  @ApiProperty({
    enum: MediaProvider,
    example: MediaProvider.S3
  })
  @IsEnum(MediaProvider)
  provider!: MediaProvider;

  @ApiProperty({
    example: "conversations/room-1/abc123-project-photo.jpg"
  })
  @IsString()
  @MaxLength(512)
  storageKey!: string;

  @ApiProperty({
    example: "https://bucket.s3.us-east-1.amazonaws.com/conversations/room-1/abc123-project-photo.jpg"
  })
  @IsUrl()
  @MaxLength(2000)
  url!: string;

  @ApiProperty({
    example: "image/jpeg"
  })
  @IsString()
  @MaxLength(160)
  mimeType!: string;

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

  @ApiPropertyOptional({
    example: "sha256-checksum"
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  checksum?: string;
}
