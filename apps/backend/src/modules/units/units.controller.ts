import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './units.service';

@Controller('units')
@AuditEntity('unitOfMeasure')
@UseInterceptors(AuditInterceptor)
export class UnitsController {
  constructor(private service: UnitsService) {}

  @Get()
  @RequirePermission('UNITS', 'READ')
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

  @Post()
  @RequirePermission('UNITS', 'MANAGE')
  create(@Body() dto: CreateUnitDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('UNITS', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.service.update(id, dto);
  }
}
