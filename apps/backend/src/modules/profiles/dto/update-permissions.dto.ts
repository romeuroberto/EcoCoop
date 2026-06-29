import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PermissionItemDto {
  @IsString()
  module!: string;

  @IsString()
  action!: string;
}

export class UpdatePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions!: PermissionItemDto[];
}
