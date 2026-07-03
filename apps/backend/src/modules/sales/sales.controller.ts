import { Body, Controller, Delete, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { CurrentUserDto } from '@ecocoop/shared';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
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

  @Post()
  @RequirePermission('SALES', 'CREATE')
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: CurrentUserDto) {
    return this.salesService.create(dto, user);
  }

  @Patch(':id/deliver')
  @RequirePermission('SALES', 'DELIVER')
  deliver(
    @Param('id') id: string,
    @Body() dto: DeliverSaleDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.salesService.deliver(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('SALES', 'CANCEL')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelSaleDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.salesService.cancel(id, dto, user);
  }
}
