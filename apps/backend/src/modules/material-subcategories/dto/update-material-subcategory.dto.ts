import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateMaterialSubcategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsUUID()
  @IsOptional()
  defaultUnitId?: string;

  @IsBoolean()
  @IsOptional()
  isSellable?: boolean;

  @IsBoolean()
  @IsOptional()
  acceptsStock?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
