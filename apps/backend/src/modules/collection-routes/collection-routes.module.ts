import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CollectionRoutesController } from './collection-routes.controller';
import { CollectionRoutesService } from './collection-routes.service';
import { RouteSequenceSuggesterService } from './route-sequence-suggester.service';

@Module({
  controllers: [CollectionRoutesController],
  providers: [CollectionRoutesService, RouteSequenceSuggesterService, PrismaService],
  exports: [CollectionRoutesService],
})
export class CollectionRoutesModule {}
