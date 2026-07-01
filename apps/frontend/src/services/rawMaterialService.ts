import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface RawMaterialEntrySubcategory {
  id: string;
  name: string;
  category: { id: string; name: string };
}

export interface RawMaterialEntryUnit {
  id: string;
  name: string;
  symbol: string;
}

export interface RawMaterialEntryUser {
  id: string;
  email: string;
}

export interface RawMaterialStockEvent {
  id: string;
  type: string;
  quantity: string;
  createdAt: string;
}

export interface RawMaterialEntry {
  id: string;
  routeId: string;
  subcategory: RawMaterialEntrySubcategory;
  quantity: string;
  unit: RawMaterialEntryUnit;
  notes: string | null;
  user: RawMaterialEntryUser;
  createdAt: string;
  stockEventId: string | null;
  isReversed: boolean;
  stockEvent?: RawMaterialStockEvent | null;
}

export interface CreateEntryBody {
  subcategoryId: string;
  quantity: number;
  unitId: string;
  notes?: string;
}

export interface CreateReversalBody {
  justification: string;
}

export interface ListEntriesQuery {
  page?: number;
  limit?: number;
}

export interface RawMaterialBalanceItem {
  subcategory: { id: string; name: string; isActive: boolean; category: { id: string; name: string } };
  unit: { id: string; name: string; symbol: string };
  balance: string;
  eventCount: number;
}

export interface RawMaterialBalanceResponse {
  data: RawMaterialBalanceItem[];
  calculatedAt: string;
}

export interface BalanceQuery {
  subcategoryId?: string;
  unitId?: string;
  includeInactive?: boolean;
}

export const rawMaterialService = {
  listEntries: (routeId: string, q: ListEntriesQuery = {}) =>
    api
      .get<PagedResult<RawMaterialEntry>>(`/collection-routes/${routeId}/material-entries`, { params: q })
      .then((r) => r.data),

  createEntry: (routeId: string, body: CreateEntryBody) =>
    api
      .post<RawMaterialEntry>(`/collection-routes/${routeId}/material-entries`, body)
      .then((r) => r.data),

  getEntry: (routeId: string, id: string) =>
    api
      .get<RawMaterialEntry>(`/collection-routes/${routeId}/material-entries/${id}`)
      .then((r) => r.data),

  createReversal: (routeId: string, entryId: string, body: CreateReversalBody) =>
    api
      .post<RawMaterialEntry>(
        `/collection-routes/${routeId}/material-entries/${entryId}/reversal`,
        body,
      )
      .then((r) => r.data),

  getBalance: (q: BalanceQuery = {}) =>
    api
      .get<RawMaterialBalanceResponse>('/raw-material-balance', { params: q })
      .then((r) => r.data),
};
