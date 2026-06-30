import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateMemberRoleDto } from './dto/create-member-role.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MemberRolesService } from './member-roles.service';

@Controller('member-roles')
@AuditEntity('memberRole')
@UseInterceptors(AuditInterceptor)
export class MemberRolesController {
  constructor(private service: MemberRolesService) {}

  @Get()
  @RequirePermission('MEMBER_ROLES', 'READ')
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

  @Post()
  @RequirePermission('MEMBER_ROLES', 'MANAGE')
  create(@Body() dto: CreateMemberRoleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('MEMBER_ROLES', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateMemberRoleDto) {
    return this.service.update(id, dto);
  }
}
