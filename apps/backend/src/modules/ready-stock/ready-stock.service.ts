import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ReadyStockService {
  constructor(private prisma: PrismaService) {}
}
