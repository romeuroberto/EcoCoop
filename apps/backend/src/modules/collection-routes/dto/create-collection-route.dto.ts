import { IsArray, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCollectionRouteDto {
  @IsString()
  name!: string;

  @IsDateString()
  plannedDate!: string;

  @IsUUID()
  vehicleId!: string;

  @IsUUID()
  driverId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  pointIds?: string[];
}
