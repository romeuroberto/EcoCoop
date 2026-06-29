import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  providers: [ProfilesService, PrismaService, AuditInterceptor],
  controllers: [ProfilesController],
  exports: [ProfilesService],
})
export class ProfilesModule {}
