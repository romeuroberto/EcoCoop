import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  providers: [UsersService, PrismaService, AuditInterceptor],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
