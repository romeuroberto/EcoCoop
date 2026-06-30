import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsCPF } from '../../../common/validators/cpf.validator';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @IsCPF()
  cpf!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  admittedAt!: string;

  @IsUUID()
  roleId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
