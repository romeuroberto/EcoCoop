import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelCollectionRouteDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsBoolean()
  confirmInProgress?: boolean;
}
