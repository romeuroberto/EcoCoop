import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSortingOutputDto {
  @IsUUID()
  subcategoryId!: string;

  @IsUUID()
  unitId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}

export class CreateSortingRejectDto {
  @IsIn(['REJEITO', 'PERDA'])
  type!: 'REJEITO' | 'PERDA';

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsUUID()
  unitId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  // Required when subcategoryId is absent — identifies what was rejected
  @ValidateIf((o: CreateSortingRejectDto) => !o.subcategoryId)
  @IsString()
  @IsNotEmpty()
  description?: string;
}

export class CreateSortingOperationDto {
  @IsUUID()
  subcategoryId!: string;

  @IsUUID()
  unitId!: string;

  @IsNumber()
  @IsPositive()
  processedQuantity!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSortingOutputDto)
  outputs!: CreateSortingOutputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSortingRejectDto)
  rejects?: CreateSortingRejectDto[];
}
