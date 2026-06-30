import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReversalDto {
  @IsString()
  @IsNotEmpty({ message: 'Justificativa é obrigatória para estorno' })
  justification!: string;
}
