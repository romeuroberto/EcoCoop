import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export type VehicleType = 'TRUCK' | 'VAN' | 'PICKUP' | 'MOTORCYCLE' | 'OTHER';

export interface CapacityUnit {
  id: string;
  name: string;
  symbol: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  type: VehicleType;
  model: string;
  capacityValue?: number | null;
  capacityUnitId?: string | null;
  capacityUnit?: CapacityUnit | null;
  capacityNotes?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleBody {
  plate: string;
  type: VehicleType;
  model: string;
  capacityValue?: number;
  capacityUnitId?: string;
  capacityNotes?: string;
  notes?: string;
}

export interface ListVehiclesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

export const vehiclesService = {
  list: (q: ListVehiclesQuery = {}) =>
    api.get<PagedResult<Vehicle>>('/vehicles', { params: q }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Vehicle>(`/vehicles/${id}`).then((r) => r.data),

  create: (body: CreateVehicleBody) =>
    api.post<Vehicle>('/vehicles', body).then((r) => r.data),

  update: (id: string, body: Partial<CreateVehicleBody & { isActive: boolean }>) =>
    api.patch<Vehicle>(`/vehicles/${id}`, body).then((r) => r.data),
};
