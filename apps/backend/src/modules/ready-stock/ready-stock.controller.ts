import { Controller } from '@nestjs/common';
import { ReadyStockService } from './ready-stock.service';

@Controller('ready-stock')
export class ReadyStockController {
  constructor(private service: ReadyStockService) {}
}
