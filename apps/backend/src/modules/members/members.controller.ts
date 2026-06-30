import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateMemberDto } from './dto/create-member.dto';
import { LinkUserDto } from './dto/link-user.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@Controller('members')
@AuditEntity('member')
@UseInterceptors(AuditInterceptor)
export class MembersController {
  constructor(private service: MembersService) {}

  @Get()
  @RequirePermission('MEMBERS', 'READ')
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
  @RequirePermission('MEMBERS', 'READ')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('MEMBERS', 'MANAGE')
  create(@Body() dto: CreateMemberDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('MEMBERS', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/link-user')
  @RequirePermission('MEMBERS', 'MANAGE')
  linkUser(@Param('id') id: string, @Body() dto: LinkUserDto) {
    return this.service.linkUser(id, dto);
  }
}
