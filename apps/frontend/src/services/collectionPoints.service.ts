import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  locationPending: boolean;
  reference: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionPointBody {
  name: string;
  address: string;
  reference?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateCollectionPointBody {
  name?: string;
  address?: string;
  reference?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}

export interface ListCollectionPointsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  locationPending?: boolean;
}

export const collectionPointsService = {
  list: (q: ListCollectionPointsQuery = {}) =>
    api.get<PagedResult<CollectionPoint>>('/collection-points', { params: q }).then((r) => r.data),

  getById: (id: string) =>
    api.get<CollectionPoint>(`/collection-points/${id}`).then((r) => r.data),

  create: (body: CreateCollectionPointBody) =>
    api.post<CollectionPoint>('/collection-points', body).then((r) => r.data),

  update: (id: string, body: UpdateCollectionPointBody) =>
    api.patch<CollectionPoint>(`/collection-points/${id}`, body).then((r) => r.data),
};
