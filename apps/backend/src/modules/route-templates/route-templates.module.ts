import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { RouteTemplatesController } from './route-templates.controller';
import { RouteTemplatesService } from './route-templates.service';
import { OccurrenceGeneratorService } from './occurrence-generator.service';
import { OccurrenceGeneratorScheduler } from './occurrence-generator.scheduler';

@Module({
  imports: [ScheduleModule],
  controllers: [RouteTemplatesController],
  providers: [
    PrismaService,
    RouteTemplatesService,
    OccurrenceGeneratorService,
    OccurrenceGeneratorScheduler,
  ],
  exports: [RouteTemplatesService, OccurrenceGeneratorService],
})
export class RouteTemplatesModule {}
