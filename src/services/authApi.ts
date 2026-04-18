import type { UserProfile } from '@/src/models/types';
import { apiClient } from '@/src/services/apiClient';

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserProfile;
  session?: { token: string; userId: string; createdAt: string };
}

export const authApi = {
  passwordLogin: (params: { regionCode: '+86' | '+852'; phone: string; password: string }) =>
    apiClient.post<AuthResponse>('/api/auth/login-password', params),
  registerPassword: (params: { regionCode: '+86' | '+852'; phone: string; password: string; nickname?: string; deviceName?: string }) =>
    apiClient.post<AuthResponse>('/api/auth/register-password', params),
  forgotPassword: (params: { regionCode: '+86' | '+852'; phone: string; newPassword: string }) =>
    apiClient.post<{ ok: true }>('/api/auth/forgot-password', params),
};
