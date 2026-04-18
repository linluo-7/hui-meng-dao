import { create } from 'zustand';

import type { Session, UserProfile } from '@/src/models/types';
import { dataGateway } from '@/src/services/dataGateway';
import { storage } from '@/src/services/storage';

type SessionState = {
  hydrated: boolean;
  onboardingSeen: boolean;
  token: string | null;
  refreshToken: string | null;
  session: Session | null;
  user: UserProfile | null;
  sessionExpired: boolean;

  hydrate: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
  loginPassword: (params: { regionCode: '+86' | '+852'; phone: string; password: string }) => Promise<void>;
  registerPassword: (params: { regionCode: '+86' | '+852'; phone: string; password: string; nickname?: string }) => Promise<void>;
  forgotPassword: (params: { regionCode: '+86' | '+852'; phone: string; newPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
  markSessionExpired: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  hydrated: false,
  onboardingSeen: false,
  token: null,
  refreshToken: null,
  session: null,
  user: null,
  sessionExpired: false,

  hydrate: async () => {
    const [onboardingSeen, token, refreshToken, session, user] = await Promise.all([
      storage.getOnboardingSeen(),
      storage.getAuthToken(),
      storage.getRefreshToken(),
      storage.getSession(),
      storage.getUserProfile(),
    ]);
    set({ hydrated: true, onboardingSeen, token, refreshToken, session, user });
  },

  markOnboardingSeen: async () => {
    await storage.setOnboardingSeen(true);
    set({ onboardingSeen: true });
  },

  loginPassword: async ({ regionCode, phone, password }) => {
    const payload = await dataGateway.auth.passwordLogin({ regionCode, phone, password });
    await Promise.all([
      storage.setAuthToken(payload.token),
      storage.setRefreshToken(payload.refreshToken),
      payload.session && storage.setSession(payload.session),
      storage.setUserProfile(payload.user),
    ]);
    set({ token: payload.token, refreshToken: payload.refreshToken, session: payload.session ?? null, user: payload.user });
  },

  registerPassword: async ({ regionCode, phone, password, nickname }) => {
    const payload = await dataGateway.auth.registerPassword({
      regionCode,
      phone,
      password,
      nickname,
      deviceName: 'Expo Go',
    });
    await Promise.all([
      storage.setAuthToken(payload.token),
      storage.setRefreshToken(payload.refreshToken),
      payload.session && storage.setSession(payload.session),
      storage.setUserProfile(payload.user),
    ]);
    set({ token: payload.token, refreshToken: payload.refreshToken, session: payload.session ?? null, user: payload.user });
  },

  forgotPassword: async ({ regionCode, phone, newPassword }) => {
    await dataGateway.auth.forgotPassword({ regionCode, phone, newPassword });
  },

  logout: async () => {
    await Promise.all([
      storage.clearAuthToken(),
      storage.clearRefreshToken(),
      storage.clearSession(),
      storage.clearUserProfile(),
    ]);
    set({ token: null, refreshToken: null, session: null, user: null, sessionExpired: false });
  },

  markSessionExpired: () => set({ sessionExpired: true }),
}));