import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class LogoutDto {
  @ApiPropertyOptional({
    example: "mobile-refresh-token-value",
    description: "Optional because browser clients can log out with the refresh_token cookie."
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
