import { IsOptional, IsString } from 'class-validator';

export class CancelSortingOperationDto {
  // Emptiness checked in service to return 422 with structured error code
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
