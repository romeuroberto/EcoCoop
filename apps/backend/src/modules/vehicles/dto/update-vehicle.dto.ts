import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { VehicleType } from '@prisma/client';

export class UpdateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Matches(/^[A-Z]{3}-\d{4}$|^[A-Z]{3}-\d[A-Z]\d{2}$/, {
    message: 'plate must be in Brazilian format (AAA-0000 or AAA-0A00)',
  })
  plate?: string;

  @IsEnum(VehicleType)
  @IsOptional()
  type?: VehicleType;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  capacityValue?: number;

  @IsUUID()
  @IsOptional()
  capacityUnitId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  capacityNotes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
