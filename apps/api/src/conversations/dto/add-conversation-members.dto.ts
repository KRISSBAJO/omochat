import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID } from "class-validator";

export class AddConversationMembersDto {
  @ApiProperty({
    example: ["bceaf965-0c7b-4928-82c5-c2b4b16567fc", "9b86d410-3df5-4b51-955b-49c6a1aef764"],
    description: "Users to add into the existing group or channel."
  })
  @IsArray()
  @IsUUID("all", { each: true })
  participantIds: string[] = [];
}
