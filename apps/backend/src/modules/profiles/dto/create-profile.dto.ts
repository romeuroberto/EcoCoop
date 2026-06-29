import { IsEnum, IsString } from 'class-validator';
import { ProfileType } from '@ecocoop/shared';

export class CreateProfileDto {
  @IsString()
  name!: string;

  @IsEnum(ProfileType)
  type!: ProfileType;
}
