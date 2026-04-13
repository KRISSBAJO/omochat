import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export class ListMessagesQueryDto {
  @ApiPropertyOptional({
    example: "f9c62ce0-2f49-47b8-b1c6-44c4784370d5",
    description: "Fetch messages older than this message id."
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({
    example: 60,
    minimum: 1,
    maximum: 100,
    description: "Maximum number of messages to return."
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
