import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface UnitOfMeasure {
  id: string;
  name: string;
  symbol: string;
  conversionFactor?: number | null;
  baseUnitId?: string | null;
  baseUnit?: { id: string; name: string; symbol: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUnitBody {
  name: string;
  symbol: string;
  baseUnitId?: string;
  conversionFactor?: number;
}

export const unitsService = {
  list: (q: { page?: number; limit?: number; search?: string; status?: string } = {}) =>
    api.get<PagedResult<UnitOfMeasure>>('/units', { params: q }).then((r) => r.data),

  create: (body: CreateUnitBody) =>
    api.post<UnitOfMeasure>('/units', body).then((r) => r.data),

  update: (id: string, body: Partial<CreateUnitBody & { isActive: boolean }>) =>
    api.patch<UnitOfMeasure>(`/units/${id}`, body).then((r) => r.data),
};
