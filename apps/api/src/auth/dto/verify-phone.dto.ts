import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, MaxLength } from "class-validator";

export class VerifyPhoneDto {
  @ApiProperty({
    example: "+16155543592",
    description: "Phone number in international E.164 format."
  })
  @IsString()
  @MaxLength(20)
  phoneNumber!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(4, 10)
  code!: string;
}
