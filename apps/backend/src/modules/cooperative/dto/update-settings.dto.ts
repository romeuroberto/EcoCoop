import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ProfitSharingBase } from '@prisma/client';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  attendanceEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  rejectAlertDaysWithoutStatus?: number;

  @IsOptional()
  @IsEnum(ProfitSharingBase)
  defaultProfitSharingBase?: ProfitSharingBase;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  occurrenceHorizonWeeks?: number;
}
