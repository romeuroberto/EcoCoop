import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RawMaterialEntriesController } from './raw-material-entries.controller';
import { RawMaterialEntriesService } from './raw-material-entries.service';

@Module({
  controllers: [RawMaterialEntriesController],
  providers: [RawMaterialEntriesService, PrismaService],
})
export class RawMaterialEntriesModule {}
