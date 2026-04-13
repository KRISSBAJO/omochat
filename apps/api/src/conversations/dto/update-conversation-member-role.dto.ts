import { ApiProperty } from "@nestjs/swagger";
import { ParticipantRole } from "@omochat/db";
import { IsEnum } from "class-validator";

export class UpdateConversationMemberRoleDto {
  @ApiProperty({
    enum: [ParticipantRole.ADMIN, ParticipantRole.MEMBER],
    example: ParticipantRole.ADMIN,
    description: "Only OWNER can promote or demote active members."
  })
  @IsEnum(ParticipantRole)
  role!: "ADMIN" | "MEMBER";
}
