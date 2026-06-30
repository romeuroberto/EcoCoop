import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { GeocodingModule } from '../../common/providers/geocoding/geocoding.module';
import { CollectionPointsController } from './collection-points.controller';
import { CollectionPointsService } from './collection-points.service';

@Module({
  imports: [GeocodingModule],
  controllers: [CollectionPointsController],
  providers: [CollectionPointsService, PrismaService],
  exports: [CollectionPointsService],
})
export class CollectionPointsModule {}
