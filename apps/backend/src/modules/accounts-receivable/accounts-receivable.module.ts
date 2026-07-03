import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable.service';

@Module({
  controllers: [AccountsReceivableController],
  providers: [AccountsReceivableService, PrismaService],
})
export class AccountsReceivableModule {}
