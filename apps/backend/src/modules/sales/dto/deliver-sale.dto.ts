import { IsISO8601, IsOptional } from 'class-validator';

export class DeliverSaleDto {
  @IsISO8601({ strict: true })
  @IsOptional()
  deliveredAt?: string;
}
