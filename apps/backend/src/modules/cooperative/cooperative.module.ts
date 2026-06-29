import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CooperativeController } from './cooperative.controller';
import { CooperativeService } from './cooperative.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  providers: [CooperativeService, PrismaService, AuditInterceptor],
  controllers: [CooperativeController],
  exports: [CooperativeService],
})
export class CooperativeModule {}
