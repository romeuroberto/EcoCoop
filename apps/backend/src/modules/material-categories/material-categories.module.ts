import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { MaterialCategoriesController } from './material-categories.controller';
import { MaterialCategoriesService } from './material-categories.service';

@Module({
  controllers: [MaterialCategoriesController],
  providers: [MaterialCategoriesService, PrismaService],
  exports: [MaterialCategoriesService],
})
export class MaterialCategoriesModule {}
