import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateEpiTypeDto } from './dto/create-epi-type.dto';
import { UpdateEpiTypeDto } from './dto/update-epi-type.dto';
import { EpiTypesService } from './epi-types.service';

@Controller('epi-types')
@AuditEntity('epiType')
@UseInterceptors(AuditInterceptor)
export class EpiTypesController {
  constructor(private service: EpiTypesService) {}

  @Get()
  @RequirePermission('EPI_TYPES', 'READ')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
  ) {
    return this.service.list({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status: status ?? 'active',
    });
  }

  @Get(':id')
  @RequirePermission('EPI_TYPES', 'READ')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('EPI_TYPES', 'MANAGE')
  create(@Body() dto: CreateEpiTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('EPI_TYPES', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateEpiTypeDto) {
    return this.service.update(id, dto);
  }
}
