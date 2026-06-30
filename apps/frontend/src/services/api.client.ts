import axios from 'axios';

declare global {
  interface Window {
    __ecocoop_access_token: string | null;
  }
}
window.__ecocoop_access_token = null;

// Separate instance for auth endpoints — never goes through the refresh interceptor.
export const authApi = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

import type { InternalAxiosRequestConfig } from 'axios';

const injectToken = (config: InternalAxiosRequestConfig) => {
  const token = window.__ecocoop_access_token;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
};

api.interceptors.request.use(injectToken);
authApi.interceptors.request.use(injectToken);

// Endpoints that must never trigger a refresh retry.
const AUTH_PATHS = ['/auth/refresh', '/auth/login', '/auth/logout'];
const isAuthPath = (url?: string) => AUTH_PATHS.some((p) => url?.includes(p));

let isRefreshing = false;
type Subscriber = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshSubscribers: Subscriber[] = [];

const drainSubscribers = (token: string) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
};

const rejectSubscribers = (err: unknown) => {
  refreshSubscribers.forEach(({ reject }) => reject(err));
  refreshSubscribers = [];
};

const show403Banner = () => {
  if (document.getElementById('__ecocoop_403_banner')) return;
  const banner = document.createElement('div');
  banner.id = '__ecocoop_403_banner';
  banner.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:9999;background:#fee2e2;color:#991b1b;padding:12px 20px;border-radius:8px;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.15)';
  banner.textContent = 'Sem permissão para executar esta ação.';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 4000);
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 403) {
      show403Banner();
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Never retry auth endpoints, already-retried requests, or non-401 errors.
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthPath(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Queue behind an in-flight refresh.
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshSubscribers.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;
    try {
      const res = await authApi.post<{ accessToken: string }>('/auth/refresh');
      const newToken = res.data.accessToken;
      window.__ecocoop_access_token = newToken;
      drainSubscribers(newToken);
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (err) {
      window.__ecocoop_access_token = null;
      rejectSubscribers(err);
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
