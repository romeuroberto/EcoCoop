import { IsArray, IsUUID } from 'class-validator';

export class AddTeamMembersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];
}
