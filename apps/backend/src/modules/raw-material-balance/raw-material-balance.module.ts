import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RawMaterialBalanceController } from './raw-material-balance.controller';
import { RawMaterialBalanceService } from './raw-material-balance.service';

@Module({
  controllers: [RawMaterialBalanceController],
  providers: [RawMaterialBalanceService, PrismaService],
})
export class RawMaterialBalanceModule {}
