import { IsOptional, IsUUID } from 'class-validator';

export class LinkUserDto {
  @IsUUID()
  @IsOptional()
  userId!: string | null;
}
