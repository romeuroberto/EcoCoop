import { create } from 'zustand';
import { api, authApi } from '../services/api.client';
import { CurrentUserDto, LoginResponseDto } from '@ecocoop/shared';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthState {
  user: CurrentUserDto | null;
  accessToken: string | null;
  isInitializing: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponseDto>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  initializeSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isInitializing: true,

  login: async (credentials) => {
    const res = await authApi.post<LoginResponseDto>('/auth/login', credentials);
    const { accessToken, profile, redirectTo } = res.data;
    window.__ecocoop_access_token = accessToken;
    set({ accessToken });

    const meRes = await api.get<CurrentUserDto>('/auth/me');
    set({ user: meRes.data });

    return { accessToken, profile, redirectTo };
  },

  logout: async () => {
    try {
      await authApi.post('/auth/logout');
    } finally {
      window.__ecocoop_access_token = null;
      set({ user: null, accessToken: null });
    }
  },

  // Uses authApi directly — never triggers the refresh interceptor loop.
  refresh: async () => {
    try {
      const res = await authApi.post<{ accessToken: string }>('/auth/refresh');
      const token = res.data.accessToken;
      window.__ecocoop_access_token = token;
      set({ accessToken: token });
      return true;
    } catch {
      window.__ecocoop_access_token = null;
      set({ accessToken: null });
      return false;
    }
  },

  initializeSession: async () => {
    set({ isInitializing: true });
    try {
      const refreshed = await get().refresh();
      if (refreshed) {
        const meRes = await api.get<CurrentUserDto>('/auth/me');
        set({ user: meRes.data });
      } else {
        set({ user: null });
      }
    } catch {
      set({ user: null });
    } finally {
      // Always unblock the app — never leaves the spinner stuck.
      set({ isInitializing: false });
    }
  },
}));
