import { IsArray, IsUUID } from 'class-validator';

export class ReorderRoutePointsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderedPointIds!: string[];
}
