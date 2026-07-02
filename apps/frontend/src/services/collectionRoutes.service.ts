import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export type RouteStatus = 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface RouteVehicle {
  id: string;
  plate: string;
  type: string;
  model: string | null;
}

export interface RouteDriver {
  id: string;
  email: string;
}

export interface RouteTeamMember {
  userId: string;
  email: string;
  user?: { id: string; email: string };
  addedAt?: string;
}

export interface RoutePointCollectionPoint {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  locationPending: boolean;
  isActive: boolean;
}

export interface RoutePoint {
  id: string;
  sequence: number;
  notes: string | null;
  collectionPoint: RoutePointCollectionPoint;
}

export interface CollectionRoute {
  id: string;
  name: string;
  plannedDate: string;
  status: RouteStatus;
  startedAt: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  notes: string | null;
  version: number;
  templateId: string | null;
  isException: boolean;
  vehicle: RouteVehicle;
  driver: RouteDriver;
  teamMembers: RouteTeamMember[];
  routePoints: RoutePoint[];
  pointsCount?: number;
  template?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionRouteBody {
  name: string;
  plannedDate: string;
  vehicleId: string;
  driverId: string;
  notes?: string;
  pointIds?: string[];
}

export interface UpdateCollectionRouteBody {
  name?: string;
  plannedDate?: string;
  vehicleId?: string;
  driverId?: string;
  notes?: string;
}

export interface ListCollectionRoutesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
  templateId?: string;
  isException?: boolean;
  hasTemplate?: boolean;
}

export interface SuggestSequenceResult {
  suggestedOrder: string[];
  excludedPoints: Array<{ id: string; name: string; reason: string }>;
  warning?: string;
}

export const collectionRoutesService = {
  list: (q: ListCollectionRoutesQuery = {}) =>
    api.get<PagedResult<CollectionRoute>>('/collection-routes', { params: q }).then((r) => r.data),

  getById: (id: string) =>
    api.get<CollectionRoute>(`/collection-routes/${id}`).then((r) => r.data),

  create: (body: CreateCollectionRouteBody) =>
    api.post<CollectionRoute>('/collection-routes', body).then((r) => r.data),

  update: (id: string, body: UpdateCollectionRouteBody) =>
    api.patch<CollectionRoute>(`/collection-routes/${id}`, body).then((r) => r.data),

  addPoint: (id: string, body: { collectionPointId: string; notes?: string }) =>
    api.post<CollectionRoute>(`/collection-routes/${id}/points`, body).then((r) => r.data),

  removePoint: (id: string, pointId: string) =>
    api.delete<CollectionRoute>(`/collection-routes/${id}/points/${pointId}`).then((r) => r.data),

  reorderPoints: (id: string, orderedPointIds: string[]) =>
    api
      .patch<CollectionRoute>(`/collection-routes/${id}/points/reorder`, { orderedPointIds })
      .then((r) => r.data),

  suggestSequence: (id: string) =>
    api
      .post<SuggestSequenceResult>(`/collection-routes/${id}/suggest-sequence`, {})
      .then((r) => r.data),

  addTeamMembers: (id: string, userIds: string[]) =>
    api.post<CollectionRoute>(`/collection-routes/${id}/team`, { userIds }).then((r) => r.data),

  removeTeamMember: (id: string, userId: string) =>
    api.delete<CollectionRoute>(`/collection-routes/${id}/team/${userId}`).then((r) => r.data),

  start: (id: string) =>
    api.post<CollectionRoute>(`/collection-routes/${id}/start`, {}).then((r) => r.data),

  complete: (id: string) =>
    api.post<CollectionRoute>(`/collection-routes/${id}/complete`, {}).then((r) => r.data),

  cancel: (id: string, reason: string) =>
    api.post<CollectionRoute>(`/collection-routes/${id}/cancel`, { reason }).then((r) => r.data),

  cancelWithConfirm: (id: string, reason: string, confirmInProgress?: boolean) =>
    api
      .post<CollectionRoute>(`/collection-routes/${id}/cancel`, { reason, confirmInProgress })
      .then((r) => r.data),

  duplicate: (id: string) =>
    api.post<{ draft: { name: string; plannedDate: null; driverId: string; vehicleId: string; notes: string | null; points: Array<{ collectionPointId: string; sequence: number }> } }>(`/collection-routes/${id}/duplicate`, {}).then((r) => r.data),
};
