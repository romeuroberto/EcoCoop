import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReadyStockAdjustmentDto {
  @IsUUID()
  subcategoryId!: string;

  @IsUUID()
  unitId!: string;

  // Zero is caught as 422 in service (business rule, not type error)
  @IsNumber()
  quantity!: number;

  // Empty string / omission is caught as 422 in service (JUSTIFICATION_REQUIRED)
  @IsOptional()
  @IsString()
  justification?: string;
}
