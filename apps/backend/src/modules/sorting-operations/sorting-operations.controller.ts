import { Body, Controller, Delete, Get, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CurrentUserDto } from '@ecocoop/shared';
import { CreateSortingOperationDto } from './dto/create-sorting-operation.dto';
import { CancelSortingOperationDto } from './dto/cancel-sorting-operation.dto';
import { SortingOperationsService } from './sorting-operations.service';

@Controller('sorting-operations')
@AuditEntity('sortingOperation')
@UseInterceptors(AuditInterceptor)
export class SortingOperationsController {
  constructor(private service: SortingOperationsService) {}

  @Post()
  @RequirePermission('SORTING', 'CREATE')
  create(
    @Body() dto: CreateSortingOperationDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermission('SORTING', 'READ')
  findAll(
    @Query('subcategoryId') subcategoryId?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      subcategoryId,
      status,
      userId,
      from,
      to,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('SORTING', 'READ')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @RequirePermission('SORTING', 'CANCEL')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelSortingOperationDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.service.cancel(id, dto, user);
  }
}
