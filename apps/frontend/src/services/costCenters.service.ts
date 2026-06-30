import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface CostCenter {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCostCenterBody {
  name: string;
  code?: string;
  description?: string;
}

export interface ListCostCentersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

export const costCentersService = {
  list: (q: ListCostCentersQuery = {}) =>
    api.get<PagedResult<CostCenter>>('/cost-centers', { params: q }).then((r) => r.data),

  getById: (id: string) =>
    api.get<CostCenter>(`/cost-centers/${id}`).then((r) => r.data),

  create: (body: CreateCostCenterBody) =>
    api.post<CostCenter>('/cost-centers', body).then((r) => r.data),

  update: (id: string, body: Partial<CreateCostCenterBody & { isActive: boolean }>) =>
    api.patch<CostCenter>(`/cost-centers/${id}`, body).then((r) => r.data),
};
