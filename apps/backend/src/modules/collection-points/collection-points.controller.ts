import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CollectionPointsService } from './collection-points.service';
import { CreateCollectionPointDto } from './dto/create-collection-point.dto';
import { UpdateCollectionPointDto } from './dto/update-collection-point.dto';

@Controller('collection-points')
@AuditEntity('collectionPoint')
@UseInterceptors(AuditInterceptor)
export class CollectionPointsController {
  constructor(private service: CollectionPointsService) {}

  @Get()
  @RequirePermission('COLLECTION_POINTS', 'READ')
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('locationPending') locationPending?: string,
  ) {
    return this.service.list({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status: status ?? 'active',
      locationPending: locationPending !== undefined ? locationPending === 'true' : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('COLLECTION_POINTS', 'READ')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('COLLECTION_POINTS', 'MANAGE')
  create(@Body() dto: CreateCollectionPointDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('COLLECTION_POINTS', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateCollectionPointDto) {
    return this.service.update(id, dto);
  }
}
