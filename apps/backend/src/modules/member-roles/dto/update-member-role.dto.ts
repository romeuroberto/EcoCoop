import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
