import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export type AccountReceivableStatus = 'A_RECEBER' | 'CANCELADA';

export interface AccountReceivable {
  id: string;
  saleId: string;
  sale: {
    id: string;
    createdAt: string;
    deliveredAt: string | null;
  };
  buyer: {
    id: string;
    legalName: string;
  };
  amount: string;
  dueDate: string;
  status: AccountReceivableStatus;
  createdAt: string;
}

export interface ListAccountsReceivableQuery {
  buyerId?: string;
  status?: AccountReceivableStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const accountsReceivableService = {
  listAccountsReceivable: (q: ListAccountsReceivableQuery = {}) =>
    api.get<PagedResult<AccountReceivable>>('/accounts-receivable', { params: q }).then((r) => r.data),
};
