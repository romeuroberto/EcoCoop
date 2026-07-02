import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ReadyStockController } from './ready-stock.controller';
import { ReadyStockService } from './ready-stock.service';

@Module({
  controllers: [ReadyStockController],
  providers: [ReadyStockService, PrismaService],
})
export class ReadyStockModule {}
