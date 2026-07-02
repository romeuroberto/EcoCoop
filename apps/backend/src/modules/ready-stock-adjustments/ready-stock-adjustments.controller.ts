import { Controller } from '@nestjs/common';
import { ReadyStockAdjustmentsService } from './ready-stock-adjustments.service';

@Controller('ready-stock-adjustments')
export class ReadyStockAdjustmentsController {
  constructor(private service: ReadyStockAdjustmentsService) {}
}
