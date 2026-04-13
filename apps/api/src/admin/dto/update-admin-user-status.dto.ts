import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAdminUserStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "SUSPENDED"], example: "SUSPENDED" })
  @IsEnum(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";

  @ApiProperty({ example: "Suspended pending impersonation and spam review.", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
