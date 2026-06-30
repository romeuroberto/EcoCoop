import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol!: string;

  @IsUUID()
  @IsOptional()
  baseUnitId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ValidateIf((o: CreateUnitDto) => o.baseUnitId !== undefined)
  conversionFactor?: number;
}
