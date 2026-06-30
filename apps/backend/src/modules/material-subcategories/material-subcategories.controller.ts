import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateMaterialSubcategoryDto } from './dto/create-material-subcategory.dto';
import { UpdateMaterialSubcategoryDto } from './dto/update-material-subcategory.dto';
import { MaterialSubcategoriesService } from './material-subcategories.service';

@Controller('material-subcategories')
@AuditEntity('materialSubcategory')
@UseInterceptors(AuditInterceptor)
export class MaterialSubcategoriesController {
  constructor(private service: MaterialSubcategoriesService) {}

  @Get()
  @RequirePermission('MATERIALS', 'READ')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.list({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status: status ?? 'active',
      categoryId,
    });
  }

  @Post()
  @RequirePermission('MATERIALS', 'MANAGE')
  create(@Body() dto: CreateMaterialSubcategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('MATERIALS', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateMaterialSubcategoryDto) {
    return this.service.update(id, dto);
  }
}
