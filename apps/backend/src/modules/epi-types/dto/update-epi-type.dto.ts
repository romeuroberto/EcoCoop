import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateEpiTypeDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  defaultValidityDays?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
