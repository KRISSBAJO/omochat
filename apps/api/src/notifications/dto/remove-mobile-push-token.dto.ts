import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class RemoveMobilePushTokenDto {
  @ApiPropertyOptional({ example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pushToken?: string;

  @ApiPropertyOptional({ example: "install-k2j3k4l5m6" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  installationId?: string;
}
