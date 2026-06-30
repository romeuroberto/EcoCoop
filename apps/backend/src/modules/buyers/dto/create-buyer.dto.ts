import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateBuyerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  legalName!: string;

  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  documentNumber!: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  addressStreet?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  addressNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  addressComplement?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  addressCity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  addressState?: string;

  @IsString()
  @IsOptional()
  @MaxLength(9)
  addressZip?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
