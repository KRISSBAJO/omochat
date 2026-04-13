import { ApiProperty } from "@nestjs/swagger";
import { PlatformRole } from "@omochat/db";
import { ArrayUnique, IsArray, IsEnum } from "class-validator";

export class UpdateAdminUserRolesDto {
  @ApiProperty({
    enum: PlatformRole,
    isArray: true,
    example: [PlatformRole.PLATFORM_ADMIN, PlatformRole.MODERATOR]
  })
  @IsArray()
  @ArrayUnique()
  @IsEnum(PlatformRole, { each: true })
  roles!: PlatformRole[];
}
