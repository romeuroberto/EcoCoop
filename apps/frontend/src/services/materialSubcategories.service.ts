import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface MaterialSubcategory {
  id: string;
  name: string;
  isSellable: boolean;
  acceptsStock: boolean;
  notes?: string | null;
  isActive: boolean;
  categoryId: string;
  defaultUnitId: string;
  category: { id: string; name: string };
  defaultUnit: { id: string; name: string; symbol: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubcategoryBody {
  categoryId: string;
  name: string;
  defaultUnitId: string;
  isSellable: boolean;
  acceptsStock: boolean;
  notes?: string;
}

export const materialSubcategoriesService = {
  list: (q: { page?: number; limit?: number; search?: string; status?: string; categoryId?: string } = {}) =>
    api.get<PagedResult<MaterialSubcategory>>('/material-subcategories', { params: q }).then((r) => r.data),

  create: (body: CreateSubcategoryBody) =>
    api.post<MaterialSubcategory>('/material-subcategories', body).then((r) => r.data),

  update: (id: string, body: Partial<CreateSubcategoryBody & { isActive: boolean }>) =>
    api.patch<MaterialSubcategory>(`/material-subcategories/${id}`, body).then((r) => r.data),
};
