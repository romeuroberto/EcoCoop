import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EpiTypesController } from './epi-types.controller';
import { EpiTypesService } from './epi-types.service';

@Module({
  controllers: [EpiTypesController],
  providers: [EpiTypesService, PrismaService],
  exports: [EpiTypesService],
})
export class EpiTypesModule {}
