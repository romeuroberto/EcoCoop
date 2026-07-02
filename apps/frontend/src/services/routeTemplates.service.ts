import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export type TemplateStatus = 'ATIVO' | 'INATIVO';

export interface TemplateDriver {
  id: string;
  email: string;
}

export interface TemplateVehicle {
  id: string;
  plate: string;
  type: string;
  model: string | null;
}

export interface TemplatePoint {
  id: string;
  sequence: number;
  notes: string | null;
  collectionPoint: {
    id: string;
    name: string;
    address: string;
  };
}

export interface RouteTemplate {
  id: string;
  name: string;
  status: TemplateStatus;
  recurrenceDays: number[];
  startDate: string;
  endDate: string | null;
  notes: string | null;
  version: number;
  driver: TemplateDriver;
  vehicle: TemplateVehicle;
  templatePoints: TemplatePoint[];
  occurrenceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateOccurrence {
  id: string;
  plannedDate: string;
  status: string;
  isException: boolean;
  driver: { id: string; email: string };
  vehicle: { id: string; plate: string };
}

export interface RouteTemplateDetail extends RouteTemplate {
  occurrences: PagedResult<TemplateOccurrence>;
}

export interface CreateRouteTemplateBody {
  name: string;
  recurrenceDays: number[];
  startDate: string;
  endDate?: string;
  driverId: string;
  vehicleId: string;
  points: Array<{ collectionPointId: string; sequence: number; notes?: string }>;
  notes?: string;
}

export interface UpdateRouteTemplateBody {
  name?: string;
  recurrenceDays?: number[];
  startDate?: string;
  endDate?: string | null;
  driverId?: string;
  vehicleId?: string;
  points?: Array<{ collectionPointId: string; sequence: number; notes?: string }>;
  notes?: string;
  version: number;
  propagate?: boolean;
  overwriteExceptions?: boolean;
}

export interface ListRouteTemplatesQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export interface PropagationResult {
  updated: number;
  exceptionsSkipped: number;
  exceptionsOverwritten: number;
  newOccurrencesGenerated: number;
}

export interface TemplateDraft {
  name: string;
  recurrenceDays: number[];
  startDate: null;
  endDate: null;
  driverId: string;
  vehicleId: string;
  notes: string | null;
  points: Array<{ collectionPointId: string; sequence: number; notes?: string | null }>;
}

export const routeTemplatesService = {
  list: (q: ListRouteTemplatesQuery = {}) =>
    api
      .get<PagedResult<RouteTemplate>>('/route-templates', { params: q })
      .then((r) => r.data),

  getById: (id: string, q: { occurrencePage?: number; occurrenceLimit?: number; occurrenceStatus?: string } = {}) =>
    api
      .get<RouteTemplateDetail>(`/route-templates/${id}`, { params: q })
      .then((r) => r.data),

  create: (body: CreateRouteTemplateBody) =>
    api
      .post<{ template: RouteTemplate; generatedOccurrences: number }>('/route-templates', body)
      .then((r) => r.data),

  update: (id: string, body: UpdateRouteTemplateBody) =>
    api
      .patch<{ template: RouteTemplate; propagation: PropagationResult | null }>(`/route-templates/${id}`, body)
      .then((r) => r.data),

  generate: (id: string) =>
    api
      .post<{ generatedOccurrences: number }>(`/route-templates/${id}/generate`, {})
      .then((r) => r.data),

  deactivate: (id: string) =>
    api
      .post<{ template: RouteTemplate; cancelledOccurrences: number }>(`/route-templates/${id}/deactivate`, {})
      .then((r) => r.data),

  activate: (id: string, startDate: string) =>
    api
      .post<{ template: RouteTemplate; generatedOccurrences: number }>(`/route-templates/${id}/activate`, { startDate })
      .then((r) => r.data),

  duplicate: (id: string) =>
    api
      .post<{ draft: TemplateDraft }>(`/route-templates/${id}/duplicate`, {})
      .then((r) => r.data),
};
