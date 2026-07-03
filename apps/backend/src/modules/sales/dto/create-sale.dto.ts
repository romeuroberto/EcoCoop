import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSaleItemDto {
  @IsUUID()
  subcategoryId!: string;

  @IsUUID()
  unitId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateSaleDto {
  @IsUUID()
  buyerId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];
}
