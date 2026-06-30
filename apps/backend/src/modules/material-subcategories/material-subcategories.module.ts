import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { MaterialSubcategoriesController } from './material-subcategories.controller';
import { MaterialSubcategoriesService } from './material-subcategories.service';

@Module({
  controllers: [MaterialSubcategoriesController],
  providers: [MaterialSubcategoriesService, PrismaService],
  exports: [MaterialSubcategoriesService],
})
export class MaterialSubcategoriesModule {}
