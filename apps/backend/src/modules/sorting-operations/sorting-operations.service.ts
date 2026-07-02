import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SortingOperationsService {
  constructor(private prisma: PrismaService) {}
}
