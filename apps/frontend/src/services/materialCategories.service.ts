import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface MaterialCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const materialCategoriesService = {
  list: (q: { page?: number; limit?: number; search?: string; status?: string } = {}) =>
    api.get<PagedResult<MaterialCategory>>('/material-categories', { params: q }).then((r) => r.data),

  create: (body: { name: string; description?: string }) =>
    api.post<MaterialCategory>('/material-categories', body).then((r) => r.data),

  update: (id: string, body: { name?: string; description?: string; isActive?: boolean }) =>
    api.patch<MaterialCategory>(`/material-categories/${id}`, body).then((r) => r.data),
};
