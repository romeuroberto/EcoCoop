import { api } from './api.client';
import type { PagedResult } from './memberRoles.service';

export interface Member {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string | null;
  admittedAt: string;
  notes?: string | null;
  isActive: boolean;
  userId?: string | null;
  role: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberBody {
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  admittedAt: string;
  roleId: string;
  notes?: string;
}

export interface ListMembersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

export const membersService = {
  list: (q: ListMembersQuery = {}) =>
    api.get<PagedResult<Member>>('/members', { params: q }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Member>(`/members/${id}`).then((r) => r.data),

  create: (body: CreateMemberBody) =>
    api.post<Member>('/members', body).then((r) => r.data),

  update: (id: string, body: Partial<CreateMemberBody & { isActive: boolean }>) =>
    api.patch<Member>(`/members/${id}`, body).then((r) => r.data),

  linkUser: (id: string, userId: string | null) =>
    api.patch<Member>(`/members/${id}/link-user`, { userId }).then((r) => r.data),
};
