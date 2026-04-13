import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class TransferConversationOwnershipDto {
  @ApiProperty({
    example: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
    description: "Active member who should become the new owner of this group or channel."
  })
  @IsUUID()
  memberUserId!: string;
}
