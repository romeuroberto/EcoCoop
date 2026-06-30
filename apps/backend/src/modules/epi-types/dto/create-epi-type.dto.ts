import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateEpiTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  defaultValidityDays?: number;
}
