import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SortingOperationsController } from './sorting-operations.controller';
import { SortingOperationsService } from './sorting-operations.service';

@Module({
  controllers: [SortingOperationsController],
  providers: [SortingOperationsService, PrismaService],
})
export class SortingOperationsModule {}
