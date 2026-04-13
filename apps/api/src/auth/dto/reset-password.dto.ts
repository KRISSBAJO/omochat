import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ example: "reset-token-from-email" })
  @IsString()
  token!: string;

  @ApiProperty({ example: "NewChangeMe123!", minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
