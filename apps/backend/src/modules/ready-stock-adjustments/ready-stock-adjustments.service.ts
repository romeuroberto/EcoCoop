import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ReadyStockAdjustmentsService {
  constructor(private prisma: PrismaService) {}
}
