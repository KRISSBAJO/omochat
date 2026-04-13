import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaProvider, UserStatusPostType } from "@omochat/db";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";
import { MessageAttachmentDto } from "../../messages/dto/message-attachment.dto";

export class CreateStatusDto {
  @ApiProperty({
    enum: UserStatusPostType,
    example: UserStatusPostType.TEXT
  })
  @IsEnum(UserStatusPostType)
  type: UserStatusPostType = UserStatusPostType.TEXT;

  @ApiPropertyOptional({
    example: "Closing tickets before dinner. Catch you after 6.",
    maxLength: 1200,
    description: "Main text for a text status, or a short caption for media status."
  })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  text?: string;

  @ApiPropertyOptional({
    example: "Late shift recap.",
    maxLength: 240,
    description: "Optional caption that sits with image or video status posts."
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  caption?: string;

  @ApiPropertyOptional({
    type: MessageAttachmentDto,
    description: "Cloudinary or S3-hosted media metadata for image or video statuses.",
    example: {
      provider: MediaProvider.CLOUDINARY,
      storageKey: "statuses/kriss/status-shot.png",
      url: "https://res.cloudinary.com/demo/image/upload/v1/statuses/kriss/status-shot.png",
      mimeType: "image/png",
      sizeBytes: 481221,
      width: 1080,
      height: 1920
    }
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageAttachmentDto)
  media?: MessageAttachmentDto;

  @ApiPropertyOptional({
    example: "#8d3270",
    description: "Text status background color."
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  backgroundColor?: string;

  @ApiPropertyOptional({
    example: "#fff6f7",
    description: "Text status foreground color."
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  textColor?: string;

  @ApiPropertyOptional({
    example: 36,
    description: "Moderator or admin override for how many hours this status stays live."
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours?: number;
}
