import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RawMaterialBalanceService } from './raw-material-balance.service';

@Controller('raw-material-balance')
export class RawMaterialBalanceController {
  constructor(private service: RawMaterialBalanceService) {}

  @Get()
  @RequirePermission('RAW_MATERIAL_BALANCE', 'READ')
  getBalance(
    @Query('subcategoryId') subcategoryId?: string,
    @Query('unitId') unitId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.getBalance({
      subcategoryId,
      unitId,
      includeInactive: includeInactive === 'true',
    });
  }
}
