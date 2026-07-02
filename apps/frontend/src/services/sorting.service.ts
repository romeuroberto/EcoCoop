import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface SortingSubcategory {
  id: string;
  name: string;
}

export interface SortingUnit {
  id: string;
  name?: string;
  symbol: string;
}

export interface SortingOutput {
  id: string;
  subcategory: SortingSubcategory;
  unit: SortingUnit;
  quantity: string;
}

export type SortingRejectType = 'REJEITO' | 'PERDA' | 'PERDA_INERENTE';

export interface SortingReject {
  id: string;
  type: SortingRejectType;
  subcategory: SortingSubcategory | null;
  unit: SortingUnit;
  quantity: string;
  description: string | null;
}

export interface SortingUser {
  id: string;
  email: string;
}

export interface SortingOperation {
  id: string;
  status: 'CONCLUIDA' | 'CANCELADA';
  subcategory: SortingSubcategory;
  unit: SortingUnit;
  processedQuantity: string;
  outputs: SortingOutput[];
  rejects: SortingReject[];
  user: SortingUser;
  createdAt: string;
  cancelReason?: string | null;
  cancelledBy?: SortingUser | null;
  cancelledAt?: string | null;
}

export interface SortingOperationListItem {
  id: string;
  status: 'CONCLUIDA' | 'CANCELADA';
  subcategory: SortingSubcategory;
  unit: SortingUnit;
  processedQuantity: string;
  outputsCount: number;
  rejectsCount: number;
  user: SortingUser;
  createdAt: string;
}

export interface CreateSortingOutputBody {
  subcategoryId: string;
  unitId: string;
  quantity: number;
}

export interface CreateSortingRejectBody {
  type: 'REJEITO' | 'PERDA';
  subcategoryId?: string;
  unitId: string;
  quantity: number;
  description?: string;
}

export interface CreateSortingOperationBody {
  subcategoryId: string;
  unitId: string;
  processedQuantity: number;
  outputs: CreateSortingOutputBody[];
  rejects?: CreateSortingRejectBody[];
}

export interface ListSortingQuery {
  subcategoryId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const sortingService = {
  create: (body: CreateSortingOperationBody) =>
    api.post<SortingOperation>('/sorting-operations', body).then((r) => r.data),

  list: (q: ListSortingQuery = {}) =>
    api
      .get<PagedResult<SortingOperationListItem>>('/sorting-operations', { params: q })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<SortingOperation>(`/sorting-operations/${id}`).then((r) => r.data),
};
