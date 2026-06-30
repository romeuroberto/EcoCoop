import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRawMaterialEntryDto {
  @IsUUID()
  @IsNotEmpty()
  subcategoryId!: string;

  @IsNumber()
  quantity!: number;

  @IsUUID()
  @IsNotEmpty()
  unitId!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
