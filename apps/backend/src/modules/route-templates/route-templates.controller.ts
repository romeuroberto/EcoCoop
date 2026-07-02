import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { AuditEntity, AuditAsUpdate } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { RouteTemplatesService } from './route-templates.service';
import { CreateRouteTemplateDto } from './dto/create-route-template.dto';
import { UpdateRouteTemplateDto } from './dto/update-route-template.dto';
import { ActivateRouteTemplateDto } from './dto/activate-route-template.dto';

@Controller('route-templates')
@AuditEntity('routeTemplate')
@UseInterceptors(AuditInterceptor)
export class RouteTemplatesController {
  constructor(private service: RouteTemplatesService) {}

  @Get()
  @RequirePermission('ROUTE_TEMPLATES', 'READ')
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post()
  @RequirePermission('ROUTE_TEMPLATES', 'MANAGE')
  create(@Body() dto: CreateRouteTemplateDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @RequirePermission('ROUTE_TEMPLATES', 'READ')
  findOne(
    @Param('id') id: string,
    @Query('occurrencePage') occurrencePage?: string,
    @Query('occurrenceLimit') occurrenceLimit?: string,
    @Query('occurrenceStatus') occurrenceStatus?: string,
  ) {
    return this.service.findOne(id, {
      occurrencePage: occurrencePage ? parseInt(occurrencePage) : undefined,
      occurrenceLimit: occurrenceLimit ? parseInt(occurrenceLimit) : undefined,
      occurrenceStatus,
    });
  }

  @Patch(':id')
  @RequirePermission('ROUTE_TEMPLATES', 'MANAGE')
  @AuditAsUpdate()
  update(@Param('id') id: string, @Body() dto: UpdateRouteTemplateDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/generate')
  @HttpCode(200)
  @RequirePermission('ROUTE_TEMPLATES', 'MANAGE')
  generate(@Param('id') id: string) {
    return this.service.generate(id);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  @RequirePermission('ROUTE_TEMPLATES', 'MANAGE')
  @AuditAsUpdate()
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Post(':id/activate')
  @HttpCode(200)
  @RequirePermission('ROUTE_TEMPLATES', 'MANAGE')
  @AuditAsUpdate()
  activate(@Param('id') id: string, @Body() dto: ActivateRouteTemplateDto) {
    return this.service.activate(id, dto);
  }

  @Post(':id/duplicate')
  @HttpCode(200)
  @RequirePermission('ROUTE_TEMPLATES', 'MANAGE')
  duplicate(@Param('id') id: string) {
    return this.service.duplicate(id);
  }
}
