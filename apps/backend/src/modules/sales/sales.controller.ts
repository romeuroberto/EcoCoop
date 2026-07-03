import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { CurrentUserDto } from '@ecocoop/shared';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateSaleDto } from './dto/create-sale.dto';
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
}
