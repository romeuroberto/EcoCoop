import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { BuyersService } from './buyers.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { LinkUserDto } from './dto/link-user.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';

@Controller('buyers')
@AuditEntity('buyer')
@UseInterceptors(AuditInterceptor)
export class BuyersController {
  constructor(private service: BuyersService) {}

  @Get()
  @RequirePermission('BUYERS', 'READ')
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
  @RequirePermission('BUYERS', 'READ')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('BUYERS', 'MANAGE')
  create(@Body() dto: CreateBuyerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('BUYERS', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateBuyerDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/link-user')
  @RequirePermission('BUYERS', 'MANAGE')
  linkUser(@Param('id') id: string, @Body() dto: LinkUserDto) {
    return this.service.linkUser(id, dto);
  }
}
