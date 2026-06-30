import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface EpiType {
  id: string;
  name: string;
  defaultValidityDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEpiTypeBody {
  name: string;
  defaultValidityDays?: number;
}

export interface ListEpiTypesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

export const epiTypesService = {
  list: (q: ListEpiTypesQuery = {}) =>
    api.get<PagedResult<EpiType>>('/epi-types', { params: q }).then((r) => r.data),

  getById: (id: string) =>
    api.get<EpiType>(`/epi-types/${id}`).then((r) => r.data),

  create: (body: CreateEpiTypeBody) =>
    api.post<EpiType>('/epi-types', body).then((r) => r.data),

  update: (id: string, body: Partial<CreateEpiTypeBody & { isActive: boolean }>) =>
    api.patch<EpiType>(`/epi-types/${id}`, body).then((r) => r.data),
};
