import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  controllers: [UnitsController],
  providers: [UnitsService, PrismaService],
  exports: [UnitsService],
})
export class UnitsModule {}
