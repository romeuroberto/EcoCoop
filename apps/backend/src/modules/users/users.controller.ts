import { Body, Controller, Get, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('users')
@AuditEntity('user')
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @RequirePermission('USERS', 'READ')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @RequirePermission('USERS', 'CREATE')
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @RequirePermission('USERS', 'READ')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('USERS', 'UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/activate')
  @RequirePermission('USERS', 'MANAGE')
  setActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.service.setActive(id, body.isActive);
  }
}
