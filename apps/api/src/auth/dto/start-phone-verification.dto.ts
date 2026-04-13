import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class StartPhoneVerificationDto {
  @ApiProperty({
    example: "+16155543592",
    description: "Phone number in international E.164 format."
  })
  @IsString()
  @MaxLength(20)
  phoneNumber!: string;
}
