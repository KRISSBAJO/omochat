import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "mira@omochat.local" })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "mira",
    description: "Public handle. Use letters, numbers, underscore, and dot."
  })
  @Matches(/^[a-zA-Z0-9_.]{3,32}$/)
  username!: string;

  @ApiProperty({ example: "Mira Stone", maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;

  @ApiProperty({ example: "ChangeMe123!", minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ example: "iPhone 15 Pro" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;

  @ApiPropertyOptional({ example: "ios" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;
}
