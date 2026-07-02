import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RouteTemplatePointDto } from './create-route-template.dto';

export class UpdateRouteTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceDays?: number[];

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string | null;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteTemplatePointDto)
  points?: RouteTemplatePointDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  propagate?: boolean;

  @IsOptional()
  @IsBoolean()
  overwriteExceptions?: boolean;

  @IsDefined()
  @IsInt()
  version!: number;
}
