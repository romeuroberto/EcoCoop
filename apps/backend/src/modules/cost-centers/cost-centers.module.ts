import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersService } from './cost-centers.service';

@Module({
  controllers: [CostCentersController],
  providers: [CostCentersService, PrismaService],
  exports: [CostCentersService],
})
export class CostCentersModule {}
