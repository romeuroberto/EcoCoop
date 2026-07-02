import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ReadyStockService } from './ready-stock.service';

@Controller('ready-stock')
export class ReadyStockController {
  constructor(private service: ReadyStockService) {}

  @Get()
  @RequirePermission('READY_STOCK', 'READ')
  getBalance(
    @Query('subcategoryId') subcategoryId?: string,
    @Query('unitId') unitId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.getBalance({
      subcategoryId,
      unitId,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('movements')
  @RequirePermission('READY_STOCK', 'READ')
  getMovements(
    @Query('subcategoryId') subcategoryId?: string,
    @Query('unitId') unitId?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMovements({
      subcategoryId,
      unitId,
      type,
      from,
      to,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
