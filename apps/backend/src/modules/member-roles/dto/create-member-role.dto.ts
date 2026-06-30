import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
