import { create } from 'zustand';
import { api } from '../services/api.client';
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
    const res = await api.post<LoginResponseDto>('/auth/login', credentials);
    const { accessToken, profile, redirectTo } = res.data;
    window.__ecocoop_access_token = accessToken;
    set({ accessToken });

    // Load full user data
    const meRes = await api.get<CurrentUserDto>('/auth/me');
    set({ user: meRes.data });

    return { accessToken, profile, redirectTo };
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      window.__ecocoop_access_token = null;
      set({ user: null, accessToken: null });
    }
  },

  refresh: async () => {
    try {
      const res = await api.post<{ accessToken: string }>('/auth/refresh');
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
    const refreshed = await get().refresh();
    if (refreshed) {
      try {
        const meRes = await api.get<CurrentUserDto>('/auth/me');
        set({ user: meRes.data });
      } catch {
        set({ user: null });
      }
    } else {
      set({ user: null });
    }
    set({ isInitializing: false });
  },
}));
