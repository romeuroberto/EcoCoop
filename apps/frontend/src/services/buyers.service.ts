import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export type DocumentType = 'CPF' | 'CNPJ';

export interface Buyer {
  id: string;
  legalName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone?: string | null;
  email?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  notes?: string | null;
  isActive: boolean;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuyerBody {
  legalName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone?: string;
  email?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  notes?: string;
}

export interface ListBuyersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

export const buyersService = {
  list: (q: ListBuyersQuery = {}) =>
    api.get<PagedResult<Buyer>>('/buyers', { params: q }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Buyer>(`/buyers/${id}`).then((r) => r.data),

  create: (body: CreateBuyerBody) =>
    api.post<Buyer>('/buyers', body).then((r) => r.data),

  update: (id: string, body: Partial<CreateBuyerBody & { isActive: boolean }>) =>
    api.patch<Buyer>(`/buyers/${id}`, body).then((r) => r.data),

  linkUser: (id: string, userId: string | null) =>
    api.patch<Buyer>(`/buyers/${id}/link-user`, { userId }).then((r) => r.data),
};
