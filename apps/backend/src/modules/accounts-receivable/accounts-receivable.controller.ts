import { Controller } from '@nestjs/common';
import { AccountsReceivableService } from './accounts-receivable.service';

@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(private readonly accountsReceivableService: AccountsReceivableService) {}
}
