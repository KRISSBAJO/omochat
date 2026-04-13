import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "mira@omochat.local" })
  @IsEmail()
  email!: string;
}
