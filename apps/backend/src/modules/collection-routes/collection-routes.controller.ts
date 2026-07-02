import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
import { CollectionRoutesService } from './collection-routes.service';
import { RouteSequenceSuggesterService } from './route-sequence-suggester.service';
import { AddRoutePointDto } from './dto/add-route-point.dto';
import { AddTeamMembersDto } from './dto/add-team-members.dto';
import { CancelCollectionRouteDto } from './dto/cancel-collection-route.dto';
import { CreateCollectionRouteDto } from './dto/create-collection-route.dto';
import { ReorderRoutePointsDto } from './dto/reorder-route-points.dto';
import { UpdateCollectionRouteDto } from './dto/update-collection-route.dto';

@Controller('collection-routes')
@AuditEntity('collectionRoute')
@UseInterceptors(AuditInterceptor)
export class CollectionRoutesController {
  constructor(
    private service: CollectionRoutesService,
    private suggester: RouteSequenceSuggesterService,
  ) {}

  @Get()
  @RequirePermission('COLLECTION_ROUTES', 'READ')
  list(
    @CurrentUser() user: CurrentUserDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('templateId') templateId?: string,
    @Query('isException') isException?: string,
    @Query('hasTemplate') hasTemplate?: string,
  ) {
    return this.service.list(
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        status,
        driverId,
        dateFrom,
        dateTo,
        templateId,
        isException: isException !== undefined ? isException === 'true' : undefined,
        hasTemplate: hasTemplate !== undefined ? hasTemplate === 'true' : undefined,
      },
      user,
    );
  }

  @Get(':id')
  @RequirePermission('COLLECTION_ROUTES', 'READ')
  @UseGuards(RouteOwnershipGuard)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  create(@Body() dto: CreateCollectionRouteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateCollectionRouteDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/points')
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  addPoint(@Param('id') routeId: string, @Body() dto: AddRoutePointDto) {
    return this.service.addPoint(routeId, dto);
  }

  @Delete(':id/points/:pointId')
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  removePoint(@Param('id') routeId: string, @Param('pointId') pointId: string) {
    return this.service.removePoint(routeId, pointId);
  }

  @Patch(':id/points/reorder')
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  reorderPoints(@Param('id') routeId: string, @Body() dto: ReorderRoutePointsDto) {
    return this.service.reorderPoints(routeId, dto);
  }

  @Post(':id/suggest-sequence')
  @HttpCode(200)
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  suggestSequence(@Param('id') routeId: string) {
    return this.suggester.suggest(routeId);
  }

  @Post(':id/team')
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  addTeamMembers(@Param('id') routeId: string, @Body() dto: AddTeamMembersDto) {
    return this.service.addTeamMembers(routeId, dto);
  }

  @Delete(':id/team/:userId')
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  removeTeamMember(@Param('id') routeId: string, @Param('userId') userId: string) {
    return this.service.removeTeamMember(routeId, userId);
  }

  @Post(':id/start')
  @HttpCode(200)
  @RequirePermission('COLLECTION_ROUTES', 'EXECUTE')
  @UseGuards(RouteOwnershipGuard)
  @AuditAsUpdate()
  startRoute(@Param('id') routeId: string) {
    return this.service.startRoute(routeId);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @RequirePermission('COLLECTION_ROUTES', 'EXECUTE')
  @UseGuards(RouteOwnershipGuard)
  @AuditAsUpdate()
  completeRoute(@Param('id') routeId: string) {
    return this.service.completeRoute(routeId);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  @AuditAsUpdate()
  cancelRoute(@Param('id') routeId: string, @Body() dto: CancelCollectionRouteDto) {
    return this.service.cancelRoute(routeId, dto.reason, dto.confirmInProgress);
  }

  @Post(':id/duplicate')
  @HttpCode(200)
  @RequirePermission('COLLECTION_ROUTES', 'MANAGE')
  duplicateRoute(@Param('id') routeId: string) {
    return this.service.duplicate(routeId);
  }
}
