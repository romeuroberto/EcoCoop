import { IsBoolean, IsDateString, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsCPF } from '../../../common/validators/cpf.validator';

export class UpdateMemberDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @IsCPF()
  cpf?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  admittedAt?: string;

  @IsUUID()
  @IsOptional()
  roleId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
