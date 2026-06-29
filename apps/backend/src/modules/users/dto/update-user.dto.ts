import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string | undefined;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string | undefined;

  @IsOptional()
  @IsUUID()
  profileId?: string | undefined;
}
