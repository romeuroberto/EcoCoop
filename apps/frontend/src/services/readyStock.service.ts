import { api } from './api.client';

export interface ReadyStockSubcategory {
  id: string;
  name: string;
  category?: { id: string; name: string };
}

export interface ReadyStockUnit {
  id: string;
  name?: string;
  symbol: string;
}

export interface ReadyStockBalanceItem {
  subcategory: ReadyStockSubcategory;
  unit: ReadyStockUnit;
  balance: string;
  eventCount: number;
}

export interface ReadyStockBalanceResponse {
  data: ReadyStockBalanceItem[];
  calculatedAt: string;
}

export type ReadyStockEventType = 'TRIAGEM_OUTPUT' | 'AJUSTE' | 'ESTORNO';

export interface ReadyStockMovement {
  id: string;
  type: ReadyStockEventType;
  subcategory: ReadyStockSubcategory;
  unit: ReadyStockUnit;
  quantity: string;
  sortingOperationId: string | null;
  adjustmentId: string | null;
  user: { id: string; email: string };
  createdAt: string;
}

export interface ReadyStockMovementsResponse {
  data: ReadyStockMovement[];
  total: number;
  page: number;
  limit: number;
}

export interface BalanceQuery {
  subcategoryId?: string;
  unitId?: string;
  includeInactive?: boolean;
}

export interface MovementsQuery {
  subcategoryId?: string;
  unitId?: string;
  type?: ReadyStockEventType | '';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const readyStockService = {
  getBalance: (q: BalanceQuery = {}) =>
    api
      .get<ReadyStockBalanceResponse>('/ready-stock', {
        params: {
          ...q,
          includeInactive: q.includeInactive ? 'true' : undefined,
        },
      })
      .then((r) => r.data),

  getMovements: (q: MovementsQuery = {}) =>
    api
      .get<ReadyStockMovementsResponse>('/ready-stock/movements', { params: q })
      .then((r) => r.data),
};
