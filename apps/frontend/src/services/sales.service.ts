import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export type SaleStatus = 'PENDENTE_ENTREGA' | 'ENTREGUE' | 'CANCELADA';

export interface SaleBuyer {
  id: string;
  legalName: string;
  documentNumber?: string;
}

export interface SaleUser {
  id: string;
  email: string;
}

export interface SaleSubcategory {
  id: string;
  name: string;
}

export interface SaleUnit {
  id: string;
  symbol: string;
}

export interface SaleItem {
  id: string;
  subcategory: SaleSubcategory;
  unit: SaleUnit;
  quantity: string;
  unitPrice: string;
  subtotal: string;
}

export interface AccountReceivableSummary {
  id: string;
  amount: string;
  dueDate: string;
  status: 'A_RECEBER' | 'CANCELADA';
}

export interface SaleListItem {
  id: string;
  buyer: SaleBuyer;
  status: SaleStatus;
  totalAmount: string;
  itemsCount: number;
  createdAt: string;
  user: SaleUser;
}

export interface SaleDetail {
  id: string;
  buyer: SaleBuyer;
  status: SaleStatus;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
  deliveredAt: string | null;
  deliveredBy: SaleUser | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  cancelledBy: SaleUser | null;
  user: SaleUser;
  items: SaleItem[];
  accountReceivable: AccountReceivableSummary | null;
  timeline: Array<{ event: 'CREATED' | 'DELIVERED' | 'CANCELLED'; at: string | null; by: SaleUser | null }>;
}

export interface CreatedSale {
  id: string;
  buyer: SaleBuyer;
  status: SaleStatus;
  totalAmount: string;
  notes: string | null;
  createdAt: string;
  user: SaleUser;
  items: SaleItem[];
  accountReceivable: AccountReceivableSummary | null;
}

export interface CreateSaleBody {
  buyerId: string;
  notes?: string;
  dueDate?: string;
  items: Array<{
    subcategoryId: string;
    unitId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ListSalesQuery {
  buyerId?: string;
  status?: SaleStatus;
  subcategoryId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface DeliverSaleBody {
  deliveredAt?: string;
}

export interface CancelSaleBody {
  cancelReason: string;
}

export interface SaleStatusChangeResponse {
  id: string;
  status: SaleStatus;
  deliveredAt?: string;
  deliveredBy?: SaleUser;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: SaleUser;
}

export const salesService = {
  createSale: (body: CreateSaleBody) =>
    api.post<CreatedSale>('/sales', body).then((r) => r.data),

  listSales: (q: ListSalesQuery = {}) =>
    api.get<PagedResult<SaleListItem>>('/sales', { params: q }).then((r) => r.data),

  getSale: (id: string) =>
    api.get<SaleDetail>(`/sales/${id}`).then((r) => r.data),

  deliverSale: (id: string, body: DeliverSaleBody = {}) =>
    api.patch<SaleStatusChangeResponse>(`/sales/${id}/deliver`, body).then((r) => r.data),

  cancelSale: (id: string, body: CancelSaleBody) =>
    api.delete<SaleStatusChangeResponse>(`/sales/${id}`, { data: body }).then((r) => r.data),
};
