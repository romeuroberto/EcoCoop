import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditAsUpdate, AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RouteOwnershipGuard } from '../../common/guards/route-ownership.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CurrentUserDto } from '@ecocoop/shared';
import { RawMaterialEntriesService } from './raw-material-entries.service';
import { CreateRawMaterialEntryDto } from './dto/create-raw-material-entry.dto';
import { CreateReversalDto } from './dto/create-reversal.dto';

@Controller('collection-routes/:routeId/material-entries')
@AuditEntity('rawMaterialEntry')
@UseInterceptors(AuditInterceptor)
export class RawMaterialEntriesController {
  constructor(private service: RawMaterialEntriesService) {}

  @Get()
  @RequirePermission('RAW_MATERIAL_ENTRIES', 'READ')
  @UseGuards(RouteOwnershipGuard)
  list(
    @Param('routeId') routeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1') || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '20') || 20));
    return this.service.list(routeId, p, l);
  }

  @Get(':id')
  @RequirePermission('RAW_MATERIAL_ENTRIES', 'READ')
  @UseGuards(RouteOwnershipGuard)
  findOne(@Param('routeId') routeId: string, @Param('id') id: string) {
    return this.service.findOne(routeId, id);
  }

  @Post()
  @RequirePermission('RAW_MATERIAL_ENTRIES', 'CREATE')
  @UseGuards(RouteOwnershipGuard)
  create(
    @Param('routeId') routeId: string,
    @Body() dto: CreateRawMaterialEntryDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.service.create(routeId, dto, user);
  }

  @Post(':id/reversal')
  @HttpCode(201)
  @RequirePermission('RAW_MATERIAL_ENTRIES', 'MANAGE')
  @UseGuards(RouteOwnershipGuard)
  @AuditAsUpdate()
  createReversal(
    @Param('routeId') routeId: string,
    @Param('id') id: string,
    @Body() dto: CreateReversalDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.service.createReversal(routeId, id, dto, user);
  }
}
