import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { MessageAttachmentDto } from "./message-attachment.dto";

export class CreateAttachmentMessageDto {
  @ApiPropertyOptional({
    example: "Sharing the image here.",
    maxLength: 8000
  })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  body?: string;

  @ApiPropertyOptional({
    example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5",
    description: "Parent message id for threaded replies."
  })
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    type: [MessageAttachmentDto]
  })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments!: MessageAttachmentDto[];
}
