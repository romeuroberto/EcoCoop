import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSaleDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  cancelReason?: string;
}
