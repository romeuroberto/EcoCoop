import { Controller } from '@nestjs/common';
import { SortingOperationsService } from './sorting-operations.service';

@Controller('sorting-operations')
export class SortingOperationsController {
  constructor(private service: SortingOperationsService) {}
}
