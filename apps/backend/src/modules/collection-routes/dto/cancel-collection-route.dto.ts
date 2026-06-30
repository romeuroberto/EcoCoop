import { IsNotEmpty, IsString } from 'class-validator';

export class CancelCollectionRouteDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
