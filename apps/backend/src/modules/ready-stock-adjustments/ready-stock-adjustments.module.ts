import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ReadyStockAdjustmentsController } from './ready-stock-adjustments.controller';
import { ReadyStockAdjustmentsService } from './ready-stock-adjustments.service';

@Module({
  controllers: [ReadyStockAdjustmentsController],
  providers: [ReadyStockAdjustmentsService, PrismaService],
})
export class ReadyStockAdjustmentsModule {}
