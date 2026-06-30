import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMaterialSubcategoryDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsUUID()
  defaultUnitId!: string;

  @IsBoolean()
  isSellable!: boolean;

  @IsBoolean()
  acceptsStock!: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
