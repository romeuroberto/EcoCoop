import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  controllers: [MembersController],
  providers: [MembersService, PrismaService],
  exports: [MembersService],
})
export class MembersModule {}
