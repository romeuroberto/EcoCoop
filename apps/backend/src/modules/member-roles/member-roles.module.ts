import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { MemberRolesController } from './member-roles.controller';
import { MemberRolesService } from './member-roles.service';

@Module({
  controllers: [MemberRolesController],
  providers: [MemberRolesService, PrismaService],
  exports: [MemberRolesService],
})
export class MemberRolesModule {}
