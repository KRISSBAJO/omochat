import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListConversationsQueryDto {
  @ApiPropertyOptional({
    example: 50,
    minimum: 1,
    maximum: 100,
    description: "Maximum number of conversations to return."
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: false,
    description: "Include archived conversations for the current participant."
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: "Include locked conversations for the current participant."
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeLocked?: boolean;
}
