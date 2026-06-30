import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateCollectionRouteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
