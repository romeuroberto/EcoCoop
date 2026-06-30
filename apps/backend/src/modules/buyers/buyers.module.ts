import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { BuyersController } from './buyers.controller';
import { BuyersService } from './buyers.service';

@Module({
  controllers: [BuyersController],
  providers: [BuyersService, PrismaService],
  exports: [BuyersService],
})
export class BuyersModule {}
