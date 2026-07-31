import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Pre-configured Axios instance for all API calls.
 *
 * - Base URL defaults to `/api` (proxied by Vite in dev, or set via VITE_API_URL in prod).
 * - Automatically attaches JWT access token from localStorage or sessionStorage.
 * - Handles 401 responses with automatic refresh token rotation & request retries.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/** Helper to get the stored access token from either storage */
const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
};

/** Helper to get the stored refresh token from either storage */
const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
};

// ── Request Interceptor: attach Bearer access token ──
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response Interceptor: refresh token rotation & auth handling ──
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Avoid looping on auth endpoints
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        // No refresh token available — clear and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }

      try {
        const res = await axios.post<{ status: string; data: { token: string } }>(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        const newAccessToken = res.data.data.token;

        // Store in whichever storage had the old token
        if (localStorage.getItem('accessToken')) {
          localStorage.setItem('accessToken', newAccessToken);
        } else {
          sessionStorage.setItem('accessToken', newAccessToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
