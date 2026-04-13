import { ApiPropertyOptional } from "@nestjs/swagger";
import { DirectMessagePolicy } from "@omochat/db";
import { IsLatitude, IsLongitude, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";
import { IsEnum } from "class-validator";

export class UpdateMeDto {
  @ApiPropertyOptional({ example: "Mira Stone", maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional({ example: "https://images.example.com/mira.png" })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: "Available for calls after 4 PM", maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  statusMessage?: string;

  @ApiPropertyOptional({ example: "Builder, moderator, and product operator.", maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: "18 Market Street", maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine1?: string;

  @ApiPropertyOptional({ example: "Nashville", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: "Tennessee", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateRegion?: string;

  @ApiPropertyOptional({ example: "US", maxLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional({ example: 36.1627 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -86.7816 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ enum: DirectMessagePolicy, example: DirectMessagePolicy.REQUESTS_ONLY })
  @IsOptional()
  @IsEnum(DirectMessagePolicy)
  dmPolicy?: DirectMessagePolicy;
}
