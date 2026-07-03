import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUserDto } from '@ecocoop/shared';
import { AuditAsStateChange, AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { DeliverSaleDto } from './dto/deliver-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@AuditEntity('sale')
@UseInterceptors(AuditInterceptor)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermission('SALES', 'READ')
  findAll(
    @Query('buyerId') buyerId?: string,
    @Query('status') status?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.findAll({
      buyerId,
      status,
      subcategoryId,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('SALES', 'READ')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Post()
  @RequirePermission('SALES', 'CREATE')
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: CurrentUserDto) {
    return this.salesService.create(dto, user);
  }

  @Patch(':id/deliver')
  @RequirePermission('SALES', 'DELIVER')
  @AuditAsStateChange()
  deliver(
    @Param('id') id: string,
    @Body() dto: DeliverSaleDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.salesService.deliver(id, dto, user);
  }

  @Patch(':id/cancel')
  @RequirePermission('SALES', 'CANCEL')
  @AuditAsStateChange()
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelSaleDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.salesService.cancel(id, dto, user);
  }
}
