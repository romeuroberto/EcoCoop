import { Body, Controller, Get, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('profiles')
@AuditEntity('profile')
@UseInterceptors(AuditInterceptor)
export class ProfilesController {
  constructor(private service: ProfilesService) {}

  @Get()
  @RequirePermission('USERS', 'READ')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @RequirePermission('USERS', 'MANAGE')
  create(@Body() dto: CreateProfileDto) {
    return this.service.create(dto);
  }

  @Patch(':id/permissions')
  @RequirePermission('USERS', 'MANAGE')
  updatePermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
    return this.service.updatePermissions(id, dto);
  }
}
