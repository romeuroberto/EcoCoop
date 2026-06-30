import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddRoutePointDto {
  @IsUUID()
  collectionPointId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
