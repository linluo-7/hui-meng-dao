import Constants from 'expo-constants';

import { storage } from '@/src/services/storage';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://localhost:4000';

const defaultBaseUrl = BASE_URL;

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing) {
    return refreshPromise ?? Promise.resolve(false);
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${defaultBaseUrl}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // 刷新失败，清除所有 token
        await Promise.all([
          storage.clearAuthToken(),
          storage.clearRefreshToken(),
          storage.clearSession(),
          storage.clearUserProfile(),
        ]);
        // 通知 sessionStore 会话已过期
        const { useSessionStore } = await import('@/src/stores/sessionStore');
        useSessionStore.getState().markSessionExpired();
        return false;
      }

      const data = await response.json();
      if (data.token) {
        await storage.setAuthToken(data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const token = await storage.getAuthToken();
  console.log('API request:', method, defaultBaseUrl + path, 'token:', token ? token.substring(0, 20) + '...' : 'none');

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let requestBody: string | FormData | undefined;

  if (body instanceof FormData) {
    // 不设置 Content-Type，让浏览器自动生成 boundary
    requestBody = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${defaultBaseUrl}${path}`, {
    method,
    headers,
    body: requestBody,
  });

  console.log('API response:', response.status, response.statusText);

  // 如果是 401，尝试刷新 token
  if (response.status === 401) {
    const payload = await response.json().catch(() => null);

    // 如果是 INVALID_TOKEN（access token 过期），尝试刷新
    if (payload?.code === 'INVALID_TOKEN') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // 刷新成功后，重新请求
        const newToken = await storage.getAuthToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${defaultBaseUrl}${path}`, {
          method,
          headers,
          body: requestBody,
        });
        if (!retryResponse.ok) {
          const errorPayload = await retryResponse.json().catch(() => null);
          throw new ApiError(errorPayload?.message ?? `Request failed: ${retryResponse.status}`, retryResponse.status, errorPayload?.code);
        }
        return (await retryResponse.json()) as T;
      }
    }

    // 刷新失败或不是 token 问题，抛出错误
    throw new ApiError(payload?.message ?? 'Unauthorized', response.status, payload?.code);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(payload?.message ?? `Request failed: ${response.status}`, response.status, payload?.code);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, body: FormData) => request<T>('POST', path, body),
};