import { Body, Controller, Get, Put, UseInterceptors } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditEntity } from '../../common/decorators/audit-entity.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('cooperative')
@AuditEntity('cooperative')
@UseInterceptors(AuditInterceptor)
export class CooperativeController {
  constructor(private service: CooperativeService) {}

  @Get()
  @RequirePermission('COOPERATIVE', 'READ')
  findOne() {
    return this.service.findOne();
  }

  @Put()
  @RequirePermission('COOPERATIVE', 'MANAGE')
  update(@Body() dto: UpdateCooperativeDto) {
    return this.service.update(dto);
  }

  @Get('settings')
  @RequirePermission('COOPERATIVE', 'READ')
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @RequirePermission('COOPERATIVE', 'MANAGE')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(dto);
  }
}
