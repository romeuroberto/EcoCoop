import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';
import { UpdateMaterialCategoryDto } from './dto/update-material-category.dto';
import { MaterialCategoriesService } from './material-categories.service';

@Controller('material-categories')
@AuditEntity('materialCategory')
@UseInterceptors(AuditInterceptor)
export class MaterialCategoriesController {
  constructor(private service: MaterialCategoriesService) {}

  @Get()
  @RequirePermission('MATERIALS', 'READ')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('includeSubcategories') includeSubcategories?: string,
  ) {
    return this.service.list({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status: status ?? 'active',
      includeSubcategories: includeSubcategories === 'true',
    });
  }

  @Post()
  @RequirePermission('MATERIALS', 'MANAGE')
  create(@Body() dto: CreateMaterialCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('MATERIALS', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateMaterialCategoryDto) {
    return this.service.update(id, dto);
  }
}
