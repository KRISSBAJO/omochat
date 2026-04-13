import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "@23yg2",
    description: "Email, username, verified phone number, or short identity code."
  })
  @IsString()
  @MaxLength(120)
  identifier!: string;

  @ApiProperty({ example: "ChangeMe123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ example: "Pixel 9" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;

  @ApiPropertyOptional({ example: "android" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;
}
