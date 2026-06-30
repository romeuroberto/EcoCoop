import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

api.interceptors.request.use((config) => {
  const token = window.__ecocoop_access_token;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

const show403Banner = () => {
  const existing = document.getElementById('__ecocoop_403_banner');
  if (existing) return;
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
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const res = await api.post<{ accessToken: string }>('/auth/refresh');
        const newToken = res.data.accessToken;
        window.__ecocoop_access_token = newToken;
        onRefreshed(newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        window.__ecocoop_access_token = null;
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

declare global {
  interface Window {
    __ecocoop_access_token: string | null;
  }
}
window.__ecocoop_access_token = null;
