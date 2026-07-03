import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelSaleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  cancelReason!: string;
}
