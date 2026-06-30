import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class UpdateUnitDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  symbol?: string;

  @IsUUID()
  @IsOptional()
  baseUnitId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @ValidateIf((o: UpdateUnitDto) => o.baseUnitId !== undefined)
  conversionFactor?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
