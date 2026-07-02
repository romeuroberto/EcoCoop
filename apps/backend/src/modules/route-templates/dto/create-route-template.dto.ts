import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RouteTemplatePointDto {
  @IsUUID()
  collectionPointId!: string;

  @IsInt()
  @Min(1)
  sequence!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRouteTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceDays!: number[];

  @IsISO8601()
  startDate!: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsUUID()
  driverId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteTemplatePointDto)
  points!: RouteTemplatePointDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
