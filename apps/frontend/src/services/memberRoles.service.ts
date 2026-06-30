import { api } from './api.client';

export interface MemberRole {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListMemberRolesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

export const memberRolesService = {
  list: (q: ListMemberRolesQuery = {}) =>
    api.get<PagedResult<MemberRole>>('/member-roles', { params: q }).then((r) => r.data),

  create: (name: string) =>
    api.post<MemberRole>('/member-roles', { name }).then((r) => r.data),

  update: (id: string, body: { name?: string; isActive?: boolean }) =>
    api.patch<MemberRole>(`/member-roles/${id}`, body).then((r) => r.data),
};
