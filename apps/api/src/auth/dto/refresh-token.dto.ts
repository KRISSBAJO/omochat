import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiPropertyOptional({
    example: "mobile-refresh-token-value",
    description: "Native mobile clients can send the refresh token in the body. Web clients should use the refresh_token cookie."
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
