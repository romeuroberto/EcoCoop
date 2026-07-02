import { Body, Controller, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CurrentUserDto } from '@ecocoop/shared';
import { CreateReadyStockAdjustmentDto } from './dto/create-ready-stock-adjustment.dto';
import { ReadyStockAdjustmentsService } from './ready-stock-adjustments.service';

@Controller('ready-stock-adjustments')
@AuditEntity('readyStockAdjustment')
@UseInterceptors(AuditInterceptor)
export class ReadyStockAdjustmentsController {
  constructor(private service: ReadyStockAdjustmentsService) {}

  @Post()
  @RequirePermission('READY_STOCK', 'CREATE_ADJUSTMENT')
  create(
    @Body() dto: CreateReadyStockAdjustmentDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermission('READY_STOCK', 'READ')
  findAll(
    @Query('subcategoryId') subcategoryId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      subcategoryId,
      userId,
      from,
      to,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
