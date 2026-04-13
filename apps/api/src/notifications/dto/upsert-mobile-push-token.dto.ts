import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertMobilePushTokenDto {
  @ApiProperty({ example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" })
  @IsString()
  @IsNotEmpty()
  pushToken!: string;

  @ApiProperty({ example: "ios" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  platform!: string;

  @ApiProperty({ example: "install-k2j3k4l5m6" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  installationId!: string;

  @ApiPropertyOptional({ example: "iPhone 15 Pro" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;
}
